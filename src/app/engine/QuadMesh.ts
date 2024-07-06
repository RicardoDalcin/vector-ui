import { vec2, type Vec2 } from "wgpu-matrix";

export class QuadMesh {
  buffer: GPUBuffer;
  bufferLayout: GPUVertexBufferLayout;
  vertices: Float32Array;
  indices: Uint16Array;

  position: Vec2;
  width: number;
  height: number;

  constructor(device: GPUDevice) {
    this.position = vec2.create(100, 100);

    this.width = 100;
    this.height = 100;

    const topLeft = [
      (this.position[0] ?? 0) + this.width,
      (this.position[1] ?? 0) + this.height,
      1.0,
      1.0,
      1.0,
    ];
    const topRight = [
      this.position[0] ?? 0,
      (this.position[1] ?? 0) + this.height,
      1.0,
      1.0,
      1.0,
    ];
    const bottomLeft = [
      this.position[0] ?? 0,
      this.position[1] ?? 0,
      1.0,
      1.0,
      1.0,
    ];
    const bottomRight = [
      (this.position[0] ?? 0) + this.width,
      this.position[1] ?? 0,
      1.0,
      1.0,
      1.0,
    ];

    this.vertices = new Float32Array([
      ...bottomLeft,
      ...bottomRight,
      ...topLeft,
      ...topRight,
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
}
