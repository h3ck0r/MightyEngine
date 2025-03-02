import { vec3 } from "gl-matrix";
import { GameObject } from "./game-object.js";

export async function loadPointLightObjects(device, bindLayouts, buffers) {
    const pointLightObjects = [];

    const pointLightObject = new GameObject(device);
    pointLightObject.makeDefaultSphere();
    for (const model of pointLightObject.models) {
        const obj = new GameObject(device);
        obj.vertexBuffer = model.vertexBuffer;
        obj.indexBuffer = model.indexBuffer;
        obj.indices = model.indices;
        obj.position = vec3.fromValues(-2.0, 0.0, 0.0);
        obj.scale = vec3.fromValues(0.5,0.5,0.5);
        obj.modelMatrixBuffer = device.createBuffer({
            label: "Model Matrix Buffer",
            size: 4 * 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        const lightColor = new Float32Array([1.0, 1.0, 1.0, 1.0]);
        obj.colorBuffer = device.createBuffer({
            label: "Point Light Color Buffer",
            size: 4 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(obj.colorBuffer, 0, lightColor);

        obj.bindGroup = device.createBindGroup({
            layout: bindLayouts.pointLightBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: buffers.mvpBuffer } },
                { binding: 1, resource: { buffer: obj.modelMatrixBuffer } },
                { binding: 2, resource: { buffer: obj.colorBuffer } }
            ]
        });

        pointLightObjects.push(obj);
    }

    return pointLightObjects;
}


export async function loadObjects(device, bindLayouts, buffers) {
    const gameObjects = [];
    const instance_count = 1;

    const modelPaths = [
        { name: "imp", url: "resources/devil_book/model.glb" },
    ];

    const gameObjectMap = {};
    for (const modelInfo of modelPaths) {
        const gameObject = new GameObject(device);
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
            obj.position = vec3.fromValues(4.0, 0.0, 1.0);

            obj.modelMatrixBuffer = device.createBuffer({
                label: "Model Matrix Buffer",
                size: 4 * 16,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });

            obj.bindGroup = device.createBindGroup({
                layout: bindLayouts.mainBindGroupLayout,
                entries: [
                    { binding: 0, resource: { buffer: buffers.mvpBuffer } },
                    { binding: 1, resource: { buffer: obj.modelMatrixBuffer } },
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