
export const globals = {
    lightDirection: new Float32Array([1, 1, 1]),
    cameraPosition: [0, 0, -10],
    cameraRotation: [0, 0],
    keyboardKeys: {},
    mouseDelta: { x: 0, y: 0 },
    aspect: 1,
    mouseSensitivity: 0.002,
}

export async function setupUI(device, globalLightDirectionBuffer) {
    const inputLightingX = document.querySelector("#input-lighting-x input");
    const inputLightingY = document.querySelector("#input-lighting-y input");
    const inputLightingZ = document.querySelector("#input-lighting-z input");

    inputLightingX.addEventListener("input", (e) => {
        globals.lightDirection[0] = e.target.value;
        device.queue.writeBuffer(globalLightDirectionBuffer, 0, globals.lightDirection);
    });
    inputLightingY.addEventListener("input", (e) => {
        globals.lightDirection[1] = e.target.value;
        device.queue.writeBuffer(globalLightDirectionBuffer, 0, globals.lightDirection);
    });
    inputLightingZ.addEventListener("input", (e) => {
        globals.lightDirection[2] = e.target.value;
        device.queue.writeBuffer(globalLightDirectionBuffer, 0, globals.lightDirection);
    });
}

async function setupControls() {

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
        }
    });
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
    setupControls();
    if (!device || !context || !canvas || !canvasFormat) throw new Error('Failed to setup');
    return { device, context, canvas, canvasFormat };
}