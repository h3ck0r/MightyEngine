struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>
}

@group(0) @binding(0)
var<uniform> modelViewProjection: mat4x4<f32>;
@group(0) @binding(1)
var textureImage: texture_2d<f32>;
@group(0) @binding(2)
var samplerLoader: sampler;

@vertex
fn vertexMain(@location(0) position: vec3<f32>, 
              @location(1) normal: vec3<f32>, 
              @location(2) uv: vec2<f32>) -> VertexOutput {
    var output: VertexOutput;
    output.position = modelViewProjection * vec4<f32>(position, 1.0);
    output.normal = normal;
    output.uv = uv;
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    let lightDir = normalize(vec3<f32>(3.0, 4.0, -1.0)); 

    let diffuse = max(dot(input.normal, lightDir), 0.0); 

    let texColor = textureSample(textureImage, samplerLoader, input.uv);

    return vec4<f32>(texColor.rgb * diffuse, texColor.a);
}
