import { vec3, mat4 } from "gl-matrix";
import { updateFPS } from "./ui.js";
import { setup, loadShaders, setupBuffers, createPostProcessResources, createDepthTexture, setupUI } from "./setup.js";
import { loadObjects } from "./scene.js"
import { loadSkybox } from "./skybox.js"
import { createPipeline } from "./pipeline.js"
import { createBindLayouts } from "./bind-layouts.js";
import { updateCamera } from "./movement.js"
import { globals } from "./setup.js";
import { createRenderPass } from "./utils.js"

export class Engine {
    async init() {
        this.modelViewProjectionMatrix = mat4.create();
        const { device, context, canvas, canvasFormat, sceneTextureView } = await setup();
        this.device = device;
        this.context = context;
        this.sceneTextureView = sceneTextureView;

        this.shaderModules = await loadShaders(device);
        this.buffers = await setupBuffers(device);
        this.bindLayouts = createBindLayouts(device);
        this.postProcessResources = createPostProcessResources(device, this.bindLayouts, sceneTextureView);

        this.gameObjects = await loadObjects(device, this.bindLayouts, this.buffers);
        this.skybox = await loadSkybox(device, this.bindLayouts, this.buffers);
        this.pipelines = createPipeline(device, canvasFormat, this.shaderModules, this.bindLayouts);
        this.depthView = await createDepthTexture(device, canvas);
        setupUI(device, this.buffers);
    }
    run() {
        const renderLoop = () => {
            this.update(this.device, this.buffers, this.modelViewProjectionMatrix);
            const encoder = this.device.createCommandEncoder();
            const scenePass = createRenderPass(encoder, this.sceneTextureView, this.depthView)
            this.renderSkybox(scenePass);
            this.renderObjects(scenePass);
            scenePass.end();

            this.postProcess(encoder);
            this.device.queue.submit([encoder.finish()]);

            requestAnimationFrame(renderLoop);
        };
        requestAnimationFrame(renderLoop);
    }
    update() {
        updateFPS();
        updateCamera(this.modelViewProjectionMatrix);
        this.device.queue.writeBuffer(this.buffers.mvpBuffer, 0, this.modelViewProjectionMatrix);
        this.device.queue.writeBuffer(this.buffers.cameraPositionBuffer, 0, globals.cameraPosition);
    }
    renderSkybox(pass) {
        pass.setPipeline(this.pipelines.skyboxPipeline);
        pass.setBindGroup(0, this.skybox.skyboxBindGroup);
        pass.setVertexBuffer(0, this.skybox.skyboxBuffer);
        pass.setIndexBuffer(this.skybox.skyboxIndexBuffer, "uint16");
        pass.drawIndexed(36);
    }
    postProcess(encoder) {
        const postProcessPass = createRenderPass(encoder, this.context.getCurrentTexture().createView())
        postProcessPass.setPipeline(this.pipelines.postProcessPipeline);
        postProcessPass.setBindGroup(0, this.postProcessResources.postProcessBindGroup);
        postProcessPass.draw(6);
        postProcessPass.end();
    }
    renderObjects(pass) {
        pass.setPipeline(this.pipelines.mainPipeline);
        for (let i = 0; i < this.gameObjects.length; i++) {
            const obj = this.gameObjects[i];
            if (!obj.velocity) {
                obj.velocity = vec3.fromValues(
                    (Math.random() - 0.5) * 0.01,
                    (Math.random() - 0.5) * 0.01,
                    (Math.random() - 0.5) * 0.01
                );
            }

            if (!obj.rotationVelocity) {
                obj.rotationVelocity = vec3.fromValues(
                    (Math.random() - 0.5) * 0.002,
                    (Math.random() - 0.5) * 0.002,
                    (Math.random() - 0.5) * 0.002
                );
            }

            // vec3.add(obj.rotation, obj.rotation, obj.rotationVelocity);
            // vec3.add(obj.position, obj.position, obj.velocity);

            obj.updateTransform();

            pass.setVertexBuffer(0, obj.vertexBuffer);
            pass.setIndexBuffer(obj.indexBuffer, "uint32");

            this.device.queue.writeBuffer(obj.modelUniformBuffer, 0, obj.modelMatrix);

            pass.setBindGroup(0, obj.bindGroup);
            pass.drawIndexed(obj.indices.length);
        }
    }
}