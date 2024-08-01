import { vec2, type Vec2 } from "wgpu-matrix";

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

  constructor(vertices: Float32Array) {
    this.vertices = vertices;
    this.boundingBoxVertices = new Float32Array(4);
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
  }

  public updateGeometry(vertices: Float32Array) {
    this.vertices = vertices;
    this.rebuild();
  }
}
