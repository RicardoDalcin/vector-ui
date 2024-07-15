"use client";

import classNames from "classnames";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  Engine,
  type MouseMoveOptions,
  type MouseEventOptions,
  EditorMode,
  type EngineCallbacks,
} from "./engine/Engine";
import { vec2 } from "wgpu-matrix";

const EventUtils = {
  isControlPressed: (event: KeyboardEvent | WheelEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    return isMac ? event.metaKey : event.ctrlKey;
  },
  getMouseEvent(
    event: MouseEvent,
    canvas: HTMLCanvasElement,
  ): MouseEventOptions {
    const BUTTON_TYPES = ["left", "middle", "right"] as const;
    const button = BUTTON_TYPES[event.button] ?? "left";

    const x = event.clientX - canvas.offsetLeft;
    const y = event.clientY - canvas.offsetTop;
    const position = vec2.create(x, y);

    return {
      button,
      position,
    };
  },
  getMouseMoveEvent(
    event: MouseEvent,
    canvas: HTMLCanvasElement,
  ): MouseMoveOptions {
    const x = event.clientX - canvas.offsetLeft;
    const y = event.clientY - canvas.offsetTop;

    const position = vec2.create(x, y);
    const movement = vec2.create(event.movementX, event.movementY);

    return {
      position,
      movement,
    };
  },
};

async function setupEngine(
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
) {
  if (!navigator.gpu) {
    throw "Your current browser does not support WebGPU!";
  }

  const engine = new Engine(canvas, callbacks);
  await engine.initialize();

  return engine;
}

export default function Home() {
  const [editorMode, setEditorMode] = useState<EditorMode>(EditorMode.Move);
  const [isDragging, setIsDragging] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Engine | null>(null);

  const initialized = useRef(false);

  const isMacOs = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  const changeEditorMode = useCallback((mode: EditorMode) => {
    engine.current?.setEditorMode(mode);
    setEditorMode(mode);
  }, []);

  const bindEngineEvents = useCallback(
    (engine: Engine, container: HTMLElement) => {
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

        if (event.key === "v" && !isControlPressed) {
          event.preventDefault();
          changeEditorMode(EditorMode.Move);
        }

        if (event.key === "r" && !isControlPressed) {
          event.preventDefault();
          changeEditorMode(EditorMode.Rectangle);
        }

        if (event.key === "h" && !isControlPressed) {
          event.preventDefault();
          changeEditorMode(EditorMode.Hand);
        }

        if (event.key === " " && !isControlPressed) {
          event.preventDefault();
          engine.setDragging(true);
          setIsDragging(true);
        }
      });

      window.addEventListener("keyup", (event) => {
        if (event.key === " ") {
          event.preventDefault();
          engine.setDragging(false);
          setIsDragging(false);
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
        const canvas = canvasRef.current;
        if (!canvas) {
          return;
        }
        event.preventDefault();
        engine.onMouseDown(EventUtils.getMouseEvent(event, canvas));
        setIsMouseDown(true);
      });

      window.addEventListener("mouseup", (event) => {
        const canvas = canvasRef.current;
        if (!canvas) {
          return;
        }
        event.preventDefault();
        engine.onMouseUp(EventUtils.getMouseEvent(event, canvas));
        setIsMouseDown(false);
      });

      window.addEventListener("mousemove", (event) => {
        const canvas = canvasRef.current;
        if (!canvas) {
          return;
        }
        event.preventDefault();
        engine.onMouseMove(EventUtils.getMouseMoveEvent(event, canvas));
      });
    },
    [changeEditorMode],
  );

  useEffect(() => {
    if (initialized.current) {
      return;
    }

    initialized.current = true;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) {
      return;
    }

    const setup = async () => {
      engine.current = await setupEngine(canvas, {
        onEditorModeChange: (mode) => {
          setEditorMode(mode);
        },
      });
      bindEngineEvents(engine.current, container);
      engine.current.setEditorMode(EditorMode.Move);
    };

    void setup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main
      className={classNames(
        "flex h-screen w-screen flex-col divide-y divide-neutral-700 overflow-hidden",
        {
          "cursor-auto": !isDragging && editorMode !== EditorMode.Hand,
          "cursor-grab":
            (isDragging || editorMode === EditorMode.Hand) &&
            !isMouseDown &&
            isMacOs,
          "cursor-grabbing":
            (isDragging || editorMode === EditorMode.Hand) &&
            isMouseDown &&
            isMacOs,
        },
      )}
    >
      <nav className="h-[56px] w-full bg-neutral-800">
        <button
          onClick={() => changeEditorMode(EditorMode.Move)}
          className={classNames("h-[56px] w-[56px]", {
            "bg-blue-500": editorMode === EditorMode.Move,
          })}
        >
          V
        </button>

        <button
          onClick={() => changeEditorMode(EditorMode.Rectangle)}
          className={classNames("h-[56px] w-[56px]", {
            "bg-blue-500": editorMode === EditorMode.Rectangle,
          })}
        >
          R
        </button>

        <button
          onClick={() => changeEditorMode(EditorMode.Hand)}
          className={classNames("h-[56px] w-[56px]", {
            "bg-blue-500": editorMode === EditorMode.Hand,
          })}
        >
          H
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
