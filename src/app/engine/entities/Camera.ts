import { mat4, vec2, vec3, type Vec2 } from "wgpu-matrix";

// Figma like design tool for WebGPU
// Camera is 2D with pan and zoom
export class Camera {
  position: Vec2;
  zoom: number;
  clientWidth: number;
  clientHeight: number;

  constructor(clientWidth: number, clientHeight: number) {
    this.position = vec2.create(0, 0);
    this.zoom = 1;
    this.clientWidth = clientWidth;
    this.clientHeight = clientHeight;
  }

  pan(delta: Vec2) {
    vec2.add(this.position, this.position, delta);
  }

  zoomIn() {
    this.zoom *= 1.1;
  }

  zoomOut() {
    this.zoom /= 1.1;
  }

  getViewMatrix() {
    const viewMatrix = mat4.lookAt([0, 0, 1], [0, 0, 0], [0, 1, 0]);
    return viewMatrix;
  }

  getProjectionMatrix() {
    return mat4.ortho(0, this.clientWidth, this.clientHeight, 0, -1, 1);
  }

  getCameraMatrix() {
    const viewMatrix = this.getViewMatrix();
    const projectionMatrix = this.getProjectionMatrix();

    const cameraMatrix = mat4.create();
    mat4.multiply(projectionMatrix, viewMatrix, cameraMatrix);

    return cameraMatrix;
  }
}
