@group(0) @binding(0) var textureSampler: sampler;
@group(0) @binding(1) var textureCube: texture_cube<f32>;

struct VertexOutput {
    @builtin(position) clipPosition: vec4<f32>,
    @location(0) texCoords: vec3<f32>
};

@vertex
fn vertexMain(@location(0) position: vec3<f32>) -> VertexOutput {
    var output: VertexOutput;

    output.texCoords = position;

    output.clipPosition = vec4<f32>(position, 1.0);

    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    return textureSample(textureCube, textureSampler, normalize(input.texCoords));
}
