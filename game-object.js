import { loadTexture, loadGLTFModel } from "./utils.js"
import { mat4, vec3 } from "gl-matrix";

export class GameObject {
    constructor() {
        this.rotation = vec3.fromValues(0, 0, 0);
        this.position = vec3.fromValues(0, 0, 0);
        this.scale = vec3.fromValues(1, 1, 1);
        this.modelMatrix = mat4.create();
        mat4.identity(this.modelMatrix);
    }
    async addModel(url, device) {
        const modelData = await loadGLTFModel(url);
        this.vertices = modelData.vertices;
        this.indices = modelData.indices;

        const material = modelData.material;
        const albedoBitMap = material.map.source.data;
        const normalBitMap = material.normalMap.source.data

        this.albedoTexture = device.createTexture({
            size: [albedoBitMap.width, albedoBitMap.height, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
        });
        device.queue.copyExternalImageToTexture(
            { source: albedoBitMap },
            { texture: this.albedoTexture },
            [albedoBitMap.width, albedoBitMap.height, 1]
        );
        this.albedoSampler = device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear'
        });

        this.normalTexture = device.createTexture({
            size: [normalBitMap.width, normalBitMap.height, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
        });
        device.queue.copyExternalImageToTexture(
            { source: normalBitMap },
            { texture: this.normalTexture },
            [normalBitMap.width, normalBitMap.height, 1]
        );
        this.normalSampler = device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear'
        });

        this.vertexBuffer = device.createBuffer({
            label: "Vertex Buffer",
            size: this.vertices.length * 4,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        device.queue.writeBuffer(this.vertexBuffer, 0, this.vertices);

        this.indexBuffer = device.createBuffer({
            label: "Index Buffer",
            size: this.indices.length * 4,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
        });
        device.queue.writeBuffer(this.indexBuffer, 0, this.indices);

        
    }
    updateTransform() {
        mat4.identity(this.modelMatrix);
        mat4.translate(this.modelMatrix, this.modelMatrix, this.position);
        mat4.rotateX(this.modelMatrix, this.modelMatrix, this.rotation[0]);
        mat4.rotateY(this.modelMatrix, this.modelMatrix, this.rotation[1]);
        mat4.rotateZ(this.modelMatrix, this.modelMatrix, this.rotation[2]);
        mat4.scale(this.modelMatrix, this.modelMatrix, this.scale);
    }
   
}