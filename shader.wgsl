struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) fragUV: vec2<f32>,
    @location(1) fragNormal: vec3<f32>,
    @location(2) fragTangent: vec3<f32>,
    @location(3) fragBitangent: vec3<f32>,
};

@group(0) @binding(0)
var<uniform> modelViewProjection: mat4x4<f32>;

@group(0) @binding(1)
var<uniform> modelMatrix: mat4x4<f32>;  

@group(0) @binding(2)
var<uniform> lightDirection: vec3<f32>;

@group(0) @binding(3)
var textureImage: texture_2d<f32>;

@group(0) @binding(4)
var samplerLoader: sampler;

@group(0) @binding(5)
var normalImage: texture_2d<f32>;

@group(0) @binding(6)
var normalLoader: sampler;


@vertex
fn vertexMain(
    @location(0) position: vec3<f32>, 
    @location(1) normal: vec3<f32>, 
    @location(2) uv: vec2<f32>,
    @location(3) tangent: vec4<f32>,
) -> VertexOutput {
    var output: VertexOutput;
    output.position = modelViewProjection * modelMatrix * vec4<f32>(position, 1.0);
    output.fragUV = uv;
    output.fragNormal = normalize((modelMatrix * vec4<f32>(normal, 0.0)).xyz); 
    
    let T = normalize((modelMatrix * vec4(tangent.xyz, 0.0)).xyz);
    let B = normalize(cross(output.fragNormal, T) * tangent.w); 
    output.fragTangent = T;
    output.fragBitangent = B;
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    let texColor = textureSample(textureImage, samplerLoader, input.fragUV);
    
    let normalSample = textureSample(normalImage, normalLoader, input.fragUV).rgb * 2.0 - 1.0;
    
    let TBN = mat3x3<f32>(input.fragTangent, input.fragBitangent, input.fragNormal);
    let mappedNormal = normalize(TBN * normalSample);
    
    let lightDir = normalize(lightDirection);
    let diffuse = max(dot(mappedNormal, lightDir), 0.0);
    
    return vec4<f32>(texColor.rgb * diffuse, texColor.a);
}

