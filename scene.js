import { vec3 } from "gl-matrix";
import { GameObject } from "./game-object.js";

export async function loadObjects(device, bindGroupLayout, mvpBuffer, globalLightDirectionBuffer) {
    const gameObjects = [];

    const instance_count = 1000;
    const url = "resources/chicken";
    const chickenObj = new GameObject();
    await Promise.all([
        chickenObj.addModel(url + "/model.glb", device),
        chickenObj.addTexture(url + "/albedo.jpg", device)
    ]);
    for (let i = 0; i < instance_count; i++) {
        const obj = new GameObject();
        let val = Math.random();
        let range = 100;


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
                { binding: 2, resource: chickenObj.texture.createView() },
                { binding: 3, resource: chickenObj.sampler },
                { binding: 4, resource: { buffer: globalLightDirectionBuffer } },
            ]
        });

        gameObjects.push(obj);
    }
    return gameObjects;
}