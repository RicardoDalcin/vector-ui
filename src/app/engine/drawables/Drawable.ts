import { type Vec2 } from "wgpu-matrix";

export interface Drawable {
  id: string;

  isPointColliding(point: Vec2): boolean;
  draw(passEncoder: GPURenderPassEncoder): void;
  move(delta: Vec2): void;
}
