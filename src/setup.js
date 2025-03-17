import { loadShader } from "./utils.js";
import { globals } from "./globals.js";

export async function loadShaders(device) {
    const mainShaderCode = await loadShader('./shaders/main-shader.wgsl');
    const mainShaderModule = device.createShaderModule({ label: 'Main Shader', code: mainShaderCode });
    const skyboxShaderCode = await loadShader('./shaders/skybox-shader.wgsl');
    const skyboxShaderModule = device.createShaderModule({ label: 'Skybox Shader', code: skyboxShaderCode });
    const postprocessShaderCode = await loadShader('./shaders/postprocess.wgsl');
    const postProcessShaderModule = device.createShaderModule({ label: 'Postprocess Shader', code: postprocessShaderCode });
    const pointLightShaderCode = await loadShader('./shaders/point-light.wgsl');
    const pointLightShaderModule = device.createShaderModule({ label: 'Point Light Shader', code: pointLightShaderCode });
    const bloomShaderCode = await loadShader('./shaders/bloom.wgsl');
    const bloomShaderModule = device.createShaderModule({ label: 'Bloom Shader', code: bloomShaderCode });
    return {
        mainShaderModule,
        skyboxShaderModule,
        postProcessShaderModule,
        pointLightShaderModule,
        bloomShaderModule
    };
}

export function setupCanvas() {
    const canvas = document.getElementById('render-field');

    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    const context = canvas.getContext('webgpu');
    return { canvas, context };
}

export async function setup() {
    const { canvas, context } = setupCanvas();

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

    globals.camera.aspect = canvas.width / canvas.height;
    if (!device || !context || !canvas || !canvasFormat) throw new Error('Failed to setup');

    return { device, context, canvas, canvasFormat };
}