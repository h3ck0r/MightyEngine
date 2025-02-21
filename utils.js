export async function loadTexture(device, url) {
    const response = await fetch(url);
    const imageBitmap = await createImageBitmap(await response.blob());

    const texture = device.createTexture({
        size: [imageBitmap.width, imageBitmap.height, 1],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
    });
    device.queue.copyExternalImageToTexture(
        { source: imageBitmap },
        { texture: texture },
        [imageBitmap.width, imageBitmap.height, 1]
    );

    const sampler = device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear'
    });

    return { texture, sampler };
}