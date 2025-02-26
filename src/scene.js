import { vec3 } from "gl-matrix";
import { GameObject } from "./game-object.js";

export async function loadObjects(device, bindLayouts, buffers) {
    const gameObjects = [];

    const instance_count = 1;
    let url = "resources/chicken";
    const chickenObj = new GameObject();
    await chickenObj.addModel(url + "/model.glb", device);
    url = "resources/egg";
    const eggObj = new GameObject();
    await eggObj.addModel(url + "/model.glb", device);
    for (let i = 0; i < instance_count; i++) {

        let referenceObj = chickenObj;
        const obj = new GameObject();
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

        obj.vertexBuffer = referenceObj.vertexBuffer;
        obj.indexBuffer = referenceObj.indexBuffer;
        obj.indices = referenceObj.indices;
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
                { binding: 4, resource: referenceObj.albedoTexture.createView() },
                { binding: 5, resource: referenceObj.albedoSampler },
                { binding: 6, resource: referenceObj.normalTexture.createView() },
                { binding: 7, resource: referenceObj.normalSampler },
                { binding: 8, resource: referenceObj.roughnessTexture.createView() },
                { binding: 9, resource: referenceObj.roughnessSampler }
            ]
        });

        gameObjects.push(obj);
    }
    return gameObjects;
}