import { globals } from "./setup";

let lastFrameTime = performance.now();
let frameCount = 0;
let fps = 0;

const fpsCounter = document.getElementsByClassName("no-events")[0];
export function updateFPS() {
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
    initSceneSelector();
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