const NUM_POINT_LIGHTS: u32 = 1;

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
var<uniform> lightDirection: vec4<f32>;

@group(0) @binding(4)
var<uniform> pointLightPositions: array<vec4<f32>, NUM_POINT_LIGHTS>;
@group(0) @binding(5)
var<uniform> pointLightColors: array<vec4<f32>, NUM_POINT_LIGHTS>;

@group(0) @binding(6)
var textureImage: texture_2d<f32>;
@group(0) @binding(7)
var samplerLoader: sampler;

@group(0) @binding(8)
var normalImage: texture_2d<f32>;
@group(0) @binding(9)
var normalLoader: sampler;

@group(0) @binding(10)
var roughnessImage: texture_2d<f32>;
@group(0) @binding(11)
var roughnessLoader: sampler;

@group(0) @binding(12)
var metalnessImage: texture_2d<f32>;
@group(0) @binding(13)
var metalnessLoader: sampler;

@group(0) @binding(14)
var specularColorImage: texture_2d<f32>;
@group(0) @binding(15)
var specularColorLoader: sampler;

@group(0) @binding(16)
var<uniform> materialAttributesBuffer: vec4<f32>;

@group(0) @binding(17)
var<uniform> graphicsSettings: vec4<u32>;

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
@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    let texColor = textureSample(textureImage, samplerLoader, input.fragUV);
    let normalSample = textureSample(normalImage, normalLoader, input.fragUV).rgb * 2.0 - 1.0;
    let roughnessSample = textureSample(roughnessImage, roughnessLoader, input.fragUV);
    let metalness = textureSample(metalnessImage, metalnessLoader, input.fragUV).g;
    let specularColor = textureSample(specularColorImage, specularColorLoader, input.fragUV).rgb;

    let roughness = roughnessSample.g;
    let ao = roughnessSample.r;

    if (texColor.a < 0.1) {
        discard;
    }

    let TBN = mat3x3<f32>(input.fragTangent, input.fragBitangent, input.fragNormal);
    let mappedNormal = normalize(TBN * normalSample);

    let viewDir = normalize(cameraPosition - input.worldPos);

    var finalColor = vec3<f32>(0,0,0);
    if(graphicsSettings.r == 0){
        finalColor = computeAnimeLighting(mappedNormal, viewDir, input.worldPos, texColor.rgb, roughness, metalness, specularColor, ao);
    }
    else if(graphicsSettings.r == 1){
        finalColor = computeLighting(mappedNormal, viewDir, input.worldPos, texColor.rgb, roughness, metalness, specularColor, ao);
    }
    return vec4<f32>(finalColor, texColor.a*materialAttributesBuffer.r);
}
fn computeAnimeLighting(N: vec3<f32>, V: vec3<f32>, worldPos: vec3<f32>, baseColor: vec3<f32>, ao: f32, metalness: f32, specularColor: vec3<f32>, roughness: f32) -> vec3<f32> {
    var result: vec3<f32> = vec3<f32>(0.0);
    
    let L_dir = normalize(lightDirection.rgb);
    let NdotL = dot(N, L_dir);

    let lightSize = 0.7; 
    let lightEdge = max(0.0, 1.0 - max(NdotL, 0.0) / lightSize);  
    let shadowColor = vec3<f32>(1, 0.1, 0.1);  
    
    let lightIntensity = clamp(lightEdge * 0.9 + 0.9, 0.6, 1.0); 
    let finalColor = mix(shadowColor, baseColor, lightIntensity);

    result += finalColor * lightDirection.a;

    return clamp(result * ao, vec3<f32>(0.0), vec3<f32>(1.0)); 
}


fn computeLighting(N: vec3<f32>, V: vec3<f32>, worldPos: vec3<f32>, baseColor: vec3<f32>, roughness: f32, metalness: f32, specularColor: vec3<f32>, ao: f32) -> vec3<f32> {
     var result: vec3<f32> = vec3<f32>(0.0);
 
     let dielectricF0 = vec3<f32>(0.04);
     let aoFactor = mix(vec3<f32>(1.0), vec3<f32>(ao), metalness);
     let F0 = mix(dielectricF0, specularColor, metalness) * aoFactor;
 
     let L_dir = normalize(lightDirection.rgb);
     let H_dir = normalize(V + L_dir);
     let NDF_dir = distributionGGX(N, H_dir, roughness);
     let G_dir = geometrySmith(N, V, L_dir, roughness);
     let fresnel_dir = fresnelSchlick(max(dot(N, V), 0.0), F0);
 
     let numerator_dir = NDF_dir * G_dir * fresnel_dir;
     let denominator_dir = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L_dir), 0.0) + 0.0001;
     let specular_dir = numerator_dir / denominator_dir*ao;
 
     let kD_dir = vec3<f32>(1.0) - fresnel_dir;
     let diffuse_dir = kD_dir * baseColor * max(dot(N, L_dir), 0.0) * ao;
 
     result += (diffuse_dir + specular_dir) * lightDirection.a;
 
     for (var i: u32 = 0; i < NUM_POINT_LIGHTS; i = i + 1) {
         let lightPos = pointLightPositions[i];
         let lightColor = pointLightColors[i];
         let lightIntensity = lightColor.a;
 
         let L = normalize(lightPos.rgb - worldPos);
         let H = normalize(V + L);
         let distance = length(lightPos.rgb - worldPos);
         let attenuation = 1.0 / (distance * distance);
         let NdotL = max(dot(N, L), 0.0);
 
         let NDF = distributionGGX(N, H, roughness);
         let G = geometrySmith(N, V, L, roughness);
         let fresnel = fresnelSchlick(max(dot(N, V), 0.0), F0);
 
         let numerator = NDF * G * fresnel;
         let denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
         let specular = (numerator / denominator) * lightColor.rgb * lightIntensity * attenuation*ao;
 
         let kD = vec3<f32>(1.0) - fresnel;
         let diffuse = kD * baseColor * NdotL * attenuation * lightColor.rgb * lightIntensity*ao;
 
         result += diffuse + specular;
     }
 
     return result;
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

