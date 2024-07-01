import shader from "./shader.wgsl";
import { TriangleMesh } from "./TriangleMesh";
import { mat4, vec3 } from "wgpu-matrix";

export class Renderer {
  canvas: HTMLCanvasElement;

  adapter!: GPUAdapter;
  device!: GPUDevice;
  context!: GPUCanvasContext;
  format!: GPUTextureFormat;

  uniformBuffer!: GPUBuffer;
  bindGroup!: GPUBindGroup;
  pipeline!: GPURenderPipeline;

  triangleMesh!: TriangleMesh;
  t = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async initialize() {
    await this.setupDevice();
    this.createAssets();
    await this.makePipeline();

    this.render();
  }

  async setupDevice() {
    if (!navigator.gpu) {
      throw "Your current browser does not support WebGPU!";
    }

    this.adapter = (await navigator.gpu?.requestAdapter())!;
    this.device = await this.adapter?.requestDevice();
    this.context = this.canvas.getContext("webgpu")!;
    this.format = navigator.gpu.getPreferredCanvasFormat();

    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: "premultiplied",
    });
  }

  createAssets() {
    this.triangleMesh = new TriangleMesh(this.device);
  }

  async makePipeline() {
    this.uniformBuffer = this.device.createBuffer({
      size: 16 * 4 * 3,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {},
        },
      ],
    });

    this.bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.uniformBuffer,
          },
        },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });

    this.pipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: this.device.createShaderModule({
          code: shader,
        }),
        entryPoint: "vs_main",
        buffers: [this.triangleMesh.bufferLayout],
      },
      fragment: {
        module: this.device.createShaderModule({
          code: shader,
        }),
        entryPoint: "fs_main",
        targets: [
          {
            format: this.format,
          },
        ],
      },
      primitive: {
        topology: "triangle-list",
      },
    });
  }

  render() {
    this.t += 0.05;

    if (this.t > Math.PI * 2) {
      this.t -= Math.PI * 2;
    }

    const model = mat4.rotate(mat4.identity(), [0, 0, 1], this.t);
    const view = mat4.lookAt([-2, 0, 2], [0, 0, 0], [0, 0, 1]);
    const projection = mat4.perspective(
      Math.PI / 4,
      this.canvas.clientWidth / this.canvas.clientHeight,
      0.1,
      10,
    );

    const modelViewProjection = mat4.create();
    mat4.multiply(projection, view, modelViewProjection);
    mat4.multiply(modelViewProjection, model, modelViewProjection);

    const asArrayBuffer = new Float32Array(modelViewProjection);

    this.device.queue.writeBuffer(
      this.uniformBuffer,
      0,
      asArrayBuffer.buffer,
      asArrayBuffer.byteOffset,
      asArrayBuffer.byteLength,
    );

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: [0.1, 0.1, 0.1, 1],
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.setVertexBuffer(0, this.triangleMesh.buffer);
    passEncoder.draw(3);
    passEncoder.end();

    this.device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(this.render.bind(this));
  }
}
