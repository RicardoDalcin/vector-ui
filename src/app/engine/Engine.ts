import { type Drawable } from "./drawables/Drawable";
import { Rect } from "./drawables/Rect";
import { Camera } from "./entities/Camera";
import { vec2, type Vec2 } from "wgpu-matrix";

export type MouseEventOptions = {
  button: "left" | "right" | "middle";
  position: Vec2;
};

export type MouseMoveOptions = {
  position: Vec2;
  movement: Vec2;
};

export class Engine {
  private canvas: HTMLCanvasElement;

  private adapter!: GPUAdapter;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  private camera: Camera;
  public objects: Array<Drawable> = [];

  isMouseDown = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = this.canvas.clientWidth * window.devicePixelRatio;
    this.canvas.height = this.canvas.clientHeight * window.devicePixelRatio;

    this.camera = new Camera(
      canvas.width,
      canvas.height,
      window.devicePixelRatio,
    );
  }

  public resize() {
    this.canvas.width = this.canvas.clientWidth * window.devicePixelRatio;
    this.canvas.height = this.canvas.clientHeight * window.devicePixelRatio;
    this.camera.clientWidth = this.canvas.width;
    this.camera.clientHeight = this.canvas.height;
  }

  public zoomIn() {
    this.camera.zoomIn();
  }

  public zoomOut() {
    this.camera.zoomOut();
  }

  public onMouseDown(options: MouseEventOptions) {
    if (options.button === "left") {
      this.isMouseDown = true;
    }
  }

  public onMouseUp(options: MouseEventOptions) {
    if (options.button === "left") {
      this.isMouseDown = false;
    }
  }

  public onMouseMove(options: MouseMoveOptions) {
    if (this.isMouseDown) {
      this.camera.pan(options.movement);
    }
  }

  public async initialize() {
    await this.setupDevice();
    this.createAssets();
    this.render();
  }

  private async setupDevice() {
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

  private createAssets() {
    const defaultRect = new Rect(this.device, this.format, this.camera);
    const defaultRect2 = new Rect(this.device, this.format, this.camera);

    defaultRect2.move(vec2.create(100, 100));

    this.objects.push(defaultRect, defaultRect2);
  }

  private render() {
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

    this.objects.forEach((object) => object.draw(passEncoder));
    passEncoder.end();

    this.device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(this.render.bind(this));
  }
}
