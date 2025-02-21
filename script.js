import { mat4 } from "https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/+esm";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const fpsCounter = document.getElementById("fpsCounter");
let lastFrameTime = performance.now();
let frameCount = 0;
let fps = 0;

function updateFPS() {
    const now = performance.now();
    frameCount++;

    if (now - lastFrameTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastFrameTime = now;
    }

    const frameTime = (1000 / (fps || 1)).toFixed(2);
    fpsCounter.textContent = `FPS: ${fps} | Frame Time: ${frameTime}ms`;
}


async function setupCanvas() {
    const canvas = document.querySelector('canvas');

    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

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

async function loadGLTFModel(url) {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load(url, (gltf) => {
            const vertices = [];
            const indices = [];
            let indexOffset = 0;

            gltf.scene.traverse((child) => {
                if (child.isMesh) {
                    const position = child.geometry.attributes.position.array;
                    const normal = child.geometry.attributes.normal ? child.geometry.attributes.normal.array : null;
                    const uv = child.geometry.attributes.uv ? child.geometry.attributes.uv.array : null;
                    const index = child.geometry.index ? child.geometry.index.array : null;

                    for (let i = 0; i < position.length; i += 3) {
                        vertices.push(
                            position[i], position[i + 1], position[i + 2],
                            normal ? normal[i] : 0, normal ? normal[i + 1] : 0, normal ? normal[i + 2] : 1,
                            uv ? uv[i / 3 * 2] : 0, uv ? uv[i / 3 * 2 + 1] : 0
                        );
                    }

                    if (index) {
                        for (let i = 0; i < index.length; i++) {
                            indices.push(index[i] + indexOffset);
                        }
                    }

                    indexOffset += position.length / 3;
                }
            });

            resolve({ vertices: new Float32Array(vertices), indices: new Uint32Array(indices) });
        }, undefined, reject);
    });
}

function createBindGroup(device, uniformBuffer) {
    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: { type: "uniform" }
            }
        ]
    });

    const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
            {
                binding: 0,
                resource: { buffer: uniformBuffer }
            }
        ]
    });

    return { bindGroup, bindGroupLayout };
}

async function loadShader(url) {
    const response = await fetch(url);
    return await response.text();
}
async function main() {
    const { device, context, canvas, canvasFormat } = await setup();
    if (!device || !context || !canvas || !canvasFormat) throw new Error('Failed to setup');

    const modelViewProjectionMatrix = mat4.create();
    const aspect = canvas.width / canvas.height;
    mat4.perspective(modelViewProjectionMatrix, Math.PI / 4, aspect, 0.1, 100);
    mat4.translate(modelViewProjectionMatrix, modelViewProjectionMatrix, [0, -2, -10]);

    const uniformBuffer = device.createBuffer({
        size: 4 * 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const { vertices, indices } = await loadGLTFModel("./resources/skull/model.glb");

    const { bindGroup, bindGroupLayout } = createBindGroup(device, uniformBuffer);

    const indexBuffer = device.createBuffer({
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

        mat4.rotateY(modelViewProjectionMatrix, modelViewProjectionMatrix, 0.01);
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