import { type Mat4, vec2, type Vec2, vec4 } from "wgpu-matrix";
import { BasicMaterial } from "../materials/BasicMaterial/BasicMaterial";
import { BufferUtils } from "../BufferUtils";

export interface Object {
  id: string;

  draw(passEncoder: GPURenderPassEncoder): void;

  getPosition(): Vec2;
  moveTo(position: Vec2): void;

  getSize(): { width: number; height: number };
  resize(width: number, height: number): void;

  isPointColliding(point: Vec2): boolean;
}

export class BoundingBox {
  private vertices: Float32Array;
  private boundingBoxVertices: Float32Array;

  private device: GPUDevice;

  private uniformBuffer: GPUBuffer;
  private vertexBuffer!: GPUBuffer;

  private material: BasicMaterial;

  constructor(
    vertices: Float32Array,
    device: GPUDevice,
    format: GPUTextureFormat,
  ) {
    this.device = device;

    this.vertices = vertices;
    this.boundingBoxVertices = new Float32Array(4);

    this.uniformBuffer = BufferUtils.createUniformBuffer(
      device,
      new Float32Array(16),
    );
    this.material = new BasicMaterial(
      device,
      format,
      this.uniformBuffer,
      "line-strip",
    );

    this.material.setFillColor(vec4.create(0.3, 0.3, 1.0, 1.0));

    this.rebuild();
  }

  public getSize() {
    const minX = this.boundingBoxVertices[0] ?? 0;
    const minY = this.boundingBoxVertices[1] ?? 0;
    const maxX = this.boundingBoxVertices[2] ?? 0;
    const maxY = this.boundingBoxVertices[3] ?? 0;

    return {
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  public getPosition() {
    const x = this.boundingBoxVertices[0] ?? 0;
    const y = this.boundingBoxVertices[1] ?? 0;

    return vec2.create(x, y);
  }

  private rebuild() {
    if (this.vertices.length < 3) {
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < this.vertices.length; i += 2) {
      const x = this.vertices[i] ?? 0;
      const y = this.vertices[i + 1] ?? 0;

      if (x < minX) {
        minX = x;
      }

      if (y < minY) {
        minY = y;
      }

      if (x > maxX) {
        maxX = x;
      }

      if (y > maxY) {
        maxY = y;
      }
    }

    this.boundingBoxVertices[0] = minX;
    this.boundingBoxVertices[1] = minY;
    this.boundingBoxVertices[2] = maxX;
    this.boundingBoxVertices[3] = maxY;

    // prettier-ignore
    const vertices = new Float32Array([
      this.boundingBoxVertices[0], this.boundingBoxVertices[1],
      this.boundingBoxVertices[0], this.boundingBoxVertices[3],
      this.boundingBoxVertices[2], this.boundingBoxVertices[3],
      this.boundingBoxVertices[2], this.boundingBoxVertices[1],
      this.boundingBoxVertices[0], this.boundingBoxVertices[1],
    ])

    this.vertexBuffer = BufferUtils.createVertexBuffer(this.device, vertices);
  }

  public updateGeometry(vertices: Float32Array) {
    this.vertices = vertices;
    this.rebuild();
  }

  public draw(passEncoder: GPURenderPassEncoder, cameraMatrix: Mat4) {
    if (this.vertices.length < 3) {
      return;
    }

    const asArrayBuffer = new Float32Array(cameraMatrix);

    this.device.queue.writeBuffer(
      this.uniformBuffer,
      0,
      asArrayBuffer.buffer,
      asArrayBuffer.byteOffset,
      asArrayBuffer.byteLength,
    );

    this.material.writeBuffers();

    passEncoder.setPipeline(this.material.pipeline);
    passEncoder.setVertexBuffer(0, this.vertexBuffer);
    this.material.setBindGroups(passEncoder);
    passEncoder.draw(5, 1, 0, 0);
  }
}
