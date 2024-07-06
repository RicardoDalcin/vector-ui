export const BufferUtils = {
  createVertexBuffer: (device: GPUDevice, data: Float32Array): GPUBuffer => {
    const usage: GPUBufferUsageFlags =
      GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;

    const descriptor: GPUBufferDescriptor = {
      size: data.byteLength,
      usage,
      mappedAtCreation: true,
    };

    const buffer = device.createBuffer(descriptor);

    new Float32Array(buffer.getMappedRange()).set(data);
    buffer.unmap();

    return buffer;
  },

  createIndexBuffer: (device: GPUDevice, data: Uint16Array): GPUBuffer => {
    const usage: GPUBufferUsageFlags =
      GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST;

    const descriptor: GPUBufferDescriptor = {
      size: data.byteLength,
      usage,
      mappedAtCreation: true,
    };

    const buffer = device.createBuffer(descriptor);

    new Uint16Array(buffer.getMappedRange()).set(data);
    buffer.unmap();

    return buffer;
  },

  createUniformBuffer: (device: GPUDevice, data: Float32Array): GPUBuffer => {
    const buffer = device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    return buffer;
  },
};
