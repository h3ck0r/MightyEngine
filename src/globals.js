export const globals = {
    globalLight: {
        lightDirection: new Float32Array([10, 10, 0, 1]),
        lightPosition: new Float32Array([0, 0, 0, 0]),
    },
    graphicsSettings: {
        enableLightSpheres: false,
        debugMenu: false
    },
    camera: {
        cameraRotation: [0, 0],
        cameraPosition: new Float32Array([0, 1, 1]),
        nearCamera: 0.01,
        farCamera: 100,
        aspect: 1,
        moveSpeed: 0.01,
        baseMoveSpeed: 0.01,
        speedup: 4
    },
    bloomStr: new Float32Array([0.1, 0, 0]),
    keyboardKeys: {},
    mouseDelta: { x: 0, y: 0 },
    mouseSensitivity: 0.002,
}