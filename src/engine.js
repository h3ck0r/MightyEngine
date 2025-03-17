import { vec3, mat4 } from "gl-matrix";
import { updateUI, setupUI } from "./ui.js";
import { setup } from "./setup.js";
import { Scene } from "./scene.js"
import { createPostProcessResources } from "./utils.js";
import { createPipeline } from "./pipeline.js"
import { createBindLayouts } from "./bind-layouts.js";
import { updateCamera } from "./movement.js"
import { globals } from "./globals.js";
import { WebClient } from "./web-client.js"
import { GameObject } from "./game-object.js";
import { creatRenderPasses } from "./renderpass.js"
import { createRenderTextureViews } from "./render-texture.js"
import { setupBuffers } from "./buffers.js"
import { loadShaders } from "./shader-loader.js";

export class Engine {
    async init() {
        this.modelViewProjectionMatrix = mat4.create();
        const { device, context, canvas, canvasFormat } = await setup();
        this.device = device;
        this.context = context;
        this.canvasFormat = canvasFormat;
        this.canvas = canvas;
        this.graphicsSettings = new Uint32Array([0, 0, 0, 0]);

        this.renderTextureViews = createRenderTextureViews(this.device, this.canvas, this.canvasFormat, this.context);
        this.shaderModules = await loadShaders(this.device);
        this.buffers = setupBuffers(this.device);
        this.bindLayouts = createBindLayouts(this.device);
        this.postProcessResources = createPostProcessResources(this.device, this.bindLayouts, this.renderTextureViews, this.buffers);
        this.renderPasses = creatRenderPasses(this.renderTextureViews);

        this.scenesCache = {};
        this.currentSceneName = null;

        await this.loadScene("./scenes/gryffindor.json");
        this.webClient = new WebClient('ws://3.86.154.96:6868', this.scene);

        this.pipelines = createPipeline(this.device, canvasFormat, this.shaderModules, this.bindLayouts);

        this.time = 0;
        setupUI(this.device, this.buffers);
    }
    run() {
        const renderLoop = () => {
            if (!this.running) {
                requestAnimationFrame(renderLoop);
                return;
            }

            this.update(this.device, this.buffers, this.modelViewProjectionMatrix);

            const encoder = this.device.createCommandEncoder();

            this.renderScene(encoder);

            if (globals.graphicsSettings.enableLightSpheres) {
                this.renderPointLights(encoder);
            }
            this.postProcess(encoder);
            this.device.queue.submit([encoder.finish()]);

            requestAnimationFrame(renderLoop);
        };
        requestAnimationFrame(renderLoop);
    }
    async loadScene(sceneName) {
        if (this.currentSceneName === sceneName) {
            return;
        }

        this.running = false;

        if (this.scenesCache[sceneName]) {
            this.scene = this.scenesCache[sceneName];
        } else {

            const playerModel = new GameObject(this.device);
            this.scene = new Scene(this.device, this.bindLayouts, this.buffers);
            await this.scene.loadScene(sceneName);
            await playerModel.addModel("./resources/chicken/model.glb");
            this.scene.playerModel = playerModel;
            this.scenesCache[sceneName] = this.scene;
        }

        this.currentSceneName = sceneName;
        this.running = true;
    }

    update() {
        this.time = performance.now() * 0.001;

        updateUI();
        updateCamera(this.modelViewProjectionMatrix, this.webClient);

        this.updatePointLights();
        this.device.queue.writeBuffer(this.buffers.mvpBuffer, 0, this.modelViewProjectionMatrix);
        this.device.queue.writeBuffer(this.buffers.cameraPositionBuffer, 0, globals.camera.cameraPosition);
    }
    updatePointLights() {
        let radius = 10;
        const pointLightCount = this.scene.pointLightObjects.length;
        if (pointLightCount === 0) return;

        const angleStep = (Math.PI * 2) / pointLightCount;
        const positionBuffer = new Float32Array(pointLightCount * 4);
        const colorBuffer = new Float32Array(pointLightCount * 4);

        for (let i = 0; i < pointLightCount; i++) {
            const obj = this.scene.pointLightObjects[i];

            if (obj.moveable) {
                const angle = this.time * 0.5 + i * angleStep;
                obj.position[0] = Math.cos(angle) * radius;
                obj.position[2] = Math.sin(angle) * radius;
                obj.updateTransform();
            }

            const offset = i * 4;
            positionBuffer[offset] = obj.position[0];
            positionBuffer[offset + 1] = obj.position[1];
            positionBuffer[offset + 2] = obj.position[2];

            colorBuffer[offset] = obj.defaultColor[0];
            colorBuffer[offset + 1] = obj.defaultColor[1];
            colorBuffer[offset + 2] = obj.defaultColor[2];
            colorBuffer[offset + 3] = obj.defaultColor[3];
        }
        this.device.queue.writeBuffer(this.scene.pointLightPositionsBuffer, 0, positionBuffer);
        this.device.queue.writeBuffer(this.scene.pointLightColorsBuffer, 0, colorBuffer);
    }
    renderScene(encoder) {
        const scenePass = encoder.beginRenderPass(this.renderPasses.scenePass);
        this.renderSkybox(scenePass);
        this.renderObjects(scenePass);
        scenePass.end();
    }
    renderPointLights(encoder) {
        const pointLightPass = encoder.beginRenderPass(this.renderPasses.pointLightPass)
        pointLightPass.setPipeline(this.pipelines.pointLightPipeline);
        for (const model of this.scene.pointLightObjects) {
            model.updateTransform();
            this.device.queue.writeBuffer(model.modelMatrixBuffer, 0, model.modelMatrix);
            pointLightPass.setVertexBuffer(0, model.vertexBuffer);
            pointLightPass.setIndexBuffer(model.indexBuffer, "uint32");
            pointLightPass.setBindGroup(0, model.bindGroup);
            pointLightPass.drawIndexed(model.indices.length);
        }
        pointLightPass.end();
    }

    renderSkybox(pass) {
        pass.setPipeline(this.pipelines.skyboxPipeline);
        pass.setBindGroup(0, this.scene.skyboxBindGroup);
        pass.setVertexBuffer(0, this.scene.skyboxBuffer);
        pass.setIndexBuffer(this.scene.skyboxIndexBuffer, "uint16");
        pass.drawIndexed(36);
    }

    postProcess(encoder) {
        this.renderBloom(encoder);
        this.combinePostProcess(encoder);
    }

    renderBloom(encoder) {

        const bloomPass = encoder.beginRenderPass(this.renderPasses.bloomPass);
        bloomPass.setPipeline(this.pipelines.bloomPipeline);
        bloomPass.setBindGroup(0, this.postProcessResources.bloomBindGroup);
        bloomPass.draw(6);
        bloomPass.end();

        const blurHPass = encoder.beginRenderPass(this.renderPasses.blurHPass);
        blurHPass.setPipeline(this.pipelines.blurHPipeline);
        blurHPass.setBindGroup(0, this.postProcessResources.blurHBindGroup);
        blurHPass.draw(6);
        blurHPass.end();

        const blurVPass = encoder.beginRenderPass(this.renderPasses.blurVPass);
        blurVPass.setPipeline(this.pipelines.blurVPipeline);
        blurVPass.setBindGroup(0, this.postProcessResources.blurVBindGroup);
        blurVPass.draw(6);
        blurVPass.end();
    }

    combinePostProcess(encoder) {
        this.renderPasses.postProcessPass.colorAttachments[0].view = this.context.getCurrentTexture().createView();
        const postProcessPass = encoder.beginRenderPass(this.renderPasses.postProcessPass);
        postProcessPass.setPipeline(this.pipelines.postProcessPipeline);
        postProcessPass.setBindGroup(0, this.postProcessResources.postProcessBindGroup);
        postProcessPass.draw(6);
        postProcessPass.end();
    }
    renderObjects(pass) {
        pass.setPipeline(this.pipelines.mainPipeline);
        const localScene = this.scene;

        for (let i = 0; i < localScene.gameObjects.length; i++) {
            const obj = localScene.gameObjects[i];
            obj.updateTransform();

            pass.setVertexBuffer(0, obj.vertexBuffer);
            pass.setIndexBuffer(obj.indexBuffer, "uint32");

            this.device.queue.writeBuffer(obj.modelMatrixBuffer, 0, obj.modelMatrix);

            pass.setBindGroup(0, obj.bindGroup);
            pass.drawIndexed(obj.indices.length);
        }
        for (const [id, obj] of Object.entries(localScene.players)) {
            obj.updateTransform();


            pass.setVertexBuffer(0, obj.vertexBuffer);
            pass.setIndexBuffer(obj.indexBuffer, "uint32");

            this.device.queue.writeBuffer(obj.modelMatrixBuffer, 0, obj.modelMatrix);

            pass.setBindGroup(0, obj.bindGroup);
            pass.drawIndexed(obj.indices.length);
        }

        pass.setPipeline(this.pipelines.transparentPipeline);
        for (let i = 0; i < localScene.transparentObjects.length; i++) {
            const obj = localScene.transparentObjects[i];
            obj.updateTransform();
            pass.setVertexBuffer(0, obj.vertexBuffer);
            pass.setIndexBuffer(obj.indexBuffer, "uint32");
            this.device.queue.writeBuffer(obj.modelMatrixBuffer, 0, obj.modelMatrix);
            pass.setBindGroup(0, obj.bindGroup);
            pass.drawIndexed(obj.indices.length);
        }
    }
}
