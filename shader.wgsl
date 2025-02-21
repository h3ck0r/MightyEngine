struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>
}

@group(0) @binding(0)
var<uniform> modelViewProjection: mat4x4<f32>;


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
    return vec4<f32>(input.normal, 1.0);
}

