export class QuadMesh {
  buffer: GPUBuffer;
  bufferLayout: GPUVertexBufferLayout;

  constructor(device: GPUDevice) {
    const x = 0;
    const y = 0;

    const w = 100;
    const h = 100;

    const topLeft = [x + w, y + h, 0.0, 0.0, 1.0, 1.0, 1.0];
    const topRight = [x, y + h, 1.0, 0.0, 1.0, 1.0, 1.0];
    const bottomLeft = [x, y, 0.0, 1.0, 1.0, 1.0, 1.0];
    const bottomRight = [x + w, y, 1.0, 1.0, 1.0, 1.0, 1.0];

    const vertices: Float32Array = new Float32Array([
      ...bottomLeft,
      ...bottomRight,
      ...topLeft,
      ...topRight,
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
      arrayStride: 7 * Float32Array.BYTES_PER_ELEMENT, // 2 floats * 4 bytes per float
      attributes: [
        {
          shaderLocation: 0,
          offset: 0,
          format: "float32x2", // 2 floats
        },
        {
          shaderLocation: 1,
          offset: 2 * Float32Array.BYTES_PER_ELEMENT,
          format: "float32x2", // 2 floats
        },
        {
          shaderLocation: 2,
          offset: 4 * Float32Array.BYTES_PER_ELEMENT,
          format: "float32x3", // 3 floats
        },
      ],
      stepMode: "vertex",
    };
  }
}
