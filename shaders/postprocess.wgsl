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

fn applyExposure(color: vec3<f32>) -> vec3<f32> {
    return color * 2;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    var color = textureSample(sceneTexture, sceneSampler, input.uv).rgb;

    color = applyExposure(color);
    

    return vec4<f32>(color, 1.0);
}
