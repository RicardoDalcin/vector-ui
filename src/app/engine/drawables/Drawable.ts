import { type Vec2 } from "wgpu-matrix";

export interface Drawable {
  id: string;

  isPointInShape(point: Vec2): boolean;
  isPointInBoundingBox(point: Vec2): boolean;
  draw(passEncoder: GPURenderPassEncoder): void;
  move(delta: Vec2): void;
  getPosition(): Vec2;
  setPosition(position: Vec2): void;
  setHeight(height: number): void;
  setWidth(width: number): void;
  setIsSelected(isSelected: boolean): void;
}
