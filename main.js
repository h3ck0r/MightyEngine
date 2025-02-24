import { mat4, vec3 } from "gl-matrix";
import { loadShader } from "./utils.js"
import { updateFPS } from "./ui.js";
import { setup, setupUI } from "./setup.js"
import { updateCamera } from "./movement.js"
import { globals } from "./setup.js";
import { createPipeline } from "./pipeline.js";
import { loadObjects } from "./scene.js";


export async function main() {
    const { device, context, canvas, canvasFormat } = await setup();
    const shaderCode = await loadShader('shader.wgsl');
    const shaderModule = device.createShaderModule({ label: 'Shader', code: shaderCode });

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

    setupUI(device, globalLightDirectionBuffer);


    const depthTexture = device.createTexture({
        size: [canvas.width, canvas.height, 1],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
    const depthView = depthTexture.createView();

    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
            { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
            { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
            { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
            { binding: 4, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
            { binding: 5, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
            { binding: 6, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
            { binding: 7, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
            { binding: 8, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
        ]
    });

    const gameObjects = await loadObjects(device, bindGroupLayout, mvpBuffer, globalLightDirectionBuffer);

    const pipeline = createPipeline(device, canvasFormat, shaderModule, bindGroupLayout);

    function render() {
        updateFPS();
        updateCamera(modelViewProjectionMatrix);
        device.queue.writeBuffer(mvpBuffer, 0, modelViewProjectionMatrix);

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
        pass.setPipeline(pipeline);

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