export function createPipeline(device, canvasFormat, shaderModule, bindGroupLayout) {
    return device.createRenderPipeline({
        label: "Pipeline",
        layout: device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        }),
        vertex: {
            module: shaderModule,
            entryPoint: "vertexMain",
            buffers: [
                {
                    arrayStride: 8 * 4,
                    attributes: [
                        { format: "float32x3", offset: 0, shaderLocation: 0 },  // position
                        { format: "float32x3", offset: 12, shaderLocation: 1 }, // normal
                        { format: "float32x2", offset: 24, shaderLocation: 2 }  // uv
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
    })
}