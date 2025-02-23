import { loadTexture, loadGLTFModel } from "./utils.js"
import { mat4, vec3 } from "gl-matrix";

export class GameObject {
    constructor(device) {
        this.device = device;
        this.rotation = vec3.fromValues(0, 0, 0);
        this.position = vec3.fromValues(0, 0, 0);
        this.scale = vec3.fromValues(1, 1, 1);
        this.modelMatrix = mat4.create();
        mat4.identity(this.modelMatrix);
    }
    async addModel(url) {
        const { vertices, indices } = await loadGLTFModel(url);
        this.vertices = vertices;
        this.indices = indices;
    }
    updateTransform() {
        mat4.identity(this.modelMatrix);
        mat4.translate(this.modelMatrix, this.modelMatrix, this.position);
        mat4.rotateX(this.modelMatrix, this.modelMatrix, this.rotation[0]);
        mat4.rotateY(this.modelMatrix, this.modelMatrix, this.rotation[1]);
        mat4.rotateZ(this.modelMatrix, this.modelMatrix, this.rotation[2]);
        mat4.scale(this.modelMatrix, this.modelMatrix, this.scale);
    }
    async addTexture(url) {
        const { texture, sampler } = await loadTexture(this.device, url);
        this.texture = texture;
        this.sampler = sampler;
    }
}