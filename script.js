import { mat4 } from "https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/+esm";
import { loadTexture, loadShader, loadGLTFModel } from "./utils.js"
import { updateFPS } from "./right-menu.js";
import { setup, setupUI } from "./setup.js"
import { updateCamera } from "./movement.js"
import { globals } from "./setup.js";
import { createPipeline } from "./pipeline.js";
import { createBindGroup } from "./bind-group.js"

async function main() {
    const { device, context, canvas, canvasFormat } = await setup();

    const modelViewProjectionMatrix = mat4.create();

    const uniformBuffer = device.createBuffer({
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

    const { vertices, indices } = await loadGLTFModel("./resources/chicken/model.glb");
    const { texture, sampler } = await loadTexture(device, "./resources/chicken/albedo.jpg");
    const { bindGroup, bindGroupLayout } = await createBindGroup(device, uniformBuffer, globalLightDirectionBuffer, texture, sampler);

    const indexBuffer = device.createBuffer({
        label: "Index Buffer",
        size: indices.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });

    const vertexBuffer = device.createBuffer({
        label: "Vertex Buffer",
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(indexBuffer, 0, indices);
    device.queue.writeBuffer(vertexBuffer, 0, vertices);
    device.queue.writeBuffer(uniformBuffer, 0, modelViewProjectionMatrix);
    device.queue.writeBuffer(globalLightDirectionBuffer, 0, globals.lightDirection);

    const shaderModule = device.createShaderModule({
        label: 'Shader',
        code: await loadShader('shader.wgsl')
    });

    const depthTexture = device.createTexture({
        size: [canvas.width, canvas.height, 1],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
    const depthView = depthTexture.createView();

    function render() {
        updateFPS();
        updateCamera(modelViewProjectionMatrix);
        device.queue.writeBuffer(uniformBuffer, 0, modelViewProjectionMatrix);
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
        pass.setPipeline(createPipeline(device, canvasFormat, shaderModule, bindGroupLayout));
        pass.setBindGroup(0, bindGroup);
        pass.setVertexBuffer(0, vertexBuffer);
        pass.setIndexBuffer(indexBuffer, "uint32");
        pass.drawIndexed(indices.length);
        pass.end();
        device.queue.submit([encoder.finish()]);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}
main();