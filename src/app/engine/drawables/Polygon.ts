import { type Mat4, mat4, vec2, type Vec2 } from "wgpu-matrix";
import { type Drawable } from "./Drawable";
import { BufferUtils } from "../BufferUtils";
import { BasicMaterial } from "../materials/BasicMaterial/BasicMaterial";
import { type Camera } from "../entities/Camera";
import { v4 as uuidv4 } from "uuid";

export function getRect(
  device: GPUDevice,
  format: GPUTextureFormat,
  camera: Camera,
) {
  // prettier-ignore
  const vertices = new Float32Array([
    0.0, 1.0, // bottom left
    1.0, 1.0, // bottom right
    1.0, 0.0, // top right
    0.0, 0.0, // top left
  ]);

  const indices = new Uint16Array([0, 1, 2, 2, 3, 0]);

  return new Polygon(device, format, camera, vertices, indices);
}

export function getTriangle(
  device: GPUDevice,
  format: GPUTextureFormat,
  camera: Camera,
) {
  // prettier-ignore
  const vertices = new Float32Array([
    0.5, 0.0, // bottom left
    0.0, 1.0, // bottom right
    1.0, 1.0, // top right
  ]);

  const indices = new Uint16Array([0, 1, 2, 2, 1, 0]);

  return new Polygon(device, format, camera, vertices, indices);
}

export class Polygon implements Drawable {
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

  constructor(
    device: GPUDevice,
    format: GPUTextureFormat,
    camera: Camera,
    defaultVertices: Float32Array,
    defaultIndices: Uint16Array,
  ) {
    this.id = uuidv4();

    this.device = device;
    this.camera = camera;

    this.position = vec2.create(0, 0);
    this.width = 1;
    this.height = 1;
    this.rotation = 0;

    this.vertices = defaultVertices;
    this.indices = defaultIndices;
    this.transform(this.DEFAULT_SIZE, this.DEFAULT_SIZE, vec2.create(200, 200));

    this.vertexBuffer = BufferUtils.createVertexBuffer(device, this.vertices);
    this.indexBuffer = BufferUtils.createIndexBuffer(device, this.indices);

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

  private getModelMatrix() {
    return mat4.rotationZ(this.rotation);
  }

  private getMVPMatrix() {
    const cameraMatrix = this.camera.getCameraMatrix();
    const modelViewProjection = mat4.create();
    const model = this.getModelMatrix();
    mat4.multiply(cameraMatrix, model, modelViewProjection);

    return modelViewProjection;
  }

  public move(delta: Vec2) {
    // this.position = vec2.add(this.position, delta);
    const newPosition = vec2.add(this.position, delta);
    this.transform(this.width, this.height, newPosition);
  }

  public setPosition(position: Vec2) {
    this.transform(this.width, this.height, position);
  }

  public getPosition() {
    return this.position;
  }

  private transformVertices(
    vertices: Float32Array,
    transformMatrix: Mat4,
  ): Float32Array {
    const transformedVertices = new Float32Array(vertices.length);

    for (let i = 0; i < vertices.length; i += 2) {
      const x = vertices[i];
      const y = vertices[i + 1];

      const transformed = vec2.transformMat4(
        vec2.create(x, y),
        transformMatrix,
      );

      transformedVertices[i] = transformed[0] ?? 0;
      transformedVertices[i + 1] = transformed[1] ?? 0;
      transformedVertices[i + 2] = vertices[i + 2] ?? 0;
      transformedVertices[i + 3] = vertices[i + 3] ?? 0;
      transformedVertices[i + 4] = vertices[i + 4] ?? 0;
    }

    return transformedVertices;
  }

  private normalizedVertices(): Float32Array {
    const normalizationMatrix = mat4.inverse(this.getTransformMatrix());
    return this.transformVertices(this.vertices, normalizationMatrix);
  }

  public setHeight(height: number): void {
    this.transform(this.width, height);
  }

  public setWidth(width: number): void {
    this.transform(width, this.height);
  }

  public transform(
    width: number,
    height: number,
    position: Vec2 = vec2.create(0, 0),
  ) {
    const normalizedVertices = this.normalizedVertices();

    this.width = width;
    this.height = height;
    this.position = position;

    const transformMatrix = this.getTransformMatrix();
    const newVertices = this.transformVertices(
      normalizedVertices,
      transformMatrix,
    );

    this.vertices = newVertices;
    this.vertexBuffer = BufferUtils.createVertexBuffer(
      this.device,
      this.vertices,
    );
  }

  public isPointColliding(point: Float32Array) {
    const x = point[0] ?? 0;
    const y = point[1] ?? 0;

    const objX = this.position[0] ?? 0;
    const objY = this.position[1] ?? 0;

    const isInsideX = x >= objX && x <= objX + this.width;
    const isInsideY = y >= objY && y <= objY + this.height;

    console.log(isInsideX, isInsideY);

    return isInsideX && isInsideY;
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
    passEncoder.drawIndexed(this.indices.length);
  }
}
