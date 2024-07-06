export interface Drawable {
  draw(passEncoder: GPURenderPassEncoder): void;
}
