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
