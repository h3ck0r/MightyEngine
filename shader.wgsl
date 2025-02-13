struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) color: vec4<f32>, 
}

@group(0) @binding(0)
var<uniform> modelViewProjection: mat4x4<f32>;


@vertex
fn vertexMain(@location(0) position: vec3<f32>, @location(1) color: vec3<f32>) -> VertexOutput {
    var output: VertexOutput;
    output.clip_position = modelViewProjection * vec4<f32>(position, 1.0);
    output.color = vec4<f32>(color, 1.0);
    return output;
}

@fragment
fn fragmentMain(@location(0) color: vec4<f32>) -> @location(0) vec4<f32> {
    return color; 
}
