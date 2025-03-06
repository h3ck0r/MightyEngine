import { vec3 } from "gl-matrix";
import { GameObject } from "./game-object.js";

export async function loadPointLightObjects(device, bindLayouts, buffers, numLights = 1, radius = 5.0) {
    const pointLightObjects = [];
    const objectsToAdd = [];
    const point = new GameObject(device);
    point.makeDefaultSphere();
    objectsToAdd.push(point);

    for (let i = 0; i < numLights; i++) {
        const angle = (i / numLights) * Math.PI * 2; 
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        for (const pointLightObject of objectsToAdd) {
            for (const model of pointLightObject.models) {
                const obj = new GameObject(device);
                obj.vertexBuffer = model.vertexBuffer;
                obj.indexBuffer = model.indexBuffer;
                obj.indices = model.indices;
                obj.position = vec3.fromValues(x, 0.0, z); 
                obj.scale = vec3.fromValues(0.5, 0.5, 0.5);
                obj.modelMatrixBuffer = device.createBuffer({
                    label: "Model Matrix Buffer",
                    size: 4 * 16,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                });

                const lightColor = pointLightObject.defaultColor;
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
        }
    }

    const pointLightPositionsBuffer = device.createBuffer({
        label: "Point Light Positions",
        size: pointLightObjects.length * 4 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    const pointLightColorsBuffer = device.createBuffer({
        label: "Point Light Colors",
        size: pointLightObjects.length * 4 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
   

    return { pointLightObjects, pointLightPositionsBuffer, pointLightColorsBuffer };
}


export async function loadObjects(device, bindLayouts, buffers, pointLightObjects) {
    const gameObjects = [];
    const instance_count = 1;

    const modelPaths = [
        { name: "imp", url: "resources/tavern/model.glb" },
    ];

    const gameObjectMap = {};
    for (const modelInfo of modelPaths) {
        const gameObject = new GameObject(device);
        await gameObject.addModel(modelInfo.url, device);
        // gameObject.scale = vec3.fromValues(0.01, 0.01, 0.01);
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
            obj.position = vec3.fromValues(0.0, 0.0, 0.0);
            obj.modelMatrixBuffer = device.createBuffer({
                label: "Model Matrix Buffer",
                size: 4 * 16,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });
            obj.scale = referenceObj.scale;
            obj.bindGroup = device.createBindGroup({
                layout: bindLayouts.mainBindGroupLayout,
                entries: [
                    { binding: 0, resource: { buffer: buffers.mvpBuffer } },
                    { binding: 1, resource: { buffer: obj.modelMatrixBuffer } },
                    { binding: 2, resource: { buffer: buffers.cameraPositionBuffer } },
                    { binding: 3, resource: { buffer: buffers.globalLightDirectionBuffer } },
                    { binding: 4, resource: { buffer: pointLightObjects.pointLightPositionsBuffer } },
                    { binding: 5, resource: { buffer: pointLightObjects.pointLightColorsBuffer } },
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