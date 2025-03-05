@group(0) @binding(0) var inputTexture: texture_2d<f32>;
@group(0) @binding(1) var inputSampler: sampler;

const Pi: f32 = 6.28318530718;
const Directions: f32 = 16.0;
const Quality: f32 = 5.0; 
const Size: f32 = 64.0;  

const BLUR_STEPS: i32 = 3; 
const STEP_SIZE: f32 = 1.0; 

@fragment
fn bloomMain(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
    let color = textureSample(inputTexture, inputSampler, uv);
    
    let luminance = dot(color.rgb, vec3<f32>(0.299, 0.587, 0.114)); 
    let threshold: f32 = 0.8;
    
    let bloomColor = color.rgb * step(threshold, luminance);

    return vec4<f32>(bloomColor, color.a);
}

@fragment
fn blurMain(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
    let resolution = vec2<f32>(textureDimensions(inputTexture));
    let texelSize = 1.0 / resolution;
    var color = textureSample(inputTexture, inputSampler, uv).rgb;

    for (var i: i32 = 1; i <= BLUR_STEPS; i = i + 1) {
        let stepOffset = texelSize * (STEP_SIZE * f32(i)); 
        color += textureSample(inputTexture, inputSampler, uv + stepOffset).rgb;
        color += textureSample(inputTexture, inputSampler, uv - stepOffset).rgb;
        color += textureSample(inputTexture, inputSampler, uv + vec2(stepOffset.x, -stepOffset.y)).rgb;
        color += textureSample(inputTexture, inputSampler, uv - vec2(stepOffset.x, -stepOffset.y)).rgb;
    }

    return vec4<f32>(color / (f32(BLUR_STEPS) * 4.0 + 1.0), 1.0); 
}
