@group(0) @binding(0)
var<uniform> modelViewProjection: mat4x4<f32>;

@group(0) @binding(1)
var<uniform> modelMatrix: mat4x4<f32>;

@group(0) @binding(2)
var<uniform> color: vec4<f32>;

@vertex
fn vertexMain(@location(0) position: vec3<f32>) -> @builtin(position) vec4<f32> {
    let worldPos = modelMatrix * vec4<f32>(position, 1.0); 
    return modelViewProjection * worldPos; 
}

@fragment
fn fragmentMain() -> @location(0) vec4<f32> {
    return vec4<f32>(1,0.4,0.4,1); 
}
