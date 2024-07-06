import { mat4, vec2, type Vec2 } from "wgpu-matrix";

export class QuadMesh {
  buffer: GPUBuffer;
  bufferLayout: GPUVertexBufferLayout;
  vertices: Float32Array;
  indices: Uint16Array;

  position: Vec2;
  width: number;
  height: number;
  rotation: number;

  constructor(device: GPUDevice) {
    this.position = vec2.create(0, 0);

    this.width = 100;
    this.height = 100;

    this.rotation = 0;

    // prettier-ignore
    this.vertices = new Float32Array([
      0.0, 1.0, 1.0, 0.0, 1.0, // bottom left
      1.0, 1.0, 0.0, 0.0, 1.0, // bottom right
      1.0, 0.0, 1.0, 0.0, 0.0, // top right
      0.0, 0.0, 0.0, 1.0, 0.0, // top left
    ]);

    this.indices = new Uint16Array([0, 1, 2, 2, 3, 0]);

    const usage: GPUBufferUsageFlags =
      GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;

    const descriptor: GPUBufferDescriptor = {
      size: this.vertices.byteLength,
      usage,
      mappedAtCreation: true,
    };

    this.buffer = device.createBuffer(descriptor);

    new Float32Array(this.buffer.getMappedRange()).set(this.vertices);
    this.buffer.unmap();

    this.bufferLayout = {
      arrayStride: 5 * Float32Array.BYTES_PER_ELEMENT, // 2 floats * 4 bytes per float
      attributes: [
        {
          shaderLocation: 0,
          offset: 0,
          format: "float32x2", // 2 floats
        },
        {
          shaderLocation: 1,
          offset: 2 * Float32Array.BYTES_PER_ELEMENT,
          format: "float32x3", // 3 floats
        },
      ],
      stepMode: "vertex",
    };
  }

  getModelMatrix() {
    const rotation = mat4.rotationZ(this.rotation);

    const translation = mat4.translation([
      this.position[0] ?? 0,
      this.position[1] ?? 0,
      0,
    ]);

    const scaling = mat4.scaling([this.width, this.height, 1]);

    const model = mat4.multiply(translation, scaling);
    return mat4.multiply(model, rotation);
  }
}
