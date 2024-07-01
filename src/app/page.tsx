"use client";

import classNames from "classnames";
import { useEffect, useRef, useState } from "react";
import { test } from "./engine/test";

enum EditorMode {
  Move = "move",
  Rectangle = "rectangle",
}

export default function Home() {
  const [editorMode, setEditorMode] = useState<EditorMode>(EditorMode.Move);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) {
      return;
    }

    void test(container, canvas);
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
