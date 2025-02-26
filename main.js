import { vec3 } from "gl-matrix";
import { updateFPS } from "./src/ui.js";
import { updateCamera } from "./src/movement.js"
import { globals, loadShaders, setup, setupUI, createBindLayouts, setupBuffers, createDepthTexture } from "./src/setup.js";
import { createPipeline } from "./src/pipeline.js";
import { loadObjects } from "./src/scene.js";
import { loadSkybox } from "./src/skybox.js";

export async function main() {
    // setup
    const { device, context, canvas, canvasFormat } = await setup();
    const { mainShaderModule, skyboxShaderModule } = await loadShaders(device);
    const { modelViewProjectionMatrix, mvpBuffer, globalLightDirectionBuffer, cameraPositionBuffer } = await setupBuffers(device);
    const { mainBindGroupLayout, skyboxBindGroupLayout } = createBindLayouts(device);
    const gameObjects = await loadObjects(device, mainBindGroupLayout, mvpBuffer, globalLightDirectionBuffer, cameraPositionBuffer);
    const { skyboxBuffer, skyboxIndexBuffer, skyboxBindGroup } = await loadSkybox(device, skyboxBindGroupLayout, mvpBuffer, cameraPositionBuffer);
    const { mainPipeline, skyboxPipeline } = createPipeline(device, canvasFormat, mainShaderModule, skyboxShaderModule, mainBindGroupLayout, skyboxBindGroupLayout);
    const depthView = await createDepthTexture(device, canvas);
    setupUI(device, globalLightDirectionBuffer);

    function update() {
        updateFPS();
        updateCamera(modelViewProjectionMatrix);
        device.queue.writeBuffer(mvpBuffer, 0, modelViewProjectionMatrix);
        device.queue.writeBuffer(cameraPositionBuffer, 0, globals.cameraPosition);
    }

    function renderSkybox(pass) {
        pass.setPipeline(skyboxPipeline);
        pass.setBindGroup(0, skyboxBindGroup);
        pass.setVertexBuffer(0, skyboxBuffer);
        pass.setIndexBuffer(skyboxIndexBuffer, "uint16");
        pass.drawIndexed(36);
    }

    function renderObjects(pass) {
        pass.setPipeline(mainPipeline);
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

            vec3.add(obj.rotation, obj.rotation, obj.rotationVelocity);
            vec3.add(obj.position, obj.position, obj.velocity);

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
        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: context.getCurrentTexture().createView(),
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
        renderSkybox(pass);
        renderObjects(pass);

        pass.end();
        device.queue.submit([encoder.finish()]);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

main();