export function createPipeline(device, canvasFormat, shaderModules, bindLayouts) {
    const mainPipeline = device.createRenderPipeline({
        label: "Pipeline",
        layout: device.createPipelineLayout({
            bindGroupLayouts: [bindLayouts.mainBindGroupLayout]
        }),
        vertex: {
            module: shaderModules.mainShaderModule,
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
            module: shaderModules.mainShaderModule,
            entryPoint: "fragmentMain",
            targets: [{
                format: canvasFormat,
                blend: {
                    color: {
                        srcFactor: "src-alpha",
                        dstFactor: "one-minus-src-alpha",
                        operation: "add"
                    },
                    alpha: {
                        srcFactor: "one",
                        dstFactor: "one-minus-src-alpha",
                        operation: "add"
                    }
                }
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
            bindGroupLayouts: [bindLayouts.skyboxBindGroupLayout]
        }),
        vertex: {
            module: shaderModules.skyboxShaderModule,
            entryPoint: "vertexMain",
            buffers: [
                {
                    arrayStride: 3 * 4,
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: "float32x3" }
                    ]
                }
            ]
        },
        fragment: {
            module: shaderModules.skyboxShaderModule,
            entryPoint: "fragmentMain",
            targets: [{
                format: canvasFormat,
                
            }]
        },
        depthStencil: {
            format: "depth24plus",
            depthWriteEnabled: false,
            depthCompare: "less-equal"
        }
    });
    const postProcessPipeline = device.createRenderPipeline({
        label: "Post-Processing Pipeline",
        layout: device.createPipelineLayout({
            bindGroupLayouts: [bindLayouts.postProcessBindGroupLayout]
        }),
        vertex: {
            module: shaderModules.postProcessShaderModule,
            entryPoint: "vertexMain",
            buffers: []
        },
        fragment: {
            module: shaderModules.postProcessShaderModule,
            entryPoint: "fragmentMain",
            targets: [{
                format: canvasFormat
            }]
        }
    });

    const pointLightPipeline = device.createRenderPipeline({
        label: "Point Light Pipeline",
        layout: device.createPipelineLayout({
            bindGroupLayouts: [bindLayouts.pointLightBindGroupLayout]
        }),
        vertex: {
            module: shaderModules.pointLightShaderModule,
            entryPoint: "vertexMain",
            buffers: [
                {
                    arrayStride: 3 * 4,
                    attributes: [
                        { format: "float32x3", offset: 0, shaderLocation: 0 }
                    ]
                }
            ]
        },
        fragment: {
            module: shaderModules.pointLightShaderModule,
            entryPoint: "fragmentMain",
            targets: [{
                format: canvasFormat
            }]
        },
        depthStencil: {
            format: "depth24plus",
            depthWriteEnabled: false,
            depthCompare: "less"
        }
    });

    const bloomPipeline = device.createRenderPipeline({
        label: "Bloom  Pipeline",
        layout: device.createPipelineLayout({
            bindGroupLayouts: [bindLayouts.bloomBindGroupLayout]
        }),
        vertex: {
            module: shaderModules.postProcessShaderModule,
            entryPoint: "vertexMain",
            buffers: []
        },
        fragment: {
            module: shaderModules.bloomShaderModule,
            entryPoint: "bloomMain",
            targets: [{ format: canvasFormat }]
        }
    });
    const blurVPipeline = device.createRenderPipeline({
        label: "Bloom  Pipeline",
        layout: device.createPipelineLayout({
            bindGroupLayouts: [bindLayouts.bloomBindGroupLayout]
        }),
        vertex: {
            module: shaderModules.postProcessShaderModule,
            entryPoint: "vertexMain",
            buffers: []
        },
        fragment: {
            module: shaderModules.bloomShaderModule,
            entryPoint: "blurVMain",
            targets: [{ format: canvasFormat }]
        }
    });
    const blurHPipeline = device.createRenderPipeline({
        label: "Bloom  Pipeline",
        layout: device.createPipelineLayout({
            bindGroupLayouts: [bindLayouts.bloomBindGroupLayout]
        }),
        vertex: {
            module: shaderModules.postProcessShaderModule,
            entryPoint: "vertexMain",
            buffers: []
        },
        fragment: {
            module: shaderModules.bloomShaderModule,
            entryPoint: "blurHMain",
            targets: [{ format: canvasFormat }]
        }
    });

    return {
        mainPipeline,
        skyboxPipeline,
        postProcessPipeline,
        pointLightPipeline,
        bloomPipeline,
        blurVPipeline,
        blurHPipeline,
    };

}