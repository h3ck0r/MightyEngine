async function setupCanvas() {
    const canvas = document.querySelector('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const context = canvas.getContext('webgpu');
    return { canvas, context };
}

async function setup() {
    const { canvas, context } = await setupCanvas();

    if (!navigator.gpu) {
        console.error('WebGPU not supported');
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        console.error('No adapter found');
    }

    const device = await adapter.requestDevice();

    device.addEventListener('uncapturederror', event => console.error(event.error.message));
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
        device: device,
        format: canvasFormat
    });
    return { device, context, canvas, canvasFormat };
}
async function loadShader(url) {
    const response = await fetch(url);
    return await response.text();
}
async function main() {
    const { device, context, canvas, canvasFormat } = await setup();
    if (!device || !context || !canvas || !canvasFormat) throw new Error('Failed to setup');

    const vertices = new Float32Array([
        -0.5, -0.5, 0,
        1.0, 0.0, 0.0,

        0.0, 0.5, 0,
        0.0, 1.0, 0.0,

        0.5, -0.5, 0,
        0.0, 0.0, 1.0 
    ]);
    const vertexBuffer = device.createBuffer({
        label: "Vertex Buffer",
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(vertexBuffer, /*bufferOffset=*/ 0, vertices);

    const shaderCode = await loadShader('shader.wgsl');
    const shaderModule = device.createShaderModule({
        label: 'Shader',
        code: shaderCode
    });

    const pipeline = device.createRenderPipeline({
        label: "Pipeline",
        layout: "auto",
        vertex: {
            module: shaderModule,
            entryPoint: "vertexMain",
            buffers: [
                {
                    arrayStride: 24,
                    attributes: [{
                        format: "float32x3",
                        offset: 0,
                        shaderLocation: 0,
                    },
                    {
                        format: "float32x3",  
                        offset: 12,  
                        shaderLocation: 1,
                    }
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
        }
    });

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
        colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            loadOp: "clear",
            clearValue: { r: 0.15, g: 0.15, b: 0.2, a: 1 },
            storeOp: 'store'
        }]
    });

    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.draw(3);

    pass.end();
    device.queue.submit([encoder.finish()]);

}
main();