import { mat4, vec3 } from "gl-matrix";
import { loadShader } from "./utils.js"
import { updateFPS } from "./ui.js";
import { setup, setupUI } from "./setup.js"
import { updateCamera } from "./movement.js"
import { globals } from "./setup.js";
import { createPipeline } from "./pipeline.js";
import { GameObject } from "./game-object.js";

const gameObjects = [];

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

    setupUI(device, globalLightDirectionBuffer);

    device.queue.writeBuffer(globalLightDirectionBuffer, 0, globals.lightDirection);

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
            { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
            { binding: 3, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
            { binding: 4, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } }
        ]
    });

    const instance_count = 1000;
    const url = "resources/chicken";
    const chickenObj = new GameObject();
    await Promise.all([
        chickenObj.addModel(url + "/model.glb", device),
        chickenObj.addTexture(url + "/albedo.jpg", device)
    ]);
    for (let i = 0; i < instance_count; i++) {
        const obj = new GameObject();
        let val = Math.random();
        let range = 100;

        
        obj.position = vec3.fromValues(Math.random() * range - range / 2, Math.random() * range - range / 2, Math.random() * range - range / 2);
        obj.rotation = vec3.fromValues(Math.random() * range - range / 2, Math.random() * range - range / 2, Math.random() * range - range / 2);
        obj.scale = vec3.fromValues(val, val, val)
        obj.updateTransform();

        obj.vertexBuffer = chickenObj.vertexBuffer;
        obj.indexBuffer = chickenObj.indexBuffer;
        obj.indices = chickenObj.indices;
        obj.modelUniformBuffer = device.createBuffer({
            label: "Model Matrix Buffer",
            size: 4 * 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        obj.bindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: mvpBuffer } },
                { binding: 1, resource: { buffer: obj.modelUniformBuffer } },
                { binding: 2, resource: chickenObj.texture.createView() },
                { binding: 3, resource: chickenObj.sampler },
                { binding: 4, resource: { buffer: globalLightDirectionBuffer } },
            ]
        });

        gameObjects.push(obj);
    }
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