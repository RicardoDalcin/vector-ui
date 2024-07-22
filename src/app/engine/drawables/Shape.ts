import { v4 as uuidv4 } from "uuid";

import { type Camera } from "../entities/Camera";
import { BasicMaterial } from "../materials/BasicMaterial/BasicMaterial";
import { BufferUtils } from "../BufferUtils";
import { Path } from "../vector/Path";
import { type Vec2, vec2 } from "wgpu-matrix";
import Delaunator from "delaunator";
import { type Drawable } from "./Drawable";

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

  position = vec2.create(0, 0);
  width = 1;
  height = 1;
  rotation = 0;

  constructor(device: GPUDevice, format: GPUTextureFormat, camera: Camera) {
    this.id = uuidv4();

    this.path = new Path();

    this.path.moveTo(vec2.create(0, 0));
    this.path.lineTo(vec2.create(1, 0));
    this.path.lineTo(vec2.create(1, 1));
    this.path.lineTo(vec2.create(0, 1));
    this.path.close();

    this.device = device;
    this.camera = camera;

    this.rebuild();

    this.uniformBuffer = BufferUtils.createUniformBuffer(
      device,
      new Float32Array(16),
    );
    this.material = new BasicMaterial(device, format, this.uniformBuffer);
  }

  public transform(
    width: number,
    height: number,
    position: Vec2 = vec2.create(0, 0),
  ) {
    this.width = width;
    this.height = height;
    this.position = position;

    this.path.clear();
    this.path.moveTo(position);
    this.path.lineTo(vec2.create((position[0] ?? 0) + width, position[1] ?? 0));
    this.path.lineTo(
      vec2.create((position[0] ?? 0) + width, (position[1] ?? 0) + height),
    );
    this.path.lineTo(vec2.create(position[0], (position[1] ?? 0) + height));
    this.path.close();

    this.rebuild();
  }

  private rebuild() {
    this.shapes = this.path.getVertices();
    this.indices = [];
    this.vertexBuffers = [];
    this.indexBuffers = [];

    this.shapes.forEach((shape) => {
      const delaunay = new Delaunator(shape);
      const triangles = delaunay.triangles;
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

      console.log(shape, indices);
    });
  }

  public isPointColliding(point: Vec2): boolean {
    const x = point[0] ?? 0;
    const y = point[1] ?? 0;

    const objX = this.position[0] ?? 0;
    const objY = this.position[1] ?? 0;

    const isInsideX = x >= objX && x <= objX + this.width;
    const isInsideY = y >= objY && y <= objY + this.height;

    console.log(x, y, isInsideX, isInsideY);

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
