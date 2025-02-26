@group(0) @binding(0)
var<uniform> viewProjection: mat4x4<f32>;
@group(0) @binding(1)
var<uniform> cameraPosition: vec3<f32>;
@group(0) @binding(2) 
var textureSampler: sampler;
@group(0) @binding(3)
var textureCube: texture_cube<f32>;

struct VertexOutput {
    @builtin(position) clipPosition: vec4<f32>,
    @location(0) texCoords: vec3<f32>
};

@vertex
fn vertexMain(@location(0) position: vec3<f32>) -> VertexOutput {
    var output: VertexOutput;
    
    var modelMatrix: mat4x4<f32> = mat4x4<f32>(
        vec4<f32>(1.0, 0.0, 0.0, 0.0),
        vec4<f32>(0.0, 1.0, 0.0, 0.0),
        vec4<f32>(0.0, 0.0, 1.0, 0.0),
        vec4<f32>(cameraPosition, 1.0)
    );
    
    output.texCoords = position;
    output.clipPosition = viewProjection * modelMatrix * vec4<f32>(position, 1.0);
    
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    return textureSample(textureCube, textureSampler, normalize(input.texCoords));
}
