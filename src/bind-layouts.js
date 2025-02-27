
export function createBindLayouts(device) {
    const mainBindGroupLayout = device.createBindGroupLayout({
        label: "Main Bind Group Layout",
        entries: [
            { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
            { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
            { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
            { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
            { binding: 4, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
            { binding: 5, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
            { binding: 6, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
            { binding: 7, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
            { binding: 8, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
            { binding: 9, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
        ]
    });
    const skyboxBindGroupLayout = device.createBindGroupLayout({
        label: "Skybox Bind Group Layout",
        entries: [
            { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
            { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
            { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
            { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float", viewDimension: "cube" } }
        ]
    });
    const postProcessBindGroupLayout = device.createBindGroupLayout({
        label: "Post-Processing Bind Group Layout",
        entries: [
            { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
            { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
        ]
    });

    return { mainBindGroupLayout, skyboxBindGroupLayout, postProcessBindGroupLayout };

}