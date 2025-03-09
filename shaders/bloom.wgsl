@group(0) @binding(0) var inputTexture: texture_2d<f32>;
@group(0) @binding(1) var inputSampler: sampler;

@fragment
fn bloomMain(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
    let color = textureSample(inputTexture, inputSampler, uv);
    let luminance = dot(color.rgb, vec3<f32>(0.299, 0.587, 0.114));
    let threshold: f32 = 0.8;
    let bloomColor = color.rgb * step(threshold, luminance);
    return vec4<f32>(bloomColor, color.a);
}

const KERNEL_SIZE: i32 = 5;
const KERNEL: array<f32, 5> = array<f32, 5>(0.227, 0.194, 0.121, 0.054, 0.016);
const OFFSET_SCALE: f32 =1;

@fragment
fn blurVMain(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
    let texSize: vec2<f32> = vec2<f32>(textureDimensions(inputTexture));
    let texelSize: vec2<f32> = vec2<f32>(1.0 / texSize.x, 1.0 / texSize.y);

    var result: vec3<f32> = textureSample(inputTexture, inputSampler, uv).rgb * KERNEL[0];

    for (var i: i32 = 1; i < KERNEL_SIZE; i = i + 1) {
        let offset: vec2<f32> = vec2<f32>(0.0, f32(i) * texelSize.y * OFFSET_SCALE);
        result += textureSample(inputTexture, inputSampler, uv + offset).rgb * KERNEL[i];
        result += textureSample(inputTexture, inputSampler, uv - offset).rgb * KERNEL[i];
    }

    return vec4<f32>(result*1.5, 1.0);
}

@fragment
fn blurHMain(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
    let texSize: vec2<f32> = vec2<f32>(textureDimensions(inputTexture));
    let texelSize: vec2<f32> = vec2<f32>(1.0 / texSize.x, 1.0 / texSize.y);

    var result: vec3<f32> = textureSample(inputTexture, inputSampler, uv).rgb * KERNEL[0];

    for (var i: i32 = 1; i < KERNEL_SIZE; i = i + 1) {
        let offset: vec2<f32> = vec2<f32>(f32(i) * texelSize.x * OFFSET_SCALE, 0.0);
        result += textureSample(inputTexture, inputSampler, uv + offset).rgb * KERNEL[i];
        result += textureSample(inputTexture, inputSampler, uv - offset).rgb * KERNEL[i];
    }

    return vec4<f32>(result*1.5, 1.0);
}