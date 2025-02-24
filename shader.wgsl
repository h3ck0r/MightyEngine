struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) fragUV: vec2<f32>,
    @location(1) fragNormal: vec3<f32>,
    @location(2) fragTangent: vec3<f32>,
    @location(3) fragBitangent: vec3<f32>,
    @location(4) worldPos: vec3<f32>,
};

@group(0) @binding(0)
var<uniform> modelViewProjection: mat4x4<f32>;

@group(0) @binding(1)
var<uniform> modelMatrix: mat4x4<f32>;  

@group(0) @binding(2)
var<uniform> cameraPosition: vec3<f32>;

@group(0) @binding(3)
var<uniform> lightDirection: vec3<f32>;

@group(0) @binding(4)
var textureImage: texture_2d<f32>;

@group(0) @binding(5)
var samplerLoader: sampler;

@group(0) @binding(6)
var normalImage: texture_2d<f32>;

@group(0) @binding(7)
var normalLoader: sampler;

@group(0) @binding(8)
var roughnessImage: texture_2d<f32>;

@group(0) @binding(9)
var roughnessLoader: sampler;


@vertex
fn vertexMain(
    @location(0) position: vec3<f32>, 
    @location(1) normal: vec3<f32>, 
    @location(2) uv: vec2<f32>,
    @location(3) tangent: vec4<f32>,
) -> VertexOutput {
    var output: VertexOutput;
    let worldPos = (modelMatrix * vec4<f32>(position, 1.0)).xyz;
    
    output.position = modelViewProjection * vec4<f32>(worldPos, 1.0);
    output.fragUV = uv;
    output.fragNormal = normalize((modelMatrix * vec4<f32>(normal, 0.0)).xyz);
    output.worldPos = worldPos;

    let T = normalize((modelMatrix * vec4(tangent.xyz, 0.0)).xyz);
    let B = normalize(cross(output.fragNormal, T) * tangent.w);
    
    output.fragTangent = T;
    output.fragBitangent = B;

    return output;
}

fn distributionGGX(N: vec3<f32>, H: vec3<f32>, roughness: f32) -> f32 {
    let a = roughness * roughness;
    let a2 = a * a;
    let NdotH = max(dot(N, H), 0.0);
    let NdotH2 = NdotH * NdotH;

    let num = a2;
    let denom = (NdotH2 * (a2 - 1.0) + 1.0);
    
    return num / (3.14159265358979323846 * denom * denom);
}

fn fresnelSchlick(cosTheta: f32, F0: vec3<f32>) -> vec3<f32> {
    return F0 + (vec3<f32>(1.0) - F0) * pow(1.0 - cosTheta, 5.0);
}

fn geometrySchlickGGX(NdotV: f32, roughness: f32) -> f32 {
    let r = (roughness + 1.0);
    let k = (r * r) / 8.0;
    return NdotV / (NdotV * (1.0 - k) + k);
}

fn geometrySmith(N: vec3<f32>, V: vec3<f32>, L: vec3<f32>, roughness: f32) -> f32 {
    let NdotV = max(dot(N, V), 0.0);
    let NdotL = max(dot(N, L), 0.0);
    return geometrySchlickGGX(NdotV, roughness) * geometrySchlickGGX(NdotL, roughness);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    let texColor = textureSample(textureImage, samplerLoader, input.fragUV);
    let normalSample = textureSample(normalImage, normalLoader, input.fragUV).rgb * 2.0 - 1.0;
    let roughness = textureSample(roughnessImage, roughnessLoader, input.fragUV).g;
    
    let TBN = mat3x3<f32>(input.fragTangent, input.fragBitangent, input.fragNormal);
    let mappedNormal = normalize(TBN * normalSample);

    let lightDir = normalize(lightDirection);
    let viewDir = normalize(cameraPosition - input.worldPos);
    let halfwayDir = normalize(lightDir + viewDir);

    let F0 = vec3<f32>(0.04);
    
    let NDF = distributionGGX(mappedNormal, halfwayDir, roughness);
    let G = geometrySmith(mappedNormal, viewDir, lightDir, roughness);
    let fresnel = fresnelSchlick(max(dot(mappedNormal, viewDir), 0.0), F0);
    
    let numerator = NDF * G * fresnel;
    let denominator = 4.0 * max(dot(mappedNormal, viewDir), 0.0) * max(dot(mappedNormal, lightDir), 0.0) + 0.0001;
    let specular = numerator / denominator;

    let kD = vec3<f32>(1.0) - fresnel;
    let diffuse = kD * texColor.rgb * max(dot(mappedNormal, lightDir), 0.0);

    let finalColor = diffuse + specular;

    return vec4<f32>(finalColor, texColor.a);
}
