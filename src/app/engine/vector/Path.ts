import { type Vec2 } from "wgpu-matrix";

type MoveTo = { type: "move"; point: Vec2 };

type LineTo = { type: "line"; point: Vec2 };

type QuadraticCurveTo = {
  type: "quadratic";
  point: Vec2;
  control: Vec2;
};

type CubicCurveTo = {
  type: "cubic";
  point: Vec2;
  control1: Vec2;
  control2: Vec2;
};

type Close = { type: "close" };
export type VertexList = Float32Array;

export type PathElement =
  | MoveTo
  | LineTo
  | QuadraticCurveTo
  | CubicCurveTo
  | Close;

export class Path {
  elements: PathElement[] = [];

  moveTo(point: Vec2) {
    this.elements.push({ type: "move", point });
  }

  lineTo(point: Vec2) {
    this.elements.push({ type: "line", point });
  }

  quadraticCurveTo(point: Vec2, control: Vec2) {
    this.elements.push({ type: "quadratic", point, control });
  }

  cubicCurveTo(point: Vec2, control1: Vec2, control2: Vec2) {
    this.elements.push({ type: "cubic", point, control1, control2 });
  }

  close() {
    this.elements.push({ type: "close" });
  }

  clear() {
    this.elements = [];
  }

  getVertices(): VertexList[] {
    const vertices: number[][] = [];
    let currentShape: number[] = [];

    for (const element of this.elements) {
      if (element.type === "move") {
        if (currentShape.length > 1) {
          vertices.push(currentShape);
        }
        currentShape = [element.point[0] ?? 0, element.point[1] ?? 0];
        continue;
      }

      if (element.type === "line") {
        currentShape.push(element.point[0] ?? 0, element.point[1] ?? 0);
        continue;
      }

      if (element.type === "close") {
        vertices.push(currentShape);
        currentShape = [];
        continue;
      }

      throw new Error("Invalid path element type");
    }

    return vertices.map((vertex) => new Float32Array(vertex));
  }
}
