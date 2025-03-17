
export async function loadShaders(device) {
    const mainShaderCode = await loadShader('./shaders/main-shader.wgsl');
    const mainShaderModule = device.createShaderModule({ label: 'Main Shader', code: mainShaderCode });
    const skyboxShaderCode = await loadShader('./shaders/skybox-shader.wgsl');
    const skyboxShaderModule = device.createShaderModule({ label: 'Skybox Shader', code: skyboxShaderCode });
    const postprocessShaderCode = await loadShader('./shaders/postprocess.wgsl');
    const postProcessShaderModule = device.createShaderModule({ label: 'Postprocess Shader', code: postprocessShaderCode });
    const pointLightShaderCode = await loadShader('./shaders/point-light.wgsl');
    const pointLightShaderModule = device.createShaderModule({ label: 'Point Light Shader', code: pointLightShaderCode });
    const bloomShaderCode = await loadShader('./shaders/bloom.wgsl');
    const bloomShaderModule = device.createShaderModule({ label: 'Bloom Shader', code: bloomShaderCode });
    return {
        mainShaderModule,
        skyboxShaderModule,
        postProcessShaderModule,
        pointLightShaderModule,
        bloomShaderModule
    };
}

async function loadShader(url) {
    const response = await fetch(url);
    return await response.text();
}