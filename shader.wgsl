struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>, 
}

@vertex
fn vertexMain(@location(0) position: vec2f, @location(1) color: vec4f) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4<f32>(position, 0.0,1.0);
    output.color = color;
    return output;
}

@fragment
fn fragmentMain(@location(0) color: vec4<f32>) -> @location(0) vec4<f32> {
    return color; 
}
