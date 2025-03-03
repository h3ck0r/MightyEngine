import { loadGLTFModel } from "./utils.js"
import { mat4, vec3 } from "gl-matrix";

export class GameObject {
    constructor(device) {
        this.rotation = vec3.fromValues(0, 0, 0);
        this.position = vec3.fromValues(0, 0, 0);
        this.scale = vec3.fromValues(1, 1, 1);
        this.modelMatrix = mat4.create();
        this.defaultColor = new Float32Array([1, 1, 1, 20]); // color + intensity of point light
        this.models = [];
        this.device = device;
        mat4.identity(this.modelMatrix);
    }
    async addModel(url) {
        const objs = await loadGLTFModel(url);

        for (const obj of objs) {
            const modelData = obj;

            const vertices = modelData.vertices;
            const indices = modelData.indices;
            const material = modelData.material;

            const albedoBitMap = material.map?.source.data;
            const albedoData = albedoBitMap ? this.loadTexture(albedoBitMap) : this.createDefaultTexture([200, 200, 200, 255]);

            const normalBitMap = material.normalMap?.source.data;
            const normalData = normalBitMap ? this.loadTexture(normalBitMap) : this.createDefaultTexture([128, 128, 255, 255]);

            const roughnessBitMap = material.roughnessMap?.source.data;
            const roughnessData = roughnessBitMap ? this.loadTexture(roughnessBitMap) : this.createDefaultTexture([128, 128, 128, 255]);

            const metalnessBitMap = material.metalnessMap?.source.data;
            const metalnessData = metalnessBitMap ? this.loadTexture(metalnessBitMap) : this.createDefaultTexture([0, 0, 0, 255]);

            const specularColorBitMap = material.specularColorMap?.source.data;
            const specularColorData = specularColorBitMap ? this.loadTexture(specularColorBitMap) : this.createDefaultTexture([64, 64, 64, 255]);

            const vertexBuffer = this.device.createBuffer({
                label: "Vertex Buffer",
                size: vertices.length * 4,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });
            this.device.queue.writeBuffer(vertexBuffer, 0, vertices);

            const indexBuffer = this.device.createBuffer({
                label: "Index Buffer",
                size: indices.length * 4,
                usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
            });
            this.device.queue.writeBuffer(indexBuffer, 0, indices);

            this.models.push({
                vertices,
                indices,
                albedoTexture: albedoData.texture,
                albedoSampler: albedoData.sampler,
                normalTexture: normalData.texture,
                normalSampler: normalData.sampler,
                roughnessTexture: roughnessData.texture,
                roughnessSampler: roughnessData.sampler,
                metalnessTexture: metalnessData.texture,
                metalnessSampler: metalnessData.sampler,
                specularColorTexture: specularColorData.texture,
                specularColorSampler: specularColorData.sampler,
                vertexBuffer,
                indexBuffer
            });
        }
    }

    updateTransform() {
        mat4.identity(this.modelMatrix);
        mat4.translate(this.modelMatrix, this.modelMatrix, this.position);
        mat4.rotateX(this.modelMatrix, this.modelMatrix, this.rotation[0]);
        mat4.rotateY(this.modelMatrix, this.modelMatrix, this.rotation[1]);
        mat4.rotateZ(this.modelMatrix, this.modelMatrix, this.rotation[2]);
        mat4.scale(this.modelMatrix, this.modelMatrix, this.scale);
    }
    loadTexture(bitMap) {
        const texture = this.device.createTexture({
            size: [bitMap.width, bitMap.height, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
        });
        this.device.queue.copyExternalImageToTexture(
            { source: bitMap },
            { texture: texture },
            [bitMap.width, bitMap.height, 1]
        );
        const sampler = this.device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear'
        });
        return { texture, sampler };
    }

    createDefaultTexture(color = [0, 0, 0, 255]) {
        const texture = this.device.createTexture({
            size: [1, 1, 1],
            format: "rgba8unorm",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
        });

        const textureData = new Uint8Array([color[0], color[1], color[2], color[3]]);

        this.device.queue.writeTexture(
            { texture: texture, mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            textureData,
            { bytesPerRow: 4, rowsPerImage: 1 },
            { width: 1, height: 1, depthOrArrayLayers: 1 }
        );

        const sampler = this.device.createSampler({
            magFilter: "linear",
            minFilter: "linear"
        });

        return { texture, sampler };
    }

    makeDefaultSphere(radius = 1, latSegments = 16, longSegments = 16) {
        const positions = [];
        const indices = [];
        for (let lat = 0; lat <= latSegments; lat++) {
            const theta = (lat * Math.PI) / latSegments;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let lon = 0; lon <= longSegments; lon++) {
                const phi = (lon * 2 * Math.PI) / longSegments;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);

                const x = cosPhi * sinTheta;
                const y = cosTheta;
                const z = sinPhi * sinTheta;

                positions.push(radius * x, radius * y, radius * z);
            }
        }

        for (let lat = 0; lat < latSegments; lat++) {
            for (let lon = 0; lon < longSegments; lon++) {
                const first = lat * (longSegments + 1) + lon;
                const second = first + longSegments + 1;

                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }

        const vertexData = new Float32Array(positions);
        const indexData = new Uint32Array(indices);

        const vertexBuffer = this.device.createBuffer({
            label: "Sphere Vertex Buffer",
            size: vertexData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(vertexBuffer, 0, vertexData);

        const indexBuffer = this.device.createBuffer({
            label: "Sphere Index Buffer",
            size: indexData.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(indexBuffer, 0, indexData);
        this.models.push({
            vertices: vertexData,
            indices: indexData,
            vertexBuffer,
            indexBuffer
        });

    }
    makeDefaultCube(size = 1) {
        const halfSize = size / 2;
        const positions = [

            -halfSize, -halfSize, halfSize,
            halfSize, -halfSize, halfSize,
            halfSize, halfSize, halfSize,
            -halfSize, halfSize, halfSize,

            -halfSize, -halfSize, -halfSize,
            -halfSize, halfSize, -halfSize,
            halfSize, halfSize, -halfSize,
            halfSize, -halfSize, -halfSize,

            -halfSize, halfSize, -halfSize,
            -halfSize, halfSize, halfSize,
            halfSize, halfSize, halfSize,
            halfSize, halfSize, -halfSize,

            -halfSize, -halfSize, -halfSize,
            halfSize, -halfSize, -halfSize,
            halfSize, -halfSize, halfSize,
            -halfSize, -halfSize, halfSize,

            halfSize, -halfSize, -halfSize,
            halfSize, halfSize, -halfSize,
            halfSize, halfSize, halfSize,
            halfSize, -halfSize, halfSize,

            -halfSize, -halfSize, -halfSize,
            -halfSize, -halfSize, halfSize,
            -halfSize, halfSize, halfSize,
            -halfSize, halfSize, -halfSize
        ];

        const indices = [
            0, 1, 2, 0, 2, 3,
            4, 5, 6, 4, 6, 7,
            8, 9, 10, 8, 10, 11,
            12, 13, 14, 12, 14, 15,
            16, 17, 18, 16, 18, 19,
            20, 21, 22, 20, 22, 23
        ];

        const vertexData = new Float32Array(positions);
        const indexData = new Uint32Array(indices);

        const vertexBuffer = this.device.createBuffer({
            label: "Cube Vertex Buffer",
            size: vertexData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(vertexBuffer, 0, vertexData);

        const indexBuffer = this.device.createBuffer({
            label: "Cube Index Buffer",
            size: indexData.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(indexBuffer, 0, indexData);

        this.models.push({
            vertices: vertexData,
            indices: indexData,
            vertexBuffer,
            indexBuffer
        });
    }

}