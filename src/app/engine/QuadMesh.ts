export class QuadMesh {
  buffer: GPUBuffer;
  bufferLayout: GPUVertexBufferLayout;
  vertices: Float32Array;
  indices: Uint16Array;

  constructor(device: GPUDevice) {
    const x = 100;
    const y = 100;

    const w = 250;
    const h = 250;

    const topLeft = [x + w, y + h, 1.0, 1.0, 1.0];
    const topRight = [x, y + h, 1.0, 1.0, 1.0];
    const bottomLeft = [x, y, 1.0, 1.0, 1.0];
    const bottomRight = [x + w, y, 1.0, 1.0, 1.0];

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
