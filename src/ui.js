import { globals } from "./setup";

let lastFrameTime = performance.now();
let frameCount = 0;
let fps = 0;

const fpsCounter = document.getElementById("fps-counter");
const playerCoords = document.getElementById("player-coords");
const playerRotation = document.getElementById("player-rotation");


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
    playerCoords.textContent = `x: ${globals.cameraPosition[0].toFixed(3)} 
                                y: ${globals.cameraPosition[1].toFixed(3)} 
                                z: ${globals.cameraPosition[2].toFixed(3)}`;

    playerRotation.textContent = `rx: ${globals.cameraRotation[0].toFixed(3)} 
                                ry: ${globals.cameraRotation[1].toFixed(3)} `;
}

export async function setupUI(device, buffers) {
    window.addEventListener("keydown", (e) => {
        globals.keyboardKeys[e.code] = true;
    });

    window.addEventListener("keyup", (e) => {
        globals.keyboardKeys[e.code] = false;
    });

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

    // const toggleDebugMenu = document.getElementById("toggle-debug-menu");
    // let debugMenuToggled = true;
    // toggleDebugMenu.addEventListener("click", () => {
    //     if (debugMenuToggled) {
    //         document.getElementById("right-menu").style.display = "none";
    //         debugMenuToggled = false;
    //     }
    //     else {
    //         document.getElementById("right-menu").style.display = "block";
    //         debugMenuToggled = true;
    //     }
    // })
    initSceneSelector();
    initGraphicsSelector();
    initPostProcessSelectors();
}


function initSceneSelector() {
    const sceneSelector = document.getElementById("scene-selector");
    const scenes = [
        { name: "Gryffindor", id: "scenes/gryffindor.json" },
        { name: "Book", id: "scenes/books.json" },
        { name: "Chickens", id: "scenes/chickens.json" }
    ];

    scenes.forEach(scene => {
        const option = document.createElement("option");
        option.value = scene.id;
        option.textContent = scene.name;
        sceneSelector.appendChild(option);
    });

    sceneSelector.addEventListener("change", (event) => {
        const selectedScene = event.target.value;
        const engine = window.engine;
        // engine.unloadScene();
        engine.loadScene(selectedScene);
    });
}


function initGraphicsSelector() {
    const sceneSelector = document.getElementById("graphics-selector");
    const scenes = [
        { name: "Anime", id: 0 },
        { name: "PBR", id: 1 },
    ];

    scenes.forEach(scene => {
        const option = document.createElement("option");
        option.value = scene.id;
        option.textContent = scene.name;
        sceneSelector.appendChild(option);
    });

    sceneSelector.addEventListener("change", (event) => {
        const engine = window.engine;
        engine.graphicsSettings[0] = event.target.value;
        const graphicsBuffer = engine.buffers.graphicsSettingsBuffer;
        engine.device.queue.writeBuffer(graphicsBuffer, 0, new Uint32Array(engine.graphicsSettings)); // 1st is graphics mode, rest reserved
    });
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
        engine.graphicsSettings[1] = 0;
        for (const [id, flag] of Object.entries(effects)) {
            if (document.getElementById(id).checked) {
                engine.graphicsSettings[1] |= flag;
            }

        }
        engine.device.queue.writeBuffer(graphicsBuffer, 0, new Uint32Array(engine.graphicsSettings));
    }

    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener("change", updateGraphicsSettings);
    });
}