import { mat4, vec3 } from "gl-matrix";
import { loadShader } from "./utils.js"
import { updateFPS } from "./right-menu.js";
import { setup, setupUI } from "./setup.js"
import { updateCamera } from "./movement.js"
import { globals } from "./setup.js";
import { createPipeline } from "./pipeline.js";
import { GameObject } from "./game-object.js";

const gameObjects = [];

async function main() {
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

    const modelUrls = ["./resources/chicken"];
    for (const url of modelUrls) {
        const obj = new GameObject(device);
        await Promise.all([
            obj.addModel(url + "/model.glb"),
            obj.addTexture(url + "/albedo.jpg")
        ]);

        obj.position = vec3.fromValues(Math.random() * 20, Math.random() * 5, Math.random());
        obj.rotation = vec3.fromValues(Math.random(), Math.random(), Math.random());
        obj.updateTransform();

        obj.indexBuffer = device.createBuffer({
            label: "Index Buffer",
            size: obj.indices.length * 4,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
        });
        device.queue.writeBuffer(obj.indexBuffer, 0, obj.indices);

        obj.vertexBuffer = device.createBuffer({
            label: "Vertex Buffer",
            size: obj.vertices.length * 4,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        device.queue.writeBuffer(obj.vertexBuffer, 0, obj.vertices);

        obj.modelUniformBuffer = device.createBuffer({
            label: "Model Matrix Buffer",
            size: 4 * 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(obj.modelUniformBuffer, 0, obj.modelMatrix);
        obj.bindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: mvpBuffer } },
                { binding: 1, resource: { buffer: obj.modelUniformBuffer } },
                { binding: 2, resource: obj.texture.createView() },
                { binding: 3, resource: obj.sampler },
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

        for (const obj of gameObjects) {
            pass.setVertexBuffer(0, obj.vertexBuffer);
            pass.setIndexBuffer(obj.indexBuffer, "uint32");
            device.queue.writeBuffer(obj.modelUniformBuffer, 0, obj.modelMatrix.buffer);
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