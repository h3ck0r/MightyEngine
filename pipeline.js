export function createPipeline(device, canvasFormat, shaderModule, skyboxShaderModule, bindGroupLayout, skyboxBindGroupLayout) {
    const mainPipeline = device.createRenderPipeline({
        label: "Pipeline",
        layout: device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        }),
        vertex: {
            module: shaderModule,
            entryPoint: "vertexMain",
            buffers: [
                {
                    arrayStride: 12 * 4,
                    attributes: [
                        { format: "float32x3", offset: 0, shaderLocation: 0 },  // position
                        { format: "float32x3", offset: 12, shaderLocation: 1 }, // normal
                        { format: "float32x2", offset: 24, shaderLocation: 2 },  // uv
                        { format: "float32x4", offset: 32, shaderLocation: 3 }  // tangent
                    ]
                }
            ]
        },
        fragment: {
            module: shaderModule,
            entryPoint: "fragmentMain",
            targets: [{
                format: canvasFormat
            }]
        },

        depthStencil: {
            format: "depth24plus",
            depthWriteEnabled: true,
            depthCompare: "less"
        }
    });
    const skyboxPipeline = device.createRenderPipeline({
        label: "Skybox Pipeline",
        layout: device.createPipelineLayout({
            bindGroupLayouts: [skyboxBindGroupLayout]
        }),
        vertex: {
            module: skyboxShaderModule,
            entryPoint: "vertexMain",
            buffers: [
                {
                    arrayStride: 4 * 3,
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: "float32x3" }
                    ]
                }
            ]
        },
        fragment: {
            module: skyboxShaderModule,
            entryPoint: "fragmentMain",
            targets: [{
                format: canvasFormat
            }]
        },
        depthStencil: {
            format: "depth24plus",
            depthWriteEnabled: false,
            depthCompare: "less-equal"
        }
    });

    return { mainPipeline, skyboxPipeline };

}