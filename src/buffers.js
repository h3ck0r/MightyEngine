import { globals } from "./globals";

export function setupBuffers(device) {
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
    device.queue.writeBuffer(globalLightDirectionBuffer, 0, globals.globalLight.lightDirection);

    const cameraPositionBuffer = device.createBuffer({
        label: "Camera Position Buffer",
        size: 3 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(cameraPositionBuffer, 0, globals.camera.cameraPosition);

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
    device.queue.writeBuffer(graphicsSettingsBuffer, 0, new Float32Array([0, 0, 0, 0])); // 1st is graphics mode, rest reserved

    return { mvpBuffer, globalLightDirectionBuffer, cameraPositionBuffer, bloomStrBuffer, graphicsSettingsBuffer }
}
