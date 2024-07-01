export class TriangleMesh {
  buffer: GPUBuffer;
  bufferLayout: GPUVertexBufferLayout;

  constructor(device: GPUDevice) {
    const top = [0.0, 0.0, 0.5, 1.0, 0.0, 0.0];
    const bottomLeft = [0.0, -0.5, -0.5, 0.0, 1.0, 0.0];
    const bottomRight = [0.0, 0.5, -0.5, 0.0, 0.0, 1.0];

    const vertices: Float32Array = new Float32Array([
      ...top,
      ...bottomLeft,
      ...bottomRight,
    ]);

    const usage: GPUBufferUsageFlags =
      GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;

    const descriptor: GPUBufferDescriptor = {
      size: vertices.byteLength,
      usage,
      mappedAtCreation: true,
    };

    this.buffer = device.createBuffer(descriptor);

    new Float32Array(this.buffer.getMappedRange()).set(vertices);
    this.buffer.unmap();

    this.bufferLayout = {
      arrayStride: 6 * 4,
      attributes: [
        {
          shaderLocation: 0,
          format: "float32x3",
          offset: 0,
        },
        {
          shaderLocation: 1,
          format: "float32x3",
          offset: 3 * 4,
        },
      ],
    };
  }
}

