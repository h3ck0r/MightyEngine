export function createRenderTextureViews(device, canvas, canvasFormat) {
    const sceneTexture = device.createTexture({
        label: "Scene Texture",
        size: [canvas.width, canvas.height, 1],
        format: canvasFormat,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
    });

    const bloomTexture = device.createTexture({
        label: "Bloom Texture",
        size: [canvas.width / 2, canvas.height / 2, 1],
        format: canvasFormat,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
    });

    const blurVTexture = device.createTexture({
        label: "Blur V Texture",
        size: [canvas.width / 2, canvas.height / 2, 1],
        format: canvasFormat,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
    });
    const blurHTexture = device.createTexture({
        label: "Blur H Texture",
        size: [canvas.width / 2, canvas.height / 2, 1],
        format: canvasFormat,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
    });
    const depthTexture = device.createTexture({
        size: [canvas.width, canvas.height, 1],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
    const depthView = depthTexture.createView();
    const sceneTextureView = sceneTexture.createView();
    const bloomTextureView = bloomTexture.createView();
    const blurVTextureView = blurVTexture.createView();
    const blurHTextureView = blurHTexture.createView();

    return {
        sceneTextureView,
        bloomTextureView,
        blurVTextureView,
        blurHTextureView,
        depthView
    };
}