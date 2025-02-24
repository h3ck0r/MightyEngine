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
        const { vertices, indices } = await loadGLTFModel(url);
        this.vertices = vertices;
        this.indices = indices;

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
    async addAlbedo(url, device) {
        const { texture, sampler } = await loadTexture(device, url);
        this.albedoTexture = texture;
        this.albedoSampler = sampler;
    }
    async addNormal(url, device) {
        const { texture, sampler } = await loadTexture(device, url);
        this.normalTexture = texture;
        this.normalSampler = sampler;
    }
}