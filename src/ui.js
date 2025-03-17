import { globals } from "./globals.js";

let lastFrameTime = performance.now();
let frameCount = 0;
let fps = 0;

const fpsCounter = document.getElementById("fps-counter");
const playerCoords = document.getElementById("player-coords");
const playerRotation = document.getElementById("player-rotation");
const renderField = document.getElementById("render-field");
const menuExitButton = document.getElementById("exit-button");
const inputDirLighting = [
    document.querySelector("#input-lighting-dir-x input"),
    document.querySelector("#input-lighting-dir-y input"),
    document.querySelector("#input-lighting-dir-z input"),
    document.querySelector("#input-lighting-w input")
];
const inputPosLighting = [
    document.querySelector("#input-lighting-pos-x input"),
    document.querySelector("#input-lighting-pos-y input"),
    document.querySelector("#input-lighting-pos-z input"),
];
const inputBloomStr = document.querySelector("#input-bloom-str input");

export function updateUI() {
    const now = performance.now();
    frameCount++;

    if (now - lastFrameTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastFrameTime = now;
    }

    const frameTime = (1000 / (fps || 1)).toFixed(2);
    fpsCounter.textContent = `FPS: ${fps} | Frame Time: ${frameTime}ms`;
    playerCoords.textContent = `x: ${globals.camera.cameraPosition[0].toFixed(3)} 
                                y: ${globals.camera.cameraPosition[1].toFixed(3)} 
                                z: ${globals.camera.cameraPosition[2].toFixed(3)}`;
    playerRotation.textContent = `rx: ${globals.camera.cameraRotation[0].toFixed(3)} 
                                ry: ${globals.camera.cameraRotation[1].toFixed(3)} `;
}

export async function setupUI(device, buffers) {
    window.addEventListener("keydown", (e) => (globals.keyboardKeys[e.code] = true));
    window.addEventListener("keyup", (e) => (globals.keyboardKeys[e.code] = false));

    window.addEventListener("mousemove", (e) => {
        if (document.pointerLockElement) {
            globals.mouseDelta.x += e.movementX * globals.mouseSensitivity;
            globals.mouseDelta.y += e.movementY * globals.mouseSensitivity;
            globals.mouseDelta.y = Math.max(-1.3, Math.min(1.3, globals.mouseDelta.y));
        }
    });

    renderField.addEventListener("click", () => {
        if (!document.pointerLockElement) {
            document.body.requestPointerLock();
            document.getElementById("main-menu").style.display = "none";
        }
    });

    menuExitButton.addEventListener("click", () => {
        document.getElementById("main-menu").style.display = "none";
        document.body.requestPointerLock();
    });

    inputDirLighting.forEach((input, index) => {
        input.addEventListener("input", (e) => {
            globals.globalLight.lightDirection[index] = parseFloat(e.target.value);
            device.queue.writeBuffer(buffers.globalLightDirectionBuffer, 0, globals.globalLight.lightDirection);
        });
    });

    inputPosLighting.forEach((input, index) => {
        input.addEventListener("input", (e) => {
            globals.globalLight.lightPosition[index] = parseFloat(e.target.value);
            device.queue.writeBuffer(buffers.globalLightPositionBuffer, 0, globals.globalLight.lightPosition);
        });
    });

    inputBloomStr.addEventListener("input", (e) => {
        globals.bloomStr[0] = parseFloat(e.target.value);
        device.queue.writeBuffer(buffers.bloomStrBuffer, 0, globals.bloomStr);
    });

    initSelector("scene-selector", [
        { name: "Gryffindor", id: "./scenes/gryffindor.json" },
        { name: "Book", id: "./scenes/books.json" },
        { name: "Chicken", id: "./scenes/chickens.json" },
        { name: "Dumbledor", id: "./scenes/dumbledor.json" },
        { name: "Potions Class", id: "./scenes/potionclass.json" },
        { name: "The Mill", id: "./scenes/mill.json" }
    ], (selectedScene) => window.engine.loadScene(selectedScene));

    initSelector("graphics-selector", [
        { name: "Albedo+Soft Shadows", id: 0 },
        { name: "PBR", id: 1 }
    ], (graphicsMode) => {
        const engine = window.engine;
        engine.graphicsSettings[0] = graphicsMode;
        engine.device.queue.writeBuffer(engine.buffers.graphicsSettingsBuffer, 0, new Uint32Array(engine.graphicsSettings));
    });

    initPostProcessSelectors();
    initExtraSettings();
}

function initSelector(elementId, options, onChange) {
    const selector = document.getElementById(elementId);
    options.forEach(({ name, id }) => {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = name;
        selector.appendChild(option);
    });

    selector.addEventListener("change", (event) => onChange(event.target.value));
}

function initPostProcessSelectors() {
    const effects = {
        "toggle-bloom": 0x01,
        "toggle-motion-blur": 0x02,
        "toggle-exposure": 0x04,
        "toggle-stylized-shadows": 0x08,
        "toggle-scanlines": 0x10,
        "toggle-chromatic-aberration": 0x20,
        "toggle-random-noise": 0x40,
        "toggle-posterize": 0x80,
        "toggle-vignette": 0x100,
        "toggle-invert-color": 0x200
    };

    const engine = window.engine;
    const graphicsBuffer = engine.buffers.graphicsSettingsBuffer;

    function updateGraphicsSettings() {
        engine.graphicsSettings[1] = Object.entries(effects).reduce((flags, [id, flag]) => {
            return flags | (document.getElementById(id).checked ? flag : 0);
        }, 0);

        engine.device.queue.writeBuffer(graphicsBuffer, 0, new Uint32Array(engine.graphicsSettings));
    }

    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener("change", updateGraphicsSettings);
    });
}

function initExtraSettings() {
    document.getElementById("toggle-spheres").addEventListener("change", (event) => {
        globals.graphicsSettings.enableLightSpheres = event.target.checked;
    });
}