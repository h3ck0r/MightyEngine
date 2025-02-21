import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export async function loadGLTFModel(url) {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load(url, (gltf) => {
            const vertices = [];
            const indices = [];
            let indexOffset = 0;

            console.log(gltf)
            gltf.scene.traverse((child) => {
                if (child.isMesh) {
                    const position = child.geometry.attributes.position.array;
                    const normal = child.geometry.attributes.normal ? child.geometry.attributes.normal.array : null;
                    const uv = child.geometry.attributes.uv ? child.geometry.attributes.uv.array : null;
                    const index = child.geometry.index ? child.geometry.index.array : null;

                    for (let i = 0; i < position.length; i += 3) {
                        vertices.push(
                            position[i], position[i + 1], position[i + 2],
                            normal ? normal[i] : 0, normal ? normal[i + 1] : 0, normal ? normal[i + 2] : 1,
                            uv ? uv[i / 3 * 2] : 0, uv ? uv[i / 3 * 2 + 1] : 0
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

            resolve({ vertices: new Float32Array(vertices), indices: new Uint32Array(indices) });
        }, undefined, reject);
    });
}
