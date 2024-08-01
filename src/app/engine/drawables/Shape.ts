import { v4 as uuidv4 } from "uuid";

import { type Camera } from "../entities/Camera";
import { BasicMaterial } from "../materials/BasicMaterial/BasicMaterial";
import { BufferUtils } from "../BufferUtils";
import { Path } from "../vector/Path";
import { mat4, type Vec2, vec2 } from "wgpu-matrix";
import earcut from "earcut";
import { type Drawable } from "./Drawable";
import { BoundingBox } from "./Object";

export function getRect(
  device: GPUDevice,
  format: GPUTextureFormat,
  camera: Camera,
) {
  const shape = new ShapePath(device, format, camera);

  shape.path.moveTo(vec2.create(0, 0));
  shape.path.lineTo(vec2.create(1, 0));
  shape.path.lineTo(vec2.create(1, 1));
  shape.path.lineTo(vec2.create(0, 1));
  shape.path.close();

  return shape;
}

export function getTriangle(
  device: GPUDevice,
  format: GPUTextureFormat,
  camera: Camera,
) {
  const shape = new ShapePath(device, format, camera);

  shape.path.moveTo(vec2.create(0.5, 0));
  shape.path.lineTo(vec2.create(0, 1));
  shape.path.lineTo(vec2.create(1, 1));
  shape.path.close();

  return shape;
}

export class ShapePath implements Drawable {
  id: string;

  device: GPUDevice;
  camera: Camera;
  material: BasicMaterial;

  shapes: Float32Array[] = [];
  indices: Uint16Array[] = [];

  uniformBuffer: GPUBuffer;
  vertexBuffers: GPUBuffer[] = [];
  indexBuffers: GPUBuffer[] = [];

  path: Path;
  boundingBox: BoundingBox;

  position = vec2.create(0, 0);
  width = 1;
  height = 1;
  rotation = 0;

  constructor(device: GPUDevice, format: GPUTextureFormat, camera: Camera) {
    this.id = uuidv4();

    this.path = new Path();

    this.device = device;
    this.camera = camera;

    this.boundingBox = new BoundingBox(new Float32Array(0));
    this.rebuild();

    this.uniformBuffer = BufferUtils.createUniformBuffer(
      device,
      new Float32Array(16),
    );
    this.material = new BasicMaterial(device, format, this.uniformBuffer);
  }

  private getTransformMatrix() {
    const x = this.position[0] ?? 0;
    const y = this.position[1] ?? 0;

    const translation = mat4.translation([x, y, 0]);
    const scaling = mat4.scaling([this.width, this.height, 1]);

    return mat4.multiply(translation, scaling);
  }

  public transform(
    width: number,
    height: number,
    position: Vec2 = vec2.create(0, 0),
  ) {
    const normalizationMatrix = mat4.inverse(this.getTransformMatrix());
    this.path.transform(normalizationMatrix);

    this.width = width;
    this.height = height;
    this.position = position;

    this.path.transform(this.getTransformMatrix());
    this.rebuild();
  }

  rebuild() {
    this.shapes = this.path.getVertices();
    this.indices = [];
    this.vertexBuffers = [];
    this.indexBuffers = [];

    let allVerticesSize = 0;

    this.shapes.forEach((shape) => {
      allVerticesSize += shape.length;
      const triangles = earcut(shape);
      let bufferSize = triangles.length;

      if (bufferSize % 4 !== 0) {
        bufferSize += 4 - (bufferSize % 4);
      }

      const indices = new Uint16Array(bufferSize);

      for (let i = 0; i < triangles.length; i++) {
        indices[i] = Math.round(triangles[i] ?? 0);
      }

      this.indices.push(indices);

      const vertexBuffer = BufferUtils.createVertexBuffer(this.device, shape);
      this.vertexBuffers.push(vertexBuffer);

      const indexBuffer = BufferUtils.createIndexBuffer(this.device, indices);
      this.indexBuffers.push(indexBuffer);
    });

    const flattenedVertices = new Float32Array(allVerticesSize);

    let offset = 0;

    this.shapes.forEach((shape) => {
      shape.forEach((vertex) => {
        flattenedVertices[offset++] = vertex;
      });
    });

    this.boundingBox.updateGeometry(flattenedVertices);
    this.boundingBox.getSize();
  }

  public isPointColliding(point: Vec2): boolean {
    const x = point[0] ?? 0;
    const y = point[1] ?? 0;

    const position = this.boundingBox.getPosition();
    const objX = position[0] ?? 0;
    const objY = position[1] ?? 0;
    const { width, height } = this.boundingBox.getSize();

    const isInsideX = x >= objX && x <= objX + width;
    const isInsideY = y >= objY && y <= objY + height;

    return isInsideX && isInsideY;
  }

  public move(delta: Vec2) {
    const newPosition = vec2.add(this.position, delta);
    this.transform(this.width, this.height, newPosition);
  }

  public setPosition(position: Vec2) {
    this.transform(this.width, this.height, position);
  }

  public setHeight(height: number): void {
    this.transform(this.width, height);
  }

  public setWidth(width: number): void {
    this.transform(width, this.height);
  }

  public getPosition() {
    return this.position;
  }

  public draw(passEncoder: GPURenderPassEncoder) {
    const cameraMatrix = this.camera.getCameraMatrix();
    const asArrayBuffer = new Float32Array(cameraMatrix);

    this.device.queue.writeBuffer(
      this.uniformBuffer,
      0,
      asArrayBuffer.buffer,
      asArrayBuffer.byteOffset,
      asArrayBuffer.byteLength,
    );

    passEncoder.setPipeline(this.material.pipeline);

    for (let i = 0; i < this.shapes.length; i++) {
      const shape = this.shapes[i];
      const indices = this.indices[i];
      const vertexBuffer = this.vertexBuffers[i];
      const indexBuffer = this.indexBuffers[i];

      if (shape && vertexBuffer && indexBuffer && indices) {
        passEncoder.setVertexBuffer(0, vertexBuffer);
        passEncoder.setIndexBuffer(indexBuffer, "uint16");
        passEncoder.setBindGroup(0, this.material.viewProjectionBindGroup);
        passEncoder.drawIndexed(indices.length);
      }
    }
  }
}
