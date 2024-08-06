import { type Vec4, vec4 } from "wgpu-matrix";
import shader from "./shader.wgsl";
import { BufferUtils } from "../../BufferUtils";

export class BasicMaterial {
  device: GPUDevice;
  format: GPUTextureFormat;
  viewProjectionMatrixBuffer: GPUBuffer;
  colorBuffer: GPUBuffer;

  viewProjectionBindGroup: GPUBindGroup;
  fillColorBindGroup: GPUBindGroup;
  pipeline: GPURenderPipeline;

  fillColor = vec4.create(1.0, 1.0, 1.0, 1.0);

  constructor(
    device: GPUDevice,
    format: GPUTextureFormat,
    viewProjectionMatrixBuffer: GPUBuffer,
    topology: GPUPrimitiveTopology = "triangle-list",
  ) {
    this.device = device;
    this.format = format;
    this.viewProjectionMatrixBuffer = viewProjectionMatrixBuffer;

    const shaderModule = this.device.createShaderModule({
      code: shader,
    });

    const bufferLayout: GPUVertexBufferLayout = {
      arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT,
      attributes: [
        {
          shaderLocation: 0,
          offset: 0,
          format: "float32x2",
        },
        // {
        //   shaderLocation: 1,
        //   offset: 2 * Float32Array.BYTES_PER_ELEMENT,
        //   format: "float32x3",
        // },
      ],
      stepMode: "vertex",
    };

    const vertexState: GPUVertexState = {
      module: shaderModule,
      entryPoint: "vs_main",
      buffers: [bufferLayout],
    };

    const fragmentState: GPUFragmentState = {
      module: shaderModule,
      entryPoint: "fs_main",
      targets: [
        {
          format: this.format,
        },
      ],
    };

    const viewProjectionBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: "uniform",
          },
        },
      ],
    });

    const fillColorBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: "uniform",
          },
        },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [
        viewProjectionBindGroupLayout,
        fillColorBindGroupLayout,
      ],
    });

    this.viewProjectionBindGroup = this.device.createBindGroup({
      layout: viewProjectionBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.viewProjectionMatrixBuffer,
          },
        },
      ],
    });

    this.colorBuffer = BufferUtils.createUniformBuffer(
      this.device,
      this.fillColor,
    );

    this.fillColorBindGroup = this.device.createBindGroup({
      layout: fillColorBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.colorBuffer,
          },
        },
      ],
    });

    this.pipeline = this.device.createRenderPipeline({
      vertex: vertexState,
      fragment: fragmentState,
      primitive: {
        topology,
      },
      layout: pipelineLayout,
      multisample: {
        count: 4,
      },
    });
  }

  public setBindGroups(passEncoder: GPURenderPassEncoder) {
    passEncoder.setBindGroup(0, this.viewProjectionBindGroup);
    passEncoder.setBindGroup(1, this.fillColorBindGroup);
  }

  public setFillColor(color: Vec4) {
    this.fillColor = color;
  }

  public writeBuffers() {
    this.device.queue.writeBuffer(
      this.colorBuffer,
      0,
      this.fillColor.buffer,
      this.fillColor.byteOffset,
      this.fillColor.byteLength,
    );
  }
}
