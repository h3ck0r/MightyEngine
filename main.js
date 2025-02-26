import { mat4, vec3 } from "gl-matrix";
import { updateFPS } from "./ui.js";
import { updateCamera } from "./movement.js"
import { globals, loadShaders, setup, setupUI, createBindLayouts } from "./setup.js";
import { createPipeline } from "./pipeline.js";
import { loadObjects } from "./scene.js";
import { loadSkybox } from "./skybox.js";

export async function main() {
    const { device, context, canvas, canvasFormat } = await setup();
    const { mainShaderModule, skyboxShaderModule } = await loadShaders(device);

    const modelViewProjectionMatrix = mat4.create();
    const mvpBuffer = device.createBuffer({
        label: "Uniform Buffer",
        size: 4 * 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const globalLightDirectionBuffer = device.createBuffer({
        label: "Global Light Direction Buffer",
        size: 3 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(globalLightDirectionBuffer, 0, globals.lightDirection);

    const cameraPositionBuffer = device.createBuffer({
        label: "Camera Position Buffer",
        size: 3 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(cameraPositionBuffer, 0, globals.cameraPosition);

    setupUI(device, globalLightDirectionBuffer);

    const depthTexture = device.createTexture({
        size: [canvas.width, canvas.height, 1],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
    const depthView = depthTexture.createView();

    const { mainBindGroupLayout, skyboxBindGroupLayout } = createBindLayouts(device);

    const gameObjects = await loadObjects(device, mainBindGroupLayout, mvpBuffer, globalLightDirectionBuffer, cameraPositionBuffer);

    const { skyboxBuffer, skyboxIndexBuffer, skyboxBindGroup } = await loadSkybox(device, skyboxBindGroupLayout, mvpBuffer, cameraPositionBuffer);

    const { mainPipeline, skyboxPipeline } = createPipeline(device, canvasFormat, mainShaderModule, skyboxShaderModule, mainBindGroupLayout, skyboxBindGroupLayout);

    function render() {
        updateFPS();
        updateCamera(modelViewProjectionMatrix);
        device.queue.writeBuffer(mvpBuffer, 0, modelViewProjectionMatrix);
        device.queue.writeBuffer(cameraPositionBuffer, 0, globals.cameraPosition);

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
        // skybox
        pass.setPipeline(skyboxPipeline);
        pass.setBindGroup(0, skyboxBindGroup);
        pass.setVertexBuffer(0, skyboxBuffer);
        pass.setIndexBuffer(skyboxIndexBuffer, "uint16");
        pass.drawIndexed(36);

        // game objects
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
        pass.end();
        device.queue.submit([encoder.finish()]);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

main();