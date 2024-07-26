import { type Drawable } from "./drawables/Drawable";
import { getPolygon } from "./drawables/Polygon";
import { Rect } from "./drawables/Rect";
import { getRect, getTriangle, ShapePath } from "./drawables/Shape";
import { Camera } from "./entities/Camera";
import { mat4, vec2, type Vec2 } from "wgpu-matrix";

export type MouseEventOptions = {
  button: "left" | "right" | "middle";
  position: Vec2;
  modifiers: {
    ctrlKey: boolean;
    shiftKey: boolean;
  };
};

export type MouseMoveOptions = {
  position: Vec2;
  movement: Vec2;
};

export enum EditorMode {
  Move = "move",
  Hand = "hand",
  Rectangle = "rectangle",
  Pen = "pen",
}

export enum ScaleDirection {
  Right = "right",
  Left = "left",
  Top = "top",
  Bottom = "bottom",
  TopRight = "top-right",
  TopLeft = "top-left",
  BottomRight = "bottom-right",
  BottomLeft = "bottom-left",
}

export type EngineCallbacks = Partial<{
  onEditorModeChange: (mode: EditorMode) => void;
}>;

export class Engine {
  private readonly MIN_DISTANCE_TO_CREATE_OBJECT = 10;
  private readonly TARGET_EDITOR_MODES = [EditorMode.Move];

  private canvas: HTMLCanvasElement;
  private callbacks: EngineCallbacks;

  private adapter!: GPUAdapter;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  private camera: Camera;
  public objects: Array<Drawable> = [];

  isMouseDown = false;
  mouseDownPosition: Vec2 | null = null;
  objectPositionAtMouseDown: Vec2 | null = null;
  selectedObject: Drawable | null = null;
  penObject: ShapePath | null = null;
  editorMode: EditorMode = EditorMode.Move;
  isDragging = false;

  constructor(canvas: HTMLCanvasElement, callbacks: EngineCallbacks) {
    this.canvas = canvas;
    this.canvas.width = this.canvas.clientWidth * window.devicePixelRatio;
    this.canvas.height = this.canvas.clientHeight * window.devicePixelRatio;

    this.camera = new Camera(
      canvas.width,
      canvas.height,
      window.devicePixelRatio,
    );

    this.callbacks = callbacks;
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

  public setEditorMode(mode: EditorMode) {
    this.editorMode = mode;
    this.isMouseDown = false;

    this.callbacks.onEditorModeChange?.(mode);
  }

  public setDragging(isDragging: boolean) {
    this.isDragging = isDragging;
  }

  private getWorldPositionPoint(position: Vec2) {
    const positionCorrected = vec2.mulScalar(position, devicePixelRatio);
    const matrix = mat4.inverse(this.camera.getViewMatrix());
    return vec2.transformMat4(positionCorrected, matrix);
  }

  public onMouseDown(options: MouseEventOptions) {
    if (options.button === "left") {
      const position = this.getWorldPositionPoint(options.position);

      this.isMouseDown = true;
      this.mouseDownPosition = position;

      if (this.TARGET_EDITOR_MODES.includes(this.editorMode)) {
        const collision = this.objects.find((object) =>
          object.isPointColliding(position),
        );

        this.selectedObject = collision ?? null;
      } else {
        this.selectedObject = null;
      }

      this.objectPositionAtMouseDown =
        this.selectedObject?.getPosition() ?? null;
    }
  }

  public onMouseUp(options: MouseEventOptions) {
    if (options.button === "left") {
      const position = this.getWorldPositionPoint(options.position);

      if (!this.isMouseDown) {
        return;
      }

      this.isMouseDown = false;

      if (this.isDragging) {
        return;
      }

      if (this.editorMode === EditorMode.Rectangle) {
        if (!this.selectedObject) {
          const newRect = new Rect(this.device, this.format, this.camera);

          newRect.setPosition(
            vec2.sub(
              position,
              vec2.create(newRect.width / 2, newRect.height / 2),
            ),
          );
          this.objects.push(newRect);
        }

        this.setEditorMode(EditorMode.Move);
        return;
      }

      if (this.editorMode === EditorMode.Pen) {
        if (!this.penObject) {
          this.penObject = new ShapePath(this.device, this.format, this.camera);
          this.penObject.path.moveTo(position);
          this.penObject.rebuild();
          this.objects.push(this.penObject);
          return;
        }

        this.penObject.path.lineTo(position);
        this.penObject.rebuild();

        if (options.modifiers.ctrlKey) {
          this.penObject.path.close();
          this.penObject.rebuild();
          this.penObject = null;
        }

        return;
      }
    }
  }

  public onMouseMove(options: MouseMoveOptions) {
    const position = this.getWorldPositionPoint(options.position);

    if (!this.isMouseDown || !this.mouseDownPosition) {
      return;
    }

    if (this.editorMode === EditorMode.Hand || this.isDragging) {
      this.camera.pan(options.movement);
      return;
    }

    if (this.editorMode === EditorMode.Move) {
      const movement = vec2.sub(
        position,
        this.mouseDownPosition ?? vec2.create(),
      );

      const newPosition = vec2.add(
        this.objectPositionAtMouseDown ?? vec2.create(),
        movement,
      );

      this.selectedObject?.setPosition(newPosition);
      return;
    }

    if (this.editorMode === EditorMode.Rectangle) {
      const hasTraveledMinDistance =
        vec2.distance(this.mouseDownPosition, position) >=
        this.MIN_DISTANCE_TO_CREATE_OBJECT;

      if (!hasTraveledMinDistance && !this.selectedObject) {
        return;
      }

      if (!this.selectedObject) {
        const newRect = new Rect(this.device, this.format, this.camera);
        newRect.setPosition(this.mouseDownPosition);
        this.objects.push(newRect);
        this.selectedObject = newRect;
      }

      const currentX = position[0] ?? 0;
      const currentY = position[1] ?? 0;

      const downX = this.mouseDownPosition[0] ?? 0;
      const downY = this.mouseDownPosition[1] ?? 0;

      const width = Math.abs(currentX - downX);
      const height = Math.abs(currentY - downY);

      const x = Math.min(downX, currentX);
      const y = Math.min(downY, currentY);

      this.selectedObject.setPosition(vec2.create(x, y));
      this.selectedObject.setWidth(width || 1);
      this.selectedObject.setHeight(height || 1);

      return;
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
    // const defaultRect = getRect(this.device, this.format, this.camera);
    // const defaultTriangle = getTriangle(this.device, this.format, this.camera);
    const polygons = Array.from({ length: 100 }, (_, i) =>
      getPolygon(this.device, this.format, this.camera, i + 3),
    );

    polygons.forEach((polygon, i) =>
      polygon.move(vec2.create(100 * (i + 1), 0)),
    );

    const defaultShape = getRect(this.device, this.format, this.camera);
    defaultShape.transform(100, 100, vec2.create(100, 100));

    const defaultTriangle = getTriangle(this.device, this.format, this.camera);
    defaultTriangle.transform(100, 100, vec2.create(100, 100));

    this.objects.push(defaultShape);
  }

  private multisampleTexture: GPUTexture | null = null;

  private render() {
    const commandEncoder = this.device.createCommandEncoder();
    const canvasTexture = this.context.getCurrentTexture();

    if (
      !this.multisampleTexture ||
      this.multisampleTexture.width !== canvasTexture.width ||
      this.multisampleTexture.height !== canvasTexture.height
    ) {
      if (this.multisampleTexture) {
        this.multisampleTexture.destroy();
      }

      this.multisampleTexture = this.device.createTexture({
        size: [canvasTexture.width, canvasTexture.height],
        format: this.format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        sampleCount: 4,
      });
    }

    const view = this.multisampleTexture.createView();
    const resolveTarget = canvasTexture.createView();

    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view,
          resolveTarget,
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
