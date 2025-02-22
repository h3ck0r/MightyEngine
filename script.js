import { mat4 } from "https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/+esm";
import { loadTexture, loadShader, loadGLTFModel } from "./utils.js"
import { updateFPS } from "./right-menu.js";
import { setup, setupUI } from "./setup.js"
import { updateCamera } from "./movement.js"
import { globals } from "./setup.js";

function createBindGroup(device, uniformBuffer, lightDirectionBuffer, texture, sampler) {

    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
            { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
            { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
            { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } }
        ]
    });

    const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
            { binding: 0, resource: { buffer: uniformBuffer } },
            { binding: 1, resource: texture.createView() },
            { binding: 2, resource: sampler },
            { binding: 3, resource: { buffer: lightDirectionBuffer } },
        ]
    });

    return { bindGroup, bindGroupLayout };
}

async function main() {
    const { device, context, canvas, canvasFormat } = await setup();
    if (!device || !context || !canvas || !canvasFormat) throw new Error('Failed to setup');

    const modelViewProjectionMatrix = mat4.create();

    const uniformBuffer = device.createBuffer({
        label: "Uniform Buffer",
        size: 4 * 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const lightDirectionBuffer = device.createBuffer({
        label: "Light Direction Buffer",
        size: 3 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    setupUI(device, lightDirectionBuffer);

    const { vertices, indices } = await loadGLTFModel("./resources/chicken/model.glb");
    const { texture, sampler } = await loadTexture(device, "./resources/chicken/albedo.jpg");
    const { bindGroup, bindGroupLayout } = await createBindGroup(device, uniformBuffer, lightDirectionBuffer, texture, sampler);

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
    device.queue.writeBuffer(lightDirectionBuffer, 0, globals.lightDirection);

    const shaderModule = device.createShaderModule({
        label: 'Shader',
        code: await loadShader('shader.wgsl')
    });

    const pipeline = device.createRenderPipeline({
        label: "Pipeline",
        layout: device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        }),
        vertex: {
            module: shaderModule,
            entryPoint: "vertexMain",
            buffers: [
                {
                    arrayStride: 8 * 4,
                    attributes: [
                        { format: "float32x3", offset: 0, shaderLocation: 0 },  // position
                        { format: "float32x3", offset: 12, shaderLocation: 1 }, // normal
                        { format: "float32x2", offset: 24, shaderLocation: 2 }  // uv
                    ]
                }
            ]
        },
        fragment: {
            module: shaderModule,
            entryPoint: "fragmentMain",
            targets: [{
                format: canvasFormat
            }]
        },

        depthStencil: {
            format: "depth24plus",
            depthWriteEnabled: true,
            depthCompare: "less"
        }
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
        pass.setPipeline(pipeline);
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