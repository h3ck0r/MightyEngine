import { vec3 } from "gl-matrix";
import { GameObject } from "./game-object.js";

export async function loadObjects(device, bindGroupLayout, mvpBuffer, globalLightDirectionBuffer) {
    const gameObjects = [];

    const instance_count = 100;
    const url = "resources/chicken";
    const chickenObj = new GameObject();
    await chickenObj.addModel(url + "/model.glb", device)
    for (let i = 0; i < instance_count; i++) {
        const obj = new GameObject();
        let val = Math.random();
        let range = 20;

        obj.position = vec3.fromValues(Math.random() * range - range / 2, Math.random() * range - range / 2, Math.random() * range - range / 2);
        obj.rotation = vec3.fromValues(Math.random() * range - range / 2, Math.random() * range - range / 2, Math.random() * range - range / 2);
        obj.scale = vec3.fromValues(val, val, val)
        obj.updateTransform();

        obj.vertexBuffer = chickenObj.vertexBuffer;
        obj.indexBuffer = chickenObj.indexBuffer;
        obj.indices = chickenObj.indices;
        obj.modelUniformBuffer = device.createBuffer({
            label: "Model Matrix Buffer",
            size: 4 * 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        obj.bindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: mvpBuffer } },
                { binding: 1, resource: { buffer: obj.modelUniformBuffer } },
                { binding: 2, resource: { buffer: globalLightDirectionBuffer } },
                { binding: 3, resource: chickenObj.albedoTexture.createView() },
                { binding: 4, resource: chickenObj.albedoSampler },
                { binding: 5, resource: chickenObj.normalTexture.createView() },
                { binding: 6, resource: chickenObj.normalSampler }
            ]
        });

        gameObjects.push(obj);
    }
    return gameObjects;
}