"use client";

import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface DraggableEmojiPickerProps {
  children: React.ReactNode;
  defaultClassName?: string;
}

export function DraggableEmojiPicker({ children, defaultClassName }: DraggableEmojiPickerProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag when clicking the drag handle, not inside the emoji picker content
    const target = e.target as HTMLElement;
    if (!target.closest(".drag-handle")) return;

    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore errors if pointer capture release fails
    }
  };

  return (
    <div
      ref={elementRef}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
      className={cn(
        "absolute z-[100] shadow-[0_25px_60px_rgba(0,0,0,0.5)] bg-zinc-950/95 dark:bg-black/95 backdrop-blur-md rounded-2xl border border-zinc-200/20 dark:border-white/10 overflow-hidden flex flex-col transition-shadow duration-300",
        isDragging && "shadow-[0_30px_70px_rgba(99,102,241,0.3)] ring-2 ring-indigo-500/30 border-indigo-500/40",
        defaultClassName
      )}
    >
      {/* Drag Handle */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ touchAction: "none" }}
        className="drag-handle h-9 bg-zinc-900/50 dark:bg-white/5 border-b border-zinc-200/10 dark:border-white/5 flex items-center justify-between px-3 cursor-grab active:cursor-grabbing select-none shrink-0"
      >
        <div className="flex items-center gap-2">
          {/* Grip dots icon */}
          <div className="grid grid-cols-2 gap-[2px] pointer-events-none opacity-55">
            <span className="w-1 h-1 rounded-full bg-current"></span>
            <span className="w-1 h-1 rounded-full bg-current"></span>
            <span className="w-1 h-1 rounded-full bg-current"></span>
            <span className="w-1 h-1 rounded-full bg-current"></span>
            <span className="w-1 h-1 rounded-full bg-current"></span>
            <span className="w-1 h-1 rounded-full bg-current"></span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 select-none pointer-events-none">
            DRAG_WINDOW
          </span>
        </div>
        <button
          type="button"
          onClick={() => setPosition({ x: 0, y: 0 })}
          className="text-[9px] font-bold text-zinc-500 hover:text-white dark:text-zinc-400 dark:hover:text-white px-2 py-0.5 rounded bg-zinc-800 dark:bg-white/5 hover:bg-zinc-700 dark:hover:bg-white/10 transition-colors uppercase tracking-wider"
          title="Reset position to default"
        >
          Reset
        </button>
      </div>

      {/* Content area */}
      <div className="p-1 select-none">
        {children}
      </div>
    </div>
  );
}
