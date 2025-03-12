import { loadShader } from "./utils.js"

export const globals = {
    lightDirection: new Float32Array([10, 10, 0, 1]),
    bloomStr: new Float32Array([0.1, 0, 0]),
    cameraPosition: new Float32Array([0, 1, 1]),
    cameraRotation: [0, 0],
    keyboardKeys: {},
    mouseDelta: { x: 0, y: 0 },
    aspect: 1,
    mouseSensitivity: 0.002,
    moveSpeed: 0.01,
    baseMoveSpeed: 0.01,
    nearCamera: 0.01,
    farCamer: 100
}

export function createRenderTextureViews(device, canvas, canvasFormat) {
    const sceneTexture = device.createTexture({
        size: [canvas.width, canvas.height, 1],
        format: canvasFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
    });

    const bloomTexture = device.createTexture({
        size: [canvas.width / 2, canvas.height / 2, 1],
        format: canvasFormat,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
    });

    const blurVTexture = device.createTexture({
        size: [canvas.width / 2, canvas.height / 2, 1],
        format: canvasFormat,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
    });
    const blurHTexture = device.createTexture({
        size: [canvas.width / 2, canvas.height / 2, 1],
        format: canvasFormat,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
    });

    const sceneTextureView = sceneTexture.createView();
    const bloomTextureView = bloomTexture.createView();
    const blurVTextureView = blurVTexture.createView();
    const blurHTextureView = blurHTexture.createView();

    return { sceneTextureView, bloomTextureView, blurVTextureView, blurHTextureView };
}

export function createPostProcessResources(device, bindLayouts, renderTextureViews, buffers) {

    const bloomSampler = device.createSampler({
        magFilter: "linear",
        minFilter: "linear"
    });

    const sceneSampler = device.createSampler({
        magFilter: "linear",
        minFilter: "linear",
    });

    const postProcessBindGroup = device.createBindGroup({
        layout: bindLayouts.postProcessBindGroupLayout,
        entries: [
            { binding: 0, resource: renderTextureViews.sceneTextureView },
            { binding: 1, resource: sceneSampler },
            { binding: 2, resource: renderTextureViews.blurVTextureView },
            { binding: 3, resource: bloomSampler },
            { binding: 4, resource: { buffer: buffers.bloomStrBuffer } },
            { binding: 5, resource: { buffer: buffers.graphicsSettingsBuffer } }
        ],
    });

    const bloomBindGroup = device.createBindGroup({
        layout: bindLayouts.bloomBindGroupLayout,
        entries: [
            { binding: 0, resource: renderTextureViews.sceneTextureView },
            { binding: 1, resource: bloomSampler }
        ],
    });

    const blurHBindGroup = device.createBindGroup({
        layout: bindLayouts.bloomBindGroupLayout,
        entries: [
            { binding: 0, resource: renderTextureViews.bloomTextureView },
            { binding: 1, resource: bloomSampler }
        ],
    });
    const blurVBindGroup = device.createBindGroup({
        layout: bindLayouts.bloomBindGroupLayout,
        entries: [
            { binding: 0, resource: renderTextureViews.blurHTextureView },
            { binding: 1, resource: bloomSampler }
        ],
    });


    return { postProcessBindGroup, bloomBindGroup, blurVBindGroup, blurHBindGroup };
}

export async function loadShaders(device) {
    const mainShaderCode = await loadShader('shaders/main-shader.wgsl');
    const mainShaderModule = device.createShaderModule({ label: 'Main Shader', code: mainShaderCode });
    const skyboxShaderCode = await loadShader('shaders/skybox-shader.wgsl');
    const skyboxShaderModule = device.createShaderModule({ label: 'Skybox Shader', code: skyboxShaderCode });
    const postprocessShaderCode = await loadShader('shaders/postprocess.wgsl');
    const postProcessShaderModule = device.createShaderModule({ label: 'Postprocess Shader', code: postprocessShaderCode });
    const pointLightShaderCode = await loadShader('shaders/point-light.wgsl');
    const pointLightShaderModule = device.createShaderModule({ label: 'Point Light Shader', code: pointLightShaderCode });
    const bloomShaderCode = await loadShader('shaders/bloom.wgsl');
    const bloomShaderModule = device.createShaderModule({ label: 'Bloom Shader', code: bloomShaderCode });
    return {
        mainShaderModule,
        skyboxShaderModule,
        postProcessShaderModule,
        pointLightShaderModule,
        bloomShaderModule
    };
}

export async function setupCanvas() {
    const canvas = document.querySelector('canvas');

    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    const context = canvas.getContext('webgpu');
    return { canvas, context };
}

export async function setupBuffers(device) {
    const mvpBuffer = device.createBuffer({
        label: "Uniform Buffer",
        size: 4 * 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const globalLightDirectionBuffer = device.createBuffer({
        label: "Global Light Direction Buffer",
        size: 4 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(globalLightDirectionBuffer, 0, globals.lightDirection);

    const cameraPositionBuffer = device.createBuffer({
        label: "Camera Position Buffer",
        size: 3 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(cameraPositionBuffer, 0, globals.cameraPosition);

    const bloomStrBuffer = device.createBuffer({
        label: "Bloom Str Buffer",
        size: 3 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(bloomStrBuffer, 0, globals.bloomStr);

    const graphicsSettingsBuffer = device.createBuffer({
        label: "Graphics Settings Buffer",
        size: 4 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(graphicsSettingsBuffer, 0, new Float32Array([0,0,0,0])); // 1st is graphics mode, rest reserved

    return { mvpBuffer, globalLightDirectionBuffer, cameraPositionBuffer, bloomStrBuffer, graphicsSettingsBuffer }
}

export async function createDepthTexture(device, canvas) {
    const depthTexture = device.createTexture({
        size: [canvas.width, canvas.height, 1],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
    const depthView = depthTexture.createView();
    return depthView
}

export async function setup() {
    const { canvas, context } = await setupCanvas();

    if (!navigator.gpu) {
        alert("Your browser does not support WebGPU. Please use a browser like Google Chrome or Microsoft Edge.");
        console.error("WebGPU not supported");
        return;
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        alert("No compatible GPU adapter found. Try updating your graphics drivers or using a different browser.");
        console.error("No adapter found");
        return;
    }

    const device = await adapter.requestDevice();
    if (!device) {
        alert("Your browser does not support WebGPU. Please use a browser like Google Chrome or Microsoft Edge.");
        console.error("Failed to create WebGPU device");
        return;
    }

    device.addEventListener('uncapturederror', event => console.error(event.error.message));
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
        device: device,
        format: canvasFormat
    });

    globals.aspect = canvas.width / canvas.height;
    if (!device || !context || !canvas || !canvasFormat) throw new Error('Failed to setup');

    return { device, context, canvas, canvasFormat };
}