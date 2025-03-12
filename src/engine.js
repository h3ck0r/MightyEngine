import { vec3, mat4 } from "gl-matrix";
import { updateUI } from "./ui.js";
import { setup, loadShaders, setupBuffers, createPostProcessResources, createRenderTextureViews, createDepthTexture } from "./setup.js";
import { Scene } from "./scene.js"
import { setupUI } from "./ui.js"
import { createPipeline } from "./pipeline.js"
import { createBindLayouts } from "./bind-layouts.js";
import { updateCamera } from "./movement.js"
import { globals } from "./setup.js";
import { createRenderPass } from "./utils.js"
import { WebClient } from "./web-client.js"
import { GameObject } from "./game-object.js";

export class Engine {
    async init() {
        this.modelViewProjectionMatrix = mat4.create();
        const { device, context, canvas, canvasFormat } = await setup();
        this.device = device;
        this.context = context;
        this.canvasFormat = canvasFormat;
        this.canvas = canvas;
        this.graphicsSettings = new Uint32Array([0, 0, 0, 0]);

        this.renderTextureViews = createRenderTextureViews(this.device, this.canvas, this.canvasFormat);
        this.shaderModules = await loadShaders(this.device);
        this.buffers = await setupBuffers(this.device);
        this.bindLayouts = createBindLayouts(this.device);
        this.postProcessResources = createPostProcessResources(this.device, this.bindLayouts, this.renderTextureViews, this.buffers);

        this.scenesCache = {};
        this.currentSceneName = null;

        await this.loadScene("scenes/gryffindor.json");
        this.webClient = new WebClient('ws://localhost:8080', this.scene);

        this.pipelines = createPipeline(this.device, canvasFormat, this.shaderModules, this.bindLayouts);
        this.depthView = await createDepthTexture(this.device, canvas);

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
            this.renderPointLights(encoder);
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
            await playerModel.addModel("resources/chicken/model.glb");
            this.scene.playerModel = playerModel;
            this.scenesCache[sceneName] = this.scene;
        }

        this.currentSceneName = sceneName;
        this.running = true;
    }
    unloadScene() {
        if (!this.scene) return;

        this.scene.gameObjects.forEach(obj => {
            obj.vertexBuffer?.destroy();
            obj.indexBuffer?.destroy();
            obj.modelMatrixBuffer?.destroy();
        });

        this.scene.pointLightObjects.forEach(light => {
            light.modelMatrixBuffer?.destroy();
        });

        this.scene.skyboxBuffer?.destroy();
        this.scene.skyboxIndexBuffer?.destroy();
        this.scene.pointLightPositionsBuffer?.destroy();
        this.scene.pointLightColorsBuffer?.destroy();

        this.scene = null;
    }
    renderScene(encoder) {
        const scenePass = createRenderPass(encoder, this.renderTextureViews.sceneTextureView, this.depthView)
        this.renderSkybox(scenePass);
        this.renderObjects(scenePass);
        scenePass.end();
    }
    update() {
        this.time = performance.now() * 0.001;

        updateUI();
        updateCamera(this.modelViewProjectionMatrix, this.webClient);

        this.updatePointLights();
        this.device.queue.writeBuffer(this.buffers.mvpBuffer, 0, this.modelViewProjectionMatrix);
        this.device.queue.writeBuffer(this.buffers.cameraPositionBuffer, 0, globals.cameraPosition);
    }
    updatePointLights() {
        let offset = 0;
        const radius = 5.0;
        const localScene = this.scene;

        for (let i = 0; i < localScene.pointLightObjects.length; i++) {
            const obj = localScene.pointLightObjects[i];

            const angle = this.time * 0.5 + (i * (Math.PI * 2 / localScene.pointLightObjects.length));
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            obj.position = vec3.fromValues(x, obj.position[1], z);
            obj.updateTransform();
            this.device.queue.writeBuffer(localScene.pointLightPositionsBuffer, offset * 16, obj.position);
            this.device.queue.writeBuffer(localScene.pointLightColorsBuffer, offset * 16, obj.defaultColor);
            offset += 1;
        }
    }
    renderPointLights(encoder) {
        const localScene = this.scene;
        const pointLightPass = createRenderPass(encoder, this.renderTextureViews.sceneTextureView, this.depthView, false, false);
        pointLightPass.setPipeline(this.pipelines.pointLightPipeline);
        for (const model of localScene.pointLightObjects) {
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

        const bloomPass = createRenderPass(encoder, this.renderTextureViews.bloomTextureView);
        bloomPass.setPipeline(this.pipelines.bloomPipeline);
        bloomPass.setBindGroup(0, this.postProcessResources.bloomBindGroup);
        bloomPass.draw(6);
        bloomPass.end();

        const blurHPass = createRenderPass(encoder, this.renderTextureViews.blurHTextureView);
        blurHPass.setPipeline(this.pipelines.blurHPipeline);
        blurHPass.setBindGroup(0, this.postProcessResources.blurHBindGroup);
        blurHPass.draw(6);
        blurHPass.end();

        const blurVPass = createRenderPass(encoder, this.renderTextureViews.blurVTextureView);
        blurVPass.setPipeline(this.pipelines.blurVPipeline);
        blurVPass.setBindGroup(0, this.postProcessResources.blurVBindGroup);
        blurVPass.draw(6);
        blurVPass.end();
    }

    combinePostProcess(encoder) {
        const postProcessPass = createRenderPass(encoder, this.context.getCurrentTexture().createView());
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
            if (!obj.isTransparent) {
                obj.updateTransform();

                pass.setVertexBuffer(0, obj.vertexBuffer);
                pass.setIndexBuffer(obj.indexBuffer, "uint32");

                this.device.queue.writeBuffer(obj.modelMatrixBuffer, 0, obj.modelMatrix);

                pass.setBindGroup(0, obj.bindGroup);
                pass.drawIndexed(obj.indices.length);
            }
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
        for (let i = 0; i < localScene.gameObjects.length; i++) {
            const obj = localScene.gameObjects[i];
            if (obj.isTransparent) {
                obj.updateTransform();
                pass.setVertexBuffer(0, obj.vertexBuffer);
                pass.setIndexBuffer(obj.indexBuffer, "uint32");
                this.device.queue.writeBuffer(obj.modelMatrixBuffer, 0, obj.modelMatrix);
                pass.setBindGroup(0, obj.bindGroup);
                pass.drawIndexed(obj.indices.length);
            }
        }
    }
}
