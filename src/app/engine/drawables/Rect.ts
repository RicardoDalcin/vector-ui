import { mat4, vec2, type Vec2 } from "wgpu-matrix";
import { type Drawable } from "./Drawable";
import { BufferUtils } from "../BufferUtils";
import { BasicMaterial } from "../materials/BasicMaterial/BasicMaterial";
import { type Camera } from "../entities/Camera";
import { v4 as uuidv4 } from "uuid";

export class Rect implements Drawable {
  readonly DEFAULT_SIZE = 100;

  id: string;

  device: GPUDevice;

  camera: Camera;
  material: BasicMaterial;

  uniformBuffer: GPUBuffer;
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  vertices: Float32Array;
  indices: Uint16Array;

  position: Vec2;
  width: number;
  height: number;
  rotation: number;

  isSelected = false;

  constructor(device: GPUDevice, format: GPUTextureFormat, camera: Camera) {
    this.id = uuidv4();

    this.position = vec2.create(0, 0);

    this.width = this.DEFAULT_SIZE;
    this.height = this.DEFAULT_SIZE;

    this.rotation = 0;

    // prettier-ignore
    this.vertices = new Float32Array([
      0.0, 1.0, // bottom left
      1.0, 1.0, // bottom right
      1.0, 0.0, // top right
      0.0, 0.0, // top left
    ]);
    this.vertexBuffer = BufferUtils.createVertexBuffer(device, this.vertices);

    this.indices = new Uint16Array([0, 1, 2, 2, 3, 0]);
    this.indexBuffer = BufferUtils.createIndexBuffer(device, this.indices);

    this.uniformBuffer = BufferUtils.createUniformBuffer(
      device,
      new Float32Array(16),
    );
    this.material = new BasicMaterial(device, format, this.uniformBuffer);

    this.device = device;
    this.camera = camera;
  }

  private getModelMatrix() {
    const rotation = mat4.rotationZ(this.rotation);

    const x = this.position[0] ?? 0;
    const y = this.position[1] ?? 0;

    const translation = mat4.translation([x, y, 0]);
    const scaling = mat4.scaling([this.width, this.height, 1]);

    const model = mat4.multiply(translation, scaling);
    return mat4.multiply(model, rotation);
  }

  private getMVPMatrix() {
    const cameraMatrix = this.camera.getCameraMatrix();
    const modelViewProjection = mat4.create();
    const model = this.getModelMatrix();
    mat4.multiply(cameraMatrix, model, modelViewProjection);

    return modelViewProjection;
  }

  public move(delta: Vec2) {
    this.position = vec2.add(this.position, delta);
  }

  public setPosition(position: Vec2) {
    this.position = position;
  }

  public getPosition() {
    return this.position;
  }

  public setHeight(height: number) {
    this.height = height;
  }

  public setWidth(width: number) {
    this.width = width;
  }

  public isPointInShape(point: Float32Array) {
    const x = point[0] ?? 0;
    const y = point[1] ?? 0;

    const objX = this.position[0] ?? 0;
    const objY = this.position[1] ?? 0;

    const isInsideX = x >= objX && x <= objX + this.width;
    const isInsideY = y >= objY && y <= objY + this.height;

    return isInsideX && isInsideY;
  }

  public isPointInBoundingBox(point: Float32Array) {
    return this.isPointInShape(point);
  }

  public setIsSelected(isSelected: boolean) {
    this.isSelected = isSelected;
  }

  draw(passEncoder: GPURenderPassEncoder) {
    const mvpMatrix = this.getMVPMatrix();
    const asArrayBuffer = new Float32Array(mvpMatrix);

    this.device.queue.writeBuffer(
      this.uniformBuffer,
      0,
      asArrayBuffer.buffer,
      asArrayBuffer.byteOffset,
      asArrayBuffer.byteLength,
    );

    passEncoder.setPipeline(this.material.pipeline);
    passEncoder.setIndexBuffer(this.indexBuffer, "uint16");
    passEncoder.setVertexBuffer(0, this.vertexBuffer);
    passEncoder.setBindGroup(0, this.material.viewProjectionBindGroup);
    passEncoder.drawIndexed(6);
  }
}
