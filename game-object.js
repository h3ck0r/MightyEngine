import { loadGLTFModel } from "./utils.js"
import { mat4, vec3 } from "gl-matrix";
import * as THREE from 'three';

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

        const albedoBitMap = material.map?.source.data;
        const albedoData = albedoBitMap ? this.loadTexture(device, albedoBitMap) : this.createDefaultTexture(device, [255, 255, 255, 255]);
        this.albedoTexture = albedoData.texture;
        this.albedoSampler = albedoData.sampler;

        const normalBitMap = material.normalMap?.source.data;
        const normalData = normalBitMap ? this.loadTexture(device, normalBitMap) : this.createDefaultTexture(device, [128, 128, 255, 255]);
        this.normalTexture = normalData.texture;
        this.normalSampler = normalData.sampler;

        const roughnessBitMap = material.roughnessMap?.source.data;
        const roughnessData = roughnessBitMap ? this.loadTexture(device, roughnessBitMap) : this.createDefaultTexture(device, [255, 255, 255, 255]);
        this.roughnessTexture = roughnessData.texture;
        this.roughnessSampler = roughnessData.sampler;

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
    loadTexture(device, bitMap) {
        const texture = device.createTexture({
            size: [bitMap.width, bitMap.height, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
        });
        device.queue.copyExternalImageToTexture(
            { source: bitMap },
            { texture: texture },
            [bitMap.width, bitMap.height, 1]
        );
        const sampler = device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear'
        });
        return { texture, sampler };
    }
    createDefaultTexture(device, color) {
        const texture = device.createTexture({
            size: [1, 1, 1],
            format: "rgba8unorm",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
        });

        const textureData = new Uint8Array(color);
        device.queue.writeTexture(
            { texture: texture, mipLevel: 0, origin: [0, 0, 0] },
            textureData,
            { bytesPerRow: 4, rowsPerImage: 1 },
            [1, 1, 1]
        );

        const sampler = device.createSampler({
            magFilter: "linear",
            minFilter: "linear"
        });

        return { texture, sampler };
    }
}