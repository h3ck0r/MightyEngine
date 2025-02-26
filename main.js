import { mat4, vec3 } from "gl-matrix";
import { updateFPS } from "./src/ui.js";
import { updateCamera } from "./src/movement.js"
import { globals, loadShaders, setup, setupUI, createBindLayouts, setupBuffers, createDepthTexture, createPostProcessResources } from "./src/setup.js";
import { createPipeline } from "./src/pipeline.js";
import { loadObjects } from "./src/scene.js";
import { loadSkybox } from "./src/skybox.js";

export async function main() {
    // setup
    const modelViewProjectionMatrix = mat4.create();
    const { device, context, canvas, canvasFormat, sceneTextureView } = await setup();
    const shaderModules = await loadShaders(device);
    const buffers = await setupBuffers(device);
    const bindLayouts = createBindLayouts(device);
    const postProcessResources = createPostProcessResources(device, bindLayouts, sceneTextureView);
    const gameObjects = await loadObjects(device, bindLayouts, buffers);
    const skybox = await loadSkybox(device, bindLayouts, buffers);
    const pipelines = createPipeline(device, canvasFormat, shaderModules, bindLayouts);
    const depthView = await createDepthTexture(device, canvas);
    setupUI(device, buffers);

    function update() {
        updateFPS();
        updateCamera(modelViewProjectionMatrix);
        device.queue.writeBuffer(buffers.mvpBuffer, 0, modelViewProjectionMatrix);
        device.queue.writeBuffer(buffers.cameraPositionBuffer, 0, globals.cameraPosition);
    }

    function renderSkybox(pass) {
        pass.setPipeline(pipelines.skyboxPipeline);
        pass.setBindGroup(0, skybox.skyboxBindGroup);
        pass.setVertexBuffer(0, skybox.skyboxBuffer);
        pass.setIndexBuffer(skybox.skyboxIndexBuffer, "uint16");
        pass.drawIndexed(36);
    }

    function postProcess(postProcessPass) {
        postProcessPass.setPipeline(pipelines.postProcessPipeline);
        postProcessPass.setBindGroup(0, postProcessResources.postProcessBindGroup);
        postProcessPass.draw(6);
        postProcessPass.end();
    }

    function renderObjects(pass) {
        pass.setPipeline(pipelines.mainPipeline);
        for (let i = 0; i < gameObjects.length; i++) {
            const obj = gameObjects[i];
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

            device.queue.writeBuffer(obj.modelUniformBuffer, 0, obj.modelMatrix);

            pass.setBindGroup(0, obj.bindGroup);
            pass.drawIndexed(obj.indices.length);
        }
    }

    function render() {
        const encoder = device.createCommandEncoder();

        const scenePass = encoder.beginRenderPass({
            colorAttachments: [{
                view: sceneTextureView,
                loadOp: "clear",
                clearValue: { r: 0.15, g: 0.15, b: 0.2, a: 1 },
                storeOp: "store"
            }],
            depthStencilAttachment: {
                view: depthView,
                depthLoadOp: "clear",
                depthClearValue: 1.0,
                depthStoreOp: "store"
            }
        });

        update();
        renderSkybox(scenePass);
        renderObjects(scenePass);
        scenePass.end();

        const postProcessPass = encoder.beginRenderPass({
            colorAttachments: [{
                view: context.getCurrentTexture().createView(),
                loadOp: "clear",
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
                storeOp: "store"
            }]
        });
        postProcess(postProcessPass);
        device.queue.submit([encoder.finish()]);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

main();