@group(0) @binding(0) 
var sceneTexture: texture_2d<f32>;
@group(0) @binding(1) 
var sceneSampler: sampler;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>
};

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    let pos = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>( 3.0, -1.0),
        vec2<f32>(-1.0,  3.0)
    );

    let uv = array<vec2<f32>, 3>(
        vec2<f32>(0.0, 0.0),
        vec2<f32>(2.0, 0.0),
        vec2<f32>(0.0, 2.0)
    );

    var output: VertexOutput;
    output.position = vec4<f32>(pos[vertexIndex], 0.0, 1.0);
    output.uv = vec2<f32>(uv[vertexIndex].x, 1.0 - uv[vertexIndex].y);

    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    // let uvWarped = crtWarp(input.uv);
    // var color = textureSample(sceneTexture, sceneSampler, input.uv).rgb;
    var color = chromaticAberration(input.uv,0.0003);
    // color += motionBlur(input.uv);
    // color = applyExposure(color);
    color = stylizedShadows(color);
    // color = scanlines(input.uv, color);
    // color = scanlines2(input.uv, color);
    color += randomNoise(input.uv) * 0.05; 
    color = posterize(color, 12);
    color = vignette(input.uv, color);
    // color += invertColor(color)*0.00001;

    return vec4<f32>(color, 1.0);
}


//  ▄█    █▄   ▄█     ▄████████ ███    █▄     ▄████████  ▄█               ▄████████    ▄█    █▄       ▄████████ ████████▄     ▄████████    ▄████████    ▄████████ 
// ███    ███ ███    ███    ███ ███    ███   ███    ███ ███              ███    ███   ███    ███     ███    ███ ███   ▀███   ███    ███   ███    ███   ███    ███ 
// ███    ███ ███▌   ███    █▀  ███    ███   ███    ███ ███              ███    █▀    ███    ███     ███    ███ ███    ███   ███    █▀    ███    ███   ███    █▀  
// ███    ███ ███▌   ███        ███    ███   ███    ███ ███              ███         ▄███▄▄▄▄███▄▄   ███    ███ ███    ███  ▄███▄▄▄      ▄███▄▄▄▄██▀   ███        
// ███    ███ ███▌ ▀███████████ ███    ███ ▀███████████ ███            ▀███████████ ▀▀███▀▀▀▀███▀  ▀███████████ ███    ███ ▀▀███▀▀▀     ▀▀███▀▀▀▀▀   ▀███████████ 
// ███    ███ ███           ███ ███    ███   ███    ███ ███                     ███   ███    ███     ███    ███ ███    ███   ███    █▄  ▀███████████          ███ 
// ███    ███ ███     ▄█    ███ ███    ███   ███    ███ ███▌    ▄         ▄█    ███   ███    ███     ███    ███ ███   ▄███   ███    ███   ███    ███    ▄█    ███ 
//  ▀██████▀  █▀    ▄████████▀  ████████▀    ███    █▀  █████▄▄██       ▄████████▀    ███    █▀      ███    █▀  ████████▀    ██████████   ███    ███  ▄████████▀  
//                                                      ▀                                                                                 ███    ███              


fn applyExposure(color: vec3<f32>) -> vec3<f32> {
    return color * 2;
}
fn extractBright(color: vec3<f32>) -> vec3<f32> {
    return max(color - vec3<f32>(0.7, 0.7, 0.7), vec3<f32>(0.0));
}
fn vignette(uv: vec2<f32>, color: vec3<f32>) -> vec3<f32> {
    let d = length(uv - vec2<f32>(0.5, 0.5)) * 1.2; 
    let vignetteFactor = clamp(1.0 - d * d, 0.2, 1.0); 
    return color * vignetteFactor;
}
fn chromaticAberration(uv: vec2<f32>, intensity: f32) -> vec3<f32> {
    let r = textureSample(sceneTexture, sceneSampler, uv + vec2<f32>(intensity, 0.0)).r;
    let g = textureSample(sceneTexture, sceneSampler, uv - vec2<f32>(intensity, 0.0)).g;
    let b = textureSample(sceneTexture, sceneSampler, uv).b;
    return vec3<f32>(r, g, b);
}
fn randomNoise(uv: vec2<f32>) -> f32 {
    return fract(sin(dot(uv, vec2<f32>(12.9898, 78.233))) * 43758.5453);
}
fn invertColor(color: vec3<f32>) -> vec3<f32> {
    return vec3<f32>(1.0) - color; 
}
fn scanlines(uv: vec2<f32>, color: vec3<f32>) -> vec3<f32> {
    let scanline = sin(uv.y * 800.0) * 0.05; 
    return color * (1.0 - scanline);
}
fn scanlines2(uv: vec2<f32>, color: vec3<f32>) -> vec3<f32> {
    let scanline = cos(uv.y * 800.0) * 0.05; 
    return color * (1.0 - scanline);
}
fn posterize(color: vec3<f32>, levels: f32) -> vec3<f32> {
    return floor(color * levels) / levels;
}
fn barrelDistortion(uv: vec2<f32>) -> vec2<f32> {
    let center = vec2<f32>(0.5, 0.5);
    let offset = uv - center;
    let r = length(offset) * 1.5;
    let distortion = 1.0 + r * r * 0.15;
    return center + offset * distortion;
}
fn crtWarp(uv: vec2<f32>) -> vec2<f32> {
    let center = vec2<f32>(0.5, 0.5);
    let offset = uv - center;
    let strength = 0.1; 
    return center + offset * (1.0 + strength * dot(offset, offset));
}
fn motionBlur(uv: vec2<f32>) -> vec3<f32> {
    let offsets = array<vec2<f32>, 5>(
        vec2<f32>(-0.005, 0.0),
        vec2<f32>(-0.0025, 0.0),
        vec2<f32>(0.0, 0.0),
        vec2<f32>(0.0025, 0.0),
        vec2<f32>(0.005, 0.0)
    );
    var color = vec3<f32>(0.0);
    for (var i = 0; i < 5; i = i + 1) {
        color += textureSample(sceneTexture, sceneSampler, uv + offsets[i]).rgb;
    }
    return color / 5.0;
}
fn stylizedShadows(color: vec3<f32>) -> vec3<f32> {
    let shadowTint = vec3<f32>(1.2, 0.6, 1.4); 
    let shadowFactor = smoothstep(0.0, 0.5, length(color)); 
    return mix(color, color * shadowTint, shadowFactor * 0.4);
}
fn softGlow(uv: vec2<f32>) -> vec3<f32> {
    let blurOffsets = array<vec2<f32>, 5>(
        vec2<f32>(-0.005, 0.0),
        vec2<f32>(0.005, 0.0),
        vec2<f32>(0.0, -0.005),
        vec2<f32>(0.0, 0.005),
        vec2<f32>(0.0, 0.0)
    );
    var glow = vec3<f32>(0.0);
    for (var i = 0; i < 5; i = i + 1) {
        let sampleColor = textureSample(sceneTexture, sceneSampler, uv + blurOffsets[i]).rgb;
        glow += max(sampleColor - vec3<f32>(0.6), vec3<f32>(0.0)); 
    }
    return glow / 5.0;
}
fn enhanceContrast(color: vec3<f32>) -> vec3<f32> {
    let contrastFactor = 1.2; 
    return mix(vec3<f32>(0.5), color, contrastFactor);
}
