import { mat4 } from "gl-matrix";
import { loadShader } from "./utils.js"

export const globals = {
    lightDirection: new Float32Array([1, 1, 1]),
    cameraPosition: new Float32Array([0, 0, 0]),
    cameraRotation: [0, 0],
    keyboardKeys: {},
    mouseDelta: { x: 0, y: 0 },
    aspect: 1,
    mouseSensitivity: 0.002,
}

export function createPostProcessResources(device, bindLayouts, sceneTextureView) {

    const sceneSampler = device.createSampler({
        magFilter: "linear",
        minFilter: "linear",
    });

    const postProcessBindGroup = device.createBindGroup({
        layout: bindLayouts.postProcessBindGroupLayout,
        entries: [
            { binding: 0, resource: sceneTextureView },
            { binding: 1, resource: sceneSampler },
        ],
    });

    return { postProcessBindGroup };
}

export function createBindLayouts(device) {
    const mainBindGroupLayout = device.createBindGroupLayout({
        label: "Main Bind Group Layout",
        entries: [
            { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
            { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
            { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
            { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
            { binding: 4, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
            { binding: 5, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
            { binding: 6, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
            { binding: 7, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
            { binding: 8, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
            { binding: 9, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
        ]
    });
    const skyboxBindGroupLayout = device.createBindGroupLayout({
        label: "Skybox Bind Group Layout",
        entries: [
            { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
            { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
            { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
            { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float", viewDimension: "cube" } }
        ]
    });
    const postProcessBindGroupLayout = device.createBindGroupLayout({
        label: "Post-Processing Bind Group Layout",
        entries: [
            { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
            { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
        ]
    });

    return { mainBindGroupLayout, skyboxBindGroupLayout, postProcessBindGroupLayout };

}

export async function loadShaders(device) {
    const mainShaderCode = await loadShader('shaders/main_shader.wgsl');
    const mainShaderModule = device.createShaderModule({ label: 'Main Shader', code: mainShaderCode });
    const skyboxShaderCode = await loadShader('shaders/skybox_shader.wgsl');
    const skyboxShaderModule = device.createShaderModule({ label: 'Skybox Shader', code: skyboxShaderCode });
    const postprocessShaderCode = await loadShader('shaders/postprocess.wgsl');
    const postProcessShaderModule = device.createShaderModule({ label: 'Postprocess Shader', code: postprocessShaderCode });
    return { mainShaderModule, skyboxShaderModule, postProcessShaderModule };
}

export async function setupUI(device, buffers) {
    window.addEventListener("keydown", (e) => { globals.keyboardKeys[e.key.toLowerCase()] = true; });
    window.addEventListener("keyup", (e) => { globals.keyboardKeys[e.key.toLowerCase()] = false; });
    window.addEventListener("mousemove", (e) => {
        if (document.pointerLockElement) {
            globals.mouseDelta.x += e.movementX * globals.mouseSensitivity;
            globals.mouseDelta.y += e.movementY * globals.mouseSensitivity;
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
    return { mvpBuffer, globalLightDirectionBuffer, cameraPositionBuffer }
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

    const sceneTexture = device.createTexture({
        size: [canvas.width, canvas.height, 1],
        format: canvasFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
    });
    const sceneTextureView = sceneTexture.createView();

    return { device, context, canvas, canvasFormat, sceneTextureView };
}