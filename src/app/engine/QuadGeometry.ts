export class QuadGeometry {
  vertices: Float32Array;
  indices: Uint16Array;

  constructor() {
    const x = 0;
    const y = 0;

    const w = 100;
    const h = 100;

    this.vertices = new Float32Array([
      ...[x, y, 0.0, 1.0, 1.0, 1.0, 1.0], // bottom left
      ...[x + w, y, 1.0, 1.0, 1.0, 1.0, 1.0], // bottom right
      ...[x + w, y + h, 0.0, 0.0, 1.0, 1.0, 1.0], // top left
      ...[x, y + h, 1.0, 0.0, 1.0, 1.0, 1.0], // top right
    ]);
    this.indices = new Uint16Array([0, 1, 2, 1, 2, 3]);
  }
}
