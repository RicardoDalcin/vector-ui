"use client";

import classNames from "classnames";
import { useEffect, useRef, useState } from "react";

import {
  Engine,
  type MouseMoveOptions,
  type MouseEventOptions,
} from "./engine/Engine";
import { vec2 } from "wgpu-matrix";

enum EditorMode {
  Move = "move",
  Rectangle = "rectangle",
}

const EventUtils = {
  isControlPressed: (event: KeyboardEvent | WheelEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    return isMac ? event.metaKey : event.ctrlKey;
  },
  getMouseEvent(event: MouseEvent): MouseEventOptions {
    const BUTTON_TYPES = ["left", "middle", "right"] as const;
    const button = BUTTON_TYPES[event.button] ?? "left";
    const position = vec2.create(event.clientX, event.clientY);

    return {
      button,
      position,
    };
  },
  getMouseMoveEvent(event: MouseEvent): MouseMoveOptions {
    const position = vec2.create(event.clientX, event.clientY);
    const movement = vec2.create(event.movementX, event.movementY);

    return {
      position,
      movement,
    };
  },
};

async function setupEngine(canvas: HTMLCanvasElement) {
  if (!navigator.gpu) {
    throw "Your current browser does not support WebGPU!";
  }

  const engine = new Engine(canvas);
  await engine.initialize();

  return engine;
}

function bindEngineEvents(engine: Engine, container: HTMLElement) {
  window.addEventListener("resize", () => engine.resize());

  window.addEventListener("keydown", (event) => {
    const isControlPressed = EventUtils.isControlPressed(event);

    if ((event.key === "=" || event.key === "+") && isControlPressed) {
      event.preventDefault();
      engine.zoomIn();
    }

    if (event.key === "-" && isControlPressed) {
      event.preventDefault();
      engine.zoomOut();
    }
  });

  window.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
    },
    { passive: false },
  );

  container.addEventListener(
    "wheel",
    (event) => {
      const isControlPressed = EventUtils.isControlPressed(event);

      if (isControlPressed) {
        event.preventDefault();

        if (event.deltaY < 0) {
          engine.zoomIn();
        }

        if (event.deltaY > 0) {
          engine.zoomOut();
        }
      }
    },
    { passive: false },
  );

  container.addEventListener("mousedown", (event) => {
    event.preventDefault();
    engine.onMouseDown(EventUtils.getMouseEvent(event));
  });

  window.addEventListener("mouseup", (event) => {
    event.preventDefault();
    engine.onMouseUp(EventUtils.getMouseEvent(event));
  });

  window.addEventListener("mousemove", (event) => {
    event.preventDefault();
    engine.onMouseMove(EventUtils.getMouseMoveEvent(event));
  });
}

export default function Home() {
  const [editorMode, setEditorMode] = useState<EditorMode>(EditorMode.Move);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Engine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) {
      return;
    }

    const setup = async () => {
      engine.current = await setupEngine(canvas);
      bindEngineEvents(engine.current, container);
    };

    void setup();
  }, []);

  return (
    <main className="flex h-screen w-screen flex-col divide-y divide-neutral-700 overflow-hidden">
      <nav className="h-[56px] w-full bg-neutral-800">
        <button
          onClick={() => setEditorMode(EditorMode.Move)}
          className={classNames("h-[56px] w-[56px]", {
            "bg-blue-500": editorMode === EditorMode.Move,
          })}
        >
          V
        </button>

        <button
          onClick={() => setEditorMode(EditorMode.Rectangle)}
          className={classNames("h-[56px] w-[56px]", {
            "bg-blue-500": editorMode === EditorMode.Rectangle,
          })}
        >
          R
        </button>
      </nav>

      <div className="flex h-full w-full divide-x divide-neutral-700">
        <div className="h-full w-72 shrink-0 bg-neutral-800">
          <ul className="flex flex-col">
            <li className="flex h-10 items-center border border-transparent px-4 hover:border-blue-500">
              Frame 1
            </li>
            <li className="flex h-10 items-center border border-transparent px-4 hover:border-blue-500">
              Frame 2
            </li>
            <li className="flex h-10 items-center border border-transparent px-4 hover:border-blue-500">
              Frame 3
            </li>
          </ul>
        </div>

        <div ref={containerRef} className="h-full flex-1 bg-neutral-900">
          <canvas ref={canvasRef} className="h-full w-full" />
        </div>

        <div className="h-full w-72 shrink-0 bg-neutral-800">Right bar</div>
      </div>
    </main>
  );
}
