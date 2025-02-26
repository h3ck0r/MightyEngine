async function loadCubemapTexture(device, imageUrls) {
    const imageBlobs = await Promise.all(imageUrls.map(url => fetch(url).then(res => res.blob())));

    const imageBitmaps = await Promise.all(imageBlobs.map(blob => createImageBitmap(blob)));

    const width = imageBitmaps[0].width;
    const height = imageBitmaps[0].height;

    const texture = device.createTexture({
        size: [width, height, 6],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        dimension: '2d', 
    });

    for (let i = 0; i < 6; i++) {
        device.queue.copyExternalImageToTexture(
            { source: imageBitmaps[i] },
            { texture: texture, origin: [0, 0, i] },
            [width, height, 1]
        );
    }

    return texture;
}


export async function loadSkybox(device, bindLayouts, buffers) {
    const skyboxVertices = new Float32Array([
        -1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1, // Back
        -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1, // Front
        -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1, // Top
        -1, -1, 1, 1, -1, 1, 1, -1, -1, -1, -1, -1, // Bottom
        1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, -1, // Right
        -1, -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1 // Left
    ]);

    const skyboxBuffer = device.createBuffer({
        size: skyboxVertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(skyboxBuffer, 0, skyboxVertices);

    const skyboxIndices = new Uint16Array([
        0, 1, 2, 2, 3, 0,
        4, 5, 6, 6, 7, 4,
        8, 9, 10, 10, 11, 8,
        12, 13, 14, 14, 15, 12,
        16, 17, 18, 18, 19, 16,
        20, 21, 22, 22, 23, 20
    ]);

    const skyboxIndexBuffer = device.createBuffer({
        size: skyboxIndices.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(skyboxIndexBuffer, 0, skyboxIndices);

    const skyboxImages = [
        "resources/spacecubemap/right.jpg",
        "resources/spacecubemap/left.jpg",
        "resources/spacecubemap/top.jpg",
        "resources/spacecubemap/bottom.jpg",
        "resources/spacecubemap/front.jpg",
        "resources/spacecubemap/back.jpg"
    ];

    const skyboxTexture = await loadCubemapTexture(device, skyboxImages);
    const sampler = device.createSampler({
        magFilter: "linear",
        minFilter: "linear",
    });
    const skyboxBindGroup = device.createBindGroup({
        layout: bindLayouts.skyboxBindGroupLayout,
        entries: [
            { binding: 0, resource: { buffer: buffers.mvpBuffer } },
            { binding: 1, resource: { buffer: buffers.cameraPositionBuffer } },
            { binding: 2, resource: sampler },
            { binding: 3, resource: skyboxTexture.createView({ dimension: "cube" }) }
        ]
    });

    return { skyboxBuffer, skyboxIndexBuffer, skyboxBindGroup };
}
