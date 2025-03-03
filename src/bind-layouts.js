
export function createBindLayouts(device) {
    const mainBindGroupLayout = device.createBindGroupLayout({
        label: "Main Bind Group Layout",
        entries: [
            { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } }, // mvp
            { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } }, // model matrix
            { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } }, // camera position
            { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } }, // light dir
            { binding: 4, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } }, // point lights position
            { binding: 5, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } }, // point lights color
            { binding: 6, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } }, // point lights intensity
            { binding: 7, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } }, // albedo
            { binding: 8, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
            { binding: 9, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } }, // normal
            { binding: 10, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
            { binding: 11, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } }, // roughness
            { binding: 12, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
            { binding: 13, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } }, // metalic
            { binding: 14, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
            { binding: 15, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } }, // specular
            { binding: 16, visibility: GPUShaderStage.FRAGMENT, sampler: {} },

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
    const pointLightBindGroupLayout = device.createBindGroupLayout({
        label: "Point Light Bind Group Layout",
        entries: [
            { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
            { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
            { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } }
        ]
    });


    return { mainBindGroupLayout, skyboxBindGroupLayout, postProcessBindGroupLayout, pointLightBindGroupLayout };

}