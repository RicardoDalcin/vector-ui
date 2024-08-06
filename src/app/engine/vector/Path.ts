import { type Mat4, vec2, type Vec2 } from "wgpu-matrix";
import PolygonClipping, { type Geom } from "polygon-clipping";

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

  transform(transformMatrix: Mat4) {
    this.elements = this.elements.map((element) => {
      if (element.type === "move") {
        return {
          type: "move",
          point: vec2.transformMat4(element.point, transformMatrix),
        };
      }

      if (element.type === "line") {
        return {
          type: "line",
          point: vec2.transformMat4(element.point, transformMatrix),
        };
      }

      if (element.type === "quadratic") {
        return {
          type: "quadratic",
          point: vec2.transformMat4(element.point, transformMatrix),
          control: vec2.transformMat4(element.control, transformMatrix),
        };
      }

      if (element.type === "cubic") {
        return {
          type: "cubic",
          point: vec2.transformMat4(element.point, transformMatrix),
          control1: vec2.transformMat4(element.control1, transformMatrix),
          control2: vec2.transformMat4(element.control2, transformMatrix),
        };
      }

      if (element.type === "close") {
        return { type: "close" };
      }

      throw new Error("Invalid path element type");
    });
  }

  getVertices(): VertexList[] {
    const vertices: number[][] = [];
    let currentShapeIndex = 0;
    let currentShape: number[] = [];

    for (const element of this.elements) {
      if (element.type === "move") {
        if (currentShape.length > 1) {
          vertices.push(currentShape);
        }
        currentShape = [element.point[0] ?? 0, element.point[1] ?? 0];
        vertices[currentShapeIndex] = currentShape;
        continue;
      }

      if (element.type === "line") {
        currentShape.push(element.point[0] ?? 0, element.point[1] ?? 0);
        vertices[currentShapeIndex] = currentShape;
        continue;
      }

      if (element.type === "close") {
        vertices[currentShapeIndex] = currentShape;
        currentShape = [];
        currentShapeIndex += 1;
        continue;
      }

      throw new Error("Invalid path element type");
    }

    if (currentShape.length > 1) {
      vertices[currentShapeIndex] = currentShape;
    }

    const splitVertices = this.getSplitIntersections(vertices);

    return splitVertices.map((vertex) => new Float32Array(vertex));
  }

  private getSplitIntersections(vertices: number[][]): number[][] {
    const geometry: Geom = vertices.map((polygon) => {
      const pairs = [];
      for (let i = 0; i < polygon.length; i += 2) {
        pairs.push([polygon[i] ?? 0, polygon[i + 1] ?? 0] as [number, number]);
      }
      return pairs;
    });

    const unionResult = PolygonClipping.union(geometry);

    const flattened = unionResult.flat().map((poly) => poly.flat());

    return flattened;
  }
}
