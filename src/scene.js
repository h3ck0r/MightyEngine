import { vec3 } from "gl-matrix";
import { GameObject } from "./game-object.js";

export async function loadObjects(device, bindLayouts, buffers) {
    const gameObjects = [];
    const instance_count = 1;

    const modelPaths = [
        { name: "imp", url: "resources/devil_book/model.glb" },
    ];

    const gameObjectMap = {};
    for (const modelInfo of modelPaths) {
        const gameObject = new GameObject();
        await gameObject.addModel(modelInfo.url, device);
        gameObjectMap[modelInfo.name] = gameObject;
    }

    for (let i = 0; i < instance_count; i++) {
        const modelKeys = Object.keys(gameObjectMap);
        const selectedModelKey = modelKeys[Math.floor(Math.random() * modelKeys.length)];
        const referenceObj = gameObjectMap[selectedModelKey];

        for (const model of referenceObj.models) {
            const obj = new GameObject();
            obj.vertexBuffer = model.vertexBuffer;
            obj.indexBuffer = model.indexBuffer;
            obj.indices = model.indices;
            obj.position = vec3.fromValues(1.0, 0.0, 10.0);

            obj.modelUniformBuffer = device.createBuffer({
                label: "Model Matrix Buffer",
                size: 4 * 16,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });

            obj.bindGroup = device.createBindGroup({
                layout: bindLayouts.mainBindGroupLayout,
                entries: [
                    { binding: 0, resource: { buffer: buffers.mvpBuffer } },
                    { binding: 1, resource: { buffer: obj.modelUniformBuffer } },
                    { binding: 2, resource: { buffer: buffers.cameraPositionBuffer } },
                    { binding: 3, resource: { buffer: buffers.globalLightDirectionBuffer } },
                    { binding: 4, resource: model.albedoTexture.createView() },
                    { binding: 5, resource: model.albedoSampler },
                    { binding: 6, resource: model.normalTexture.createView() },
                    { binding: 7, resource: model.normalSampler },
                    { binding: 8, resource: model.roughnessTexture.createView() },
                    { binding: 9, resource: model.roughnessSampler },
                    { binding: 10, resource: model.metalnessTexture.createView() },
                    { binding: 11, resource: model.metalnessSampler },
                    { binding: 12, resource: model.specularColorTexture.createView() },
                    { binding: 13, resource: model.specularColorSampler }
                ]
            });

            gameObjects.push(obj);
        }
    }
    return gameObjects;
}


// let val = Math.random();
// let referenceObj = null;
// if (val > 0.9) {
//     referenceObj = eggObj;
// }
// else {
//     referenceObj = chickenObj;
// }
// let range = 50;

// obj.position = vec3.fromValues(Math.random() * range - range / 2, Math.random() * range - range / 2, Math.random() * range - range / 2);
// obj.rotation = vec3.fromValues(Math.random() * range - range / 2, Math.random() * range - range / 2, Math.random() * range - range / 2);
// obj.scale = vec3.fromValues(val, val, val);

// obj.updateTransform();