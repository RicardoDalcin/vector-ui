/* eslint-disable @typescript-eslint/no-empty-function */
import { Renderer } from "./Engine";

export async function test(container: HTMLElement, canvas: HTMLCanvasElement) {
  container.addEventListener("dblclick", () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => console.error(err));
    } else {
      container.requestFullscreen().catch((err) => console.error(err));
    }
  });

  if (!navigator.gpu) {
    throw "Your current browser does not support WebGPU!";
  }

  const renderer = new Renderer(canvas);
  await renderer.initialize();

  return () => {
    window.removeEventListener("resize", () => {});
    container.removeEventListener("dblclick", () => {});
  };
}
