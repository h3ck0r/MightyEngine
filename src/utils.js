import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export async function loadGLTFModel(url) {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load(url, (gltf) => {
            const vertices = [];
            const indices = [];
            let material = null;
            let indexOffset = 0;

            gltf.scene.traverse((child) => {
                if (child.isMesh) {
                    material = child.material ? child.material : null;
                    const position = child.geometry.attributes.position.array;
                    const normal = child.geometry.attributes.normal ? child.geometry.attributes.normal.array : null;
                    const uv = child.geometry.attributes.uv ? child.geometry.attributes.uv.array : null;
                    const index = child.geometry.index ? child.geometry.index.array : null;
                    const tangent = child.geometry.attributes.tangent ? child.geometry.attributes.tangent.array : null;

                    for (let i = 0; i < position.length; i += 3) {
                        vertices.push(
                            position[i], position[i + 1], position[i + 2],
                            normal ? normal[i] : 0, normal ? normal[i + 1] : 0, normal ? normal[i + 2] : 1,
                            uv ? uv[i / 3 * 2] : 0, uv ? uv[i / 3 * 2 + 1] : 0,
                            tangent ? tangent[i] : 1, tangent ? tangent[i + 1] : 0, tangent ? tangent[i + 2] : 0, tangent ? tangent[i + 3] : 1
                        );
                    }

                    if (index) {
                        for (let i = 0; i < index.length; i++) {
                            indices.push(index[i] + indexOffset);
                        }
                    }

                    indexOffset += position.length / 3;
                }
            });

            resolve({
                vertices: new Float32Array(vertices),
                indices: new Uint32Array(indices),
                material
            });
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

export async function loadShader(url) {
    const response = await fetch(url);
    return await response.text();
}

export function createRenderPass(encoder, textureView, depthView) {
    let colorAttachments = [{
        view: textureView,
        loadOp: "clear",
        clearValue: { r: 0.15, g: 0.15, b: 0.2, a: 1 },
        storeOp: "store"
    }];

    let renderPassDescriptor = {
        colorAttachments: colorAttachments
    };

    if (depthView) {
        renderPassDescriptor.depthStencilAttachment = {
            view: depthView,
            depthLoadOp: "clear",
            depthClearValue: 1.0,
            depthStoreOp: "store"
        };
    }

    return encoder.beginRenderPass(renderPassDescriptor);
}
