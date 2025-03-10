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
            { binding: 4, resource: { buffer: buffers.bloomStrBuffer } }
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

export async function setupUI(device, buffers) {
    window.addEventListener("keydown", (e) => { globals.keyboardKeys[e.key.toLowerCase()] = true; });
    window.addEventListener("keyup", (e) => { globals.keyboardKeys[e.key.toLowerCase()] = false; });
    window.addEventListener("mousemove", (e) => {
        if (document.pointerLockElement) {
            globals.mouseDelta.x += e.movementX * globals.mouseSensitivity;
            globals.mouseDelta.y += e.movementY * globals.mouseSensitivity;

            globals.mouseDelta.y = Math.max(-1.3, Math.min(1.3, globals.mouseDelta.y));
        }
    });

    const renderField = document.getElementById("render-field")
    renderField.addEventListener("click", (e) => {
        if (!document.pointerLockElement) {
            document.body.requestPointerLock();
            document.getElementById("main-menu").style.display = "none";
        }
    });

    const inputLightingX = document.querySelector("#input-lighting-x input");
    const inputLightingY = document.querySelector("#input-lighting-y input");
    const inputLightingZ = document.querySelector("#input-lighting-z input");
    const inputLightingW = document.querySelector("#input-lighting-w input");
    const inputBloomStr = document.querySelector("#input-bloom-str input");
    inputLightingX.addEventListener("input", (e) => {
        globals.lightDirection[0] = e.target.value;
        device.queue.writeBuffer(buffers.globalLightDirectionBuffer, 0, globals.lightDirection);
    });
    inputLightingY.addEventListener("input", (e) => {
        globals.lightDirection[1] = e.target.value;
        device.queue.writeBuffer(buffers.globalLightDirectionBuffer, 0, globals.lightDirection);
    });
    inputLightingZ.addEventListener("input", (e) => {
        globals.lightDirection[2] = e.target.value;
        device.queue.writeBuffer(buffers.globalLightDirectionBuffer, 0, globals.lightDirection);
    });
    inputLightingW.addEventListener("input", (e) => {
        globals.lightDirection[3] = e.target.value;
        device.queue.writeBuffer(buffers.globalLightDirectionBuffer, 0, globals.lightDirection);
    });
    inputBloomStr.addEventListener("input", (e) => {
        globals.bloomStr[0] = e.target.value;
        device.queue.writeBuffer(buffers.bloomStrBuffer, 0, globals.bloomStr);
    });

    const menuExitButton = document.getElementById("exit-button");
    menuExitButton.addEventListener("click", () => {
        document.getElementById("main-menu").style.display = "none";
        document.body.requestPointerLock();
    });

    const toggleDebugMenu = document.getElementById("toggle-debug-menu");
    let debugMenuToggled = true;
    toggleDebugMenu.addEventListener("click", () => {
        if (debugMenuToggled) {
            document.getElementById("right-menu").style.display = "none";
            debugMenuToggled = false;
        }
        else {
            document.getElementById("right-menu").style.display = "block";
            debugMenuToggled = true;
        }
    })
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

    return { mvpBuffer, globalLightDirectionBuffer, cameraPositionBuffer, bloomStrBuffer }
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

    globals.aspect = canvas.width / canvas.height;
    if (!device || !context || !canvas || !canvasFormat) throw new Error('Failed to setup');

    return { device, context, canvas, canvasFormat };
}