import { Camera } from "./entities/Camera";
import { QuadGeometry } from "./QuadGeometry";
import { QuadMesh } from "./QuadMesh";
import shader from "./shader.wgsl";
import { TriangleMesh } from "./TriangleMesh";
import { mat4, vec3 } from "wgpu-matrix";

class BufferUtil {
  public static createVertexBuffer(
    device: GPUDevice,
    data: Float32Array,
  ): GPUBuffer {
    const buffer = device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });

    new Float32Array(buffer.getMappedRange()).set(data);
    buffer.unmap();

    return buffer;
  }

  public static createIndexBuffer(
    device: GPUDevice,
    data: Uint16Array,
  ): GPUBuffer {
    const buffer = device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });

    new Uint16Array(buffer.getMappedRange()).set(data);
    buffer.unmap();

    return buffer;
  }

  public static createUniformBuffer(
    device: GPUDevice,
    data: Float32Array,
  ): GPUBuffer {
    const buffer = device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    return buffer;
  }
}

const setupCameraEvents = (camera: Camera) => {
  window.addEventListener("keydown", (event) => {
    console.log(event.key, event.ctrlKey);
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const isControlPressed = isMac ? event.metaKey : event.ctrlKey;

    console.log(isMac, isControlPressed);

    if ((event.key === "=" || event.key === "+") && isControlPressed) {
      event.preventDefault();
      camera.zoomIn();
    }

    if (event.key === "-" && isControlPressed) {
      event.preventDefault();
      camera.zoomOut();
    }
  });
};

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
  quadGeometry!: QuadGeometry;
  quadMesh!: QuadMesh;
  t = 0;

  camera: Camera;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = this.canvas.clientWidth * window.devicePixelRatio;
    this.canvas.height = this.canvas.clientHeight * window.devicePixelRatio;

    this.camera = new Camera(
      canvas.width,
      canvas.height,
      window.devicePixelRatio,
    );

    setupCameraEvents(this.camera);

    window.addEventListener("resize", () => {
      this.canvas.width = this.canvas.clientWidth * window.devicePixelRatio;
      this.canvas.height = this.canvas.clientHeight * window.devicePixelRatio;
      this.camera.clientWidth = this.canvas.width;
      this.camera.clientHeight = this.canvas.height;
    });
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
    this.quadGeometry = new QuadGeometry();
    this.quadMesh = new QuadMesh(this.device);
  }

  async makePipeline() {
    this.uniformBuffer = BufferUtil.createUniformBuffer(
      this.device,
      new Float32Array(16),
    );

    const bindGroupLayout = this.device.createBindGroupLayout({
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
        buffers: [this.quadMesh.bufferLayout],
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
    // this.t += 0.05;

    // if (this.t > Math.PI * 2) {
    //   this.t -= Math.PI * 2;
    // }

    const cameraMatrix = this.camera.getCameraMatrix();
    const model = mat4.rotate(mat4.identity(), [0, 0, 1], this.t);

    const modelViewProjection = mat4.create();
    mat4.multiply(cameraMatrix, model, modelViewProjection);

    const asArrayBuffer = new Float32Array(modelViewProjection);

    this.device.queue.writeBuffer(
      this.uniformBuffer,
      0,
      asArrayBuffer.buffer,
      asArrayBuffer.byteOffset,
      asArrayBuffer.byteLength,
    );

    const verticesBuffer = BufferUtil.createVertexBuffer(
      this.device,
      this.quadMesh.vertices,
    );

    const indicesBuffer = BufferUtil.createIndexBuffer(
      this.device,
      this.quadMesh.indices,
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
    passEncoder.setIndexBuffer(indicesBuffer, "uint16");
    passEncoder.setVertexBuffer(0, verticesBuffer);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.drawIndexed(6);
    passEncoder.end();

    this.device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(this.render.bind(this));
  }
}
