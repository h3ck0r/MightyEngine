import { GLTFLoader } from 'three-stdlib';

export async function loadGLTFModel(url) {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load(url, (gltf) => {
            const meshes = [];

            gltf.scene.traverse((child) => {
                if (child.isMesh) {
                    const vertices = [];
                    const indices = [];
                    let indexOffset = 0;

                    const position = child.geometry.attributes.position.array;
                    const normal = child.geometry.attributes.normal ? child.geometry.attributes.normal.array : null;
                    const uv = child.geometry.attributes.uv ? child.geometry.attributes.uv.array : null;
                    const index = child.geometry.index ? child.geometry.index.array : null;
                    const tangent = child.geometry.attributes.tangent ? child.geometry.attributes.tangent.array : null;
                    const material = child.material || null;

                    for (let i = 0; i < position.length; i += 3) {
                        vertices.push(
                            position[i], position[i + 1], position[i + 2],
                            normal ? normal[i] : 0, normal ? normal[i + 1] : 0, normal ? normal[i + 2] : 1,
                            uv ? uv[(i / 3) * 2] : 0, uv ? uv[(i / 3) * 2 + 1] : 0,
                            tangent ? tangent[i] : 1, tangent ? tangent[i + 1] : 0, tangent ? tangent[i + 2] : 0, tangent ? tangent[i + 3] : 1
                        );
                    }

                    if (index) {
                        for (let i = 0; i < index.length; i++) {
                            indices.push(index[i] + indexOffset);
                        }
                    }

                    indexOffset += position.length / 3;
                    meshes.push({
                        name: child.name,
                        vertices: new Float32Array(vertices),
                        indices: new Uint32Array(indices),
                        material: material
                    });
                }
            });

            resolve(meshes);
        }, undefined, reject);
    });
}


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
        minFilter: 'linear',
        mipmapFilter: 'linear',
        addressModeU: 'repeat',
        addressModeV: 'repeat',
        addressModeW: 'repeat'
    });


    return { texture, sampler };
}


export async function loadCubemapTexture(device, imageUrls) {
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

export function createBindGroupForGameObject(device, bindLayouts, buffers, modelMatrixBuffer, pointLightPositionsBuffer, pointLightColorsBuffer, model) {
    return device.createBindGroup({
        layout: bindLayouts.mainBindGroupLayout,
        entries: [
            { binding: 0, resource: { buffer: buffers.mvpBuffer } },
            { binding: 1, resource: { buffer: modelMatrixBuffer } },
            { binding: 2, resource: { buffer: buffers.cameraPositionBuffer } },
            { binding: 3, resource: { buffer: buffers.globalLightDirectionBuffer } },
            { binding: 4, resource: { buffer: pointLightPositionsBuffer } },
            { binding: 5, resource: { buffer: pointLightColorsBuffer } },
            { binding: 6, resource: model.albedoTexture.createView() },
            { binding: 7, resource: model.albedoSampler },
            { binding: 8, resource: model.normalTexture.createView() },
            { binding: 9, resource: model.normalSampler },
            { binding: 10, resource: model.roughnessTexture.createView() },
            { binding: 11, resource: model.roughnessSampler },
            { binding: 12, resource: model.metalnessTexture.createView() },
            { binding: 13, resource: model.metalnessSampler },
            { binding: 14, resource: model.specularColorTexture.createView() },
            { binding: 15, resource: model.specularColorSampler },
            { binding: 16, resource: { buffer: model.materialAttributesBuffer } },
            { binding: 17, resource: { buffer: buffers.graphicsSettingsBuffer } }
        ]
    });
}

export function createPostProcessResources(device, bindLayouts, renderTextureViews, buffers) {
    const bloomSampler = device.createSampler({
        magFilter: "linear",
        minFilter: "linear"
    });

    const sceneSampler = device.createSampler({
        magFilter: "linear",
        minFilter: "linear",
    });

    const postProcessBindGroup = device.createBindGroup({
        layout: bindLayouts.postProcessBindGroupLayout,
        entries: [
            { binding: 0, resource: renderTextureViews.sceneTextureView },
            { binding: 1, resource: sceneSampler },
            { binding: 2, resource: renderTextureViews.blurVTextureView },
            { binding: 3, resource: bloomSampler },
            { binding: 4, resource: { buffer: buffers.bloomStrBuffer } },
            { binding: 5, resource: { buffer: buffers.graphicsSettingsBuffer } }
        ],
    });

    const bloomBindGroup = device.createBindGroup({
        layout: bindLayouts.bloomBindGroupLayout,
        entries: [
            { binding: 0, resource: renderTextureViews.sceneTextureView },
            { binding: 1, resource: bloomSampler }
        ],
    });

    const blurHBindGroup = device.createBindGroup({
        layout: bindLayouts.bloomBindGroupLayout,
        entries: [
            { binding: 0, resource: renderTextureViews.bloomTextureView },
            { binding: 1, resource: bloomSampler }
        ],
    });
    const blurVBindGroup = device.createBindGroup({
        layout: bindLayouts.bloomBindGroupLayout,
        entries: [
            { binding: 0, resource: renderTextureViews.blurHTextureView },
            { binding: 1, resource: bloomSampler }
        ],
    });


    return { postProcessBindGroup, bloomBindGroup, blurVBindGroup, blurHBindGroup };
}