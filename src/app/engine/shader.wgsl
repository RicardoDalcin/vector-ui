struct TransformData {
  modelViewProjection: mat4x4f
}
@group(0) @binding(0) var<uniform> transformData : TransformData;

struct Fragment {
    @builtin(position) position : vec4<f32>,
    @location(0) color : vec4<f32>,
}

@vertex
fn vs_main(@location(0) vertexPosition : vec3<f32>, @location(1) vertexColor : vec3<f32>) -> Fragment {
  var output : Fragment;
  output.position = transformData.modelViewProjection * vec4<f32>(vertexPosition, 1.0);
  output.color = vec4<f32>(vertexColor, 1.0);

  return output;
}

@fragment
fn fs_main(@location(0) color : vec4<f32>) -> @location(0) vec4<f32> {
  return color;
}