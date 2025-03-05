import { vec3, mat4 } from "gl-matrix";
import { updateFPS } from "./ui.js";
import { setup, loadShaders, setupBuffers, createPostProcessResources, createRenderTextureViews, createDepthTexture, setupUI } from "./setup.js";
import { loadObjects, loadPointLightObjects } from "./scene.js"
import { loadSkybox } from "./skybox.js"
import { createPipeline } from "./pipeline.js"
import { createBindLayouts } from "./bind-layouts.js";
import { updateCamera } from "./movement.js"
import { globals } from "./setup.js";
import { createRenderPass } from "./utils.js"

export class Engine {
    async init() {
        this.modelViewProjectionMatrix = mat4.create();
        const { device, context, canvas, canvasFormat } = await setup();
        this.device = device;
        this.context = context;
        this.canvasFormat = canvasFormat;
        this.canvas = canvas;

        this.renderTextureViews = createRenderTextureViews(this.device, this.canvas, this.canvasFormat);
        this.shaderModules = await loadShaders(this.device);
        this.buffers = await setupBuffers(this.device);
        this.bindLayouts = createBindLayouts(this.device);
        this.postProcessResources = createPostProcessResources(this.device, this.bindLayouts, this.renderTextureViews);

        this.pointLightObjects = await loadPointLightObjects(this.device, this.bindLayouts, this.buffers);
        this.gameObjects = await loadObjects(this.device, this.bindLayouts, this.buffers, this.pointLightObjects);
        this.skybox = await loadSkybox(this.device, this.bindLayouts, this.buffers);

        this.pipelines = createPipeline(this.device, canvasFormat, this.shaderModules, this.bindLayouts);
        this.depthView = await createDepthTexture(this.device, canvas);

        this.time = 0;
        setupUI(this.device, this.buffers);
    }
    run() {
        const renderLoop = () => {
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
    renderScene(encoder) {
        const scenePass = createRenderPass(encoder, this.renderTextureViews.sceneTextureView, this.depthView)
        this.renderSkybox(scenePass);
        this.renderObjects(scenePass);
        scenePass.end();
    }
    update() {
        this.time = performance.now() * 0.001;

        updateFPS();
        updateCamera(this.modelViewProjectionMatrix);
        this.updatePointLights();
        this.device.queue.writeBuffer(this.buffers.mvpBuffer, 0, this.modelViewProjectionMatrix);
        this.device.queue.writeBuffer(this.buffers.cameraPositionBuffer, 0, globals.cameraPosition);
    }
    updatePointLights() {
        let offset = 0;
        const radius = 5.0;

        for (let i = 0; i < this.pointLightObjects.pointLightObjects.length; i++) {
            const obj = this.pointLightObjects.pointLightObjects[i];

            const angle = this.time * 0.5 + (i * (Math.PI * 2 / this.pointLightObjects.pointLightObjects.length));
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            obj.position = vec3.fromValues(x, obj.position[1], z);
            obj.updateTransform();
            this.device.queue.writeBuffer(this.pointLightObjects.pointLightPositionsBuffer, offset * 16, obj.position);
            this.device.queue.writeBuffer(this.pointLightObjects.pointLightColorsBuffer, offset * 16, obj.defaultColor);
            offset += 1;
        }
    }
    renderPointLights(encoder) {
        const pointLightPass = createRenderPass(encoder, this.renderTextureViews.sceneTextureView, this.depthView, false, false);
        pointLightPass.setPipeline(this.pipelines.pointLightPipeline);
        for (const model of this.pointLightObjects.pointLightObjects) {
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
        pass.setBindGroup(0, this.skybox.skyboxBindGroup);
        pass.setVertexBuffer(0, this.skybox.skyboxBuffer);
        pass.setIndexBuffer(this.skybox.skyboxIndexBuffer, "uint16");
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

        const blurPass = createRenderPass(encoder, this.renderTextureViews.blurTextureView);
        blurPass.setPipeline(this.pipelines.blurPipeline);
        blurPass.setBindGroup(0, this.postProcessResources.blurBindGroup);
        blurPass.draw(6);
        blurPass.end();
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
        for (let i = 0; i < this.gameObjects.length; i++) {
            const obj = this.gameObjects[i];
            // if (!obj.velocity) {
            //     obj.velocity = vec3.fromValues(
            //         (Math.random() - 0.5) * 0.01,
            //         (Math.random() - 0.5) * 0.01,
            //         (Math.random() - 0.5) * 0.01
            //     );
            // }

            // if (!obj.rotationVelocity) {
            //     obj.rotationVelocity = vec3.fromValues(
            //         (Math.random() - 0.5) * 0.01,
            //         (Math.random() - 0.5) * 0.01,
            //         (Math.random() - 0.5) * 0.01,
            //     );
            // }

            // vec3.add(obj.rotation, obj.rotation, obj.rotationVelocity);
            // vec3.add(obj.position, obj.position, obj.velocity);

            obj.updateTransform();

            pass.setVertexBuffer(0, obj.vertexBuffer);
            pass.setIndexBuffer(obj.indexBuffer, "uint32");

            this.device.queue.writeBuffer(obj.modelMatrixBuffer, 0, obj.modelMatrix);

            pass.setBindGroup(0, obj.bindGroup);
            pass.drawIndexed(obj.indices.length);
        }
    }
}