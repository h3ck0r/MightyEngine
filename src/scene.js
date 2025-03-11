import { vec3 } from "gl-matrix";
import { GameObject } from "./game-object.js";
import { loadCubemapTexture } from "./utils.js"

export class Scene {
    constructor(device, bindLayouts, buffers) {
        this.device = device;
        this.bindLayouts = bindLayouts;
        this.buffers = buffers;
        this.gameObjects = [];
        this.pointLightObjects = [];
        this.pointLightPositionsBuffer = null;
        this.pointLightColorsBuffer = null;
        this.skyboxBuffer = null;
        this.skyboxIndexBuffer = null;
        this.skyboxBindGroup = null;
    }

    async loadObjects() {
        for (const objectData of this.sceneConfig.objects) {
            const parentObj = new GameObject(this.device);
            await parentObj.addModel(objectData.model);
            if (!parentObj.models || parentObj.models.length === 0) {
                console.warn(`No models loaded for ${objectData.path}`);
                continue;
            }

            for (const model of parentObj.models) {
                const obj = new GameObject(this.device);
                obj.position = vec3.fromValues(...objectData.position);
                obj.rotation = vec3.fromValues(...objectData.rotation);
                obj.scale = vec3.fromValues(...objectData.scale);

                obj.name = model.name;
                obj.vertexBuffer = model.vertexBuffer;
                obj.indexBuffer = model.indexBuffer;
                obj.indices = model.indices;
                obj.isTransparent = model.isTransparent;

                obj.modelMatrixBuffer = this.device.createBuffer({
                    label: "Model Matrix Buffer",
                    size: 4 * 16,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                });


                obj.bindGroup = this.device.createBindGroup({
                    layout: this.bindLayouts.mainBindGroupLayout,
                    entries: [
                        { binding: 0, resource: { buffer: this.buffers.mvpBuffer } },
                        { binding: 1, resource: { buffer: obj.modelMatrixBuffer } },
                        { binding: 2, resource: { buffer: this.buffers.cameraPositionBuffer } },
                        { binding: 3, resource: { buffer: this.buffers.globalLightDirectionBuffer } },
                        { binding: 4, resource: { buffer: this.pointLightPositionsBuffer } },
                        { binding: 5, resource: { buffer: this.pointLightColorsBuffer } },
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
                        { binding: 16, resource: { buffer: model.materialAttributesBuffer } }
                    ]
                });

                this.gameObjects.push(obj);
            }

        }
    }

    async loadPointLightObjects() {
        for (const lightData of this.sceneConfig.lights) {
            const obj = new GameObject(this.device);
            obj.makeDefaultSphere();
            for (const model of obj.models) {
                obj.position = vec3.fromValues(...lightData.position);
                obj.scale = vec3.fromValues(0.5, 0.5, 0.5);

                obj.vertexBuffer = model.vertexBuffer;
                obj.indexBuffer = model.indexBuffer;
                obj.indices = model.indices;

                obj.modelMatrixBuffer = this.device.createBuffer({
                    label: "Model Matrix Buffer",
                    size: 4 * 16,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                });

                obj.colorBuffer = this.device.createBuffer({
                    label: "Point Light Color Buffer",
                    size: 4 * 4,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                });
                this.device.queue.writeBuffer(obj.colorBuffer, 0, new Float32Array(lightData.color));

                obj.bindGroup = this.device.createBindGroup({
                    layout: this.bindLayouts.pointLightBindGroupLayout,
                    entries: [
                        { binding: 0, resource: { buffer: this.buffers.mvpBuffer } },
                        { binding: 1, resource: { buffer: obj.modelMatrixBuffer } },
                        { binding: 2, resource: { buffer: obj.colorBuffer } }
                    ]
                });

                this.pointLightObjects.push(obj);
            }
        }

        this.pointLightPositionsBuffer = this.device.createBuffer({
            label: "Point Light Positions",
            size: this.pointLightObjects.length * 4 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.pointLightColorsBuffer = this.device.createBuffer({
            label: "Point Light Colors",
            size: this.pointLightObjects.length * 4 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
    }

    async loadSkybox() {
        const skyboxVertices = new Float32Array([
            -1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1, // Back
            -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1, // Front
            -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1, // Top
            -1, -1, 1, 1, -1, 1, 1, -1, -1, -1, -1, -1, // Bottom
            1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, -1, // Right
            -1, -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1 // Left
        ]);

        this.skyboxBuffer = this.device.createBuffer({
            size: skyboxVertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.skyboxBuffer, 0, skyboxVertices);

        const skyboxIndices = new Uint16Array([
            0, 1, 2, 2, 3, 0,
            4, 5, 6, 6, 7, 4,
            8, 9, 10, 10, 11, 8,
            12, 13, 14, 14, 15, 12,
            16, 17, 18, 18, 19, 16,
            20, 21, 22, 22, 23, 20
        ]);

        this.skyboxIndexBuffer = this.device.createBuffer({
            size: skyboxIndices.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.skyboxIndexBuffer, 0, skyboxIndices);
        const skyboxImages = [
            this.sceneConfig.skybox.texture + "/right.jpg",
            this.sceneConfig.skybox.texture + "/left.jpg",
            this.sceneConfig.skybox.texture + "/top.jpg",
            this.sceneConfig.skybox.texture + "/bottom.jpg",
            this.sceneConfig.skybox.texture + "/front.jpg",
            this.sceneConfig.skybox.texture + "/back.jpg"
        ];

        const skyboxTexture = await loadCubemapTexture(this.device, skyboxImages);
        const sampler = this.device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
        });
        this.skyboxBindGroup = this.device.createBindGroup({
            layout: this.bindLayouts.skyboxBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.buffers.mvpBuffer } },
                { binding: 1, resource: { buffer: this.buffers.cameraPositionBuffer } },
                { binding: 2, resource: sampler },
                { binding: 3, resource: skyboxTexture.createView({ dimension: "cube" }) }
            ]
        });

    }

    async loadScene(configFilePath) {
        try {
            const response = await fetch(configFilePath);
            if (!response.ok) throw new Error(`Failed to load scene config: ${response.statusText}`);

            this.sceneConfig = await response.json();

            await this.loadPointLightObjects();
            await this.loadObjects();
            await this.loadSkybox();

        } catch (error) {
            console.error("Error loading scene:", error);
        }
    }

}




