"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { RETRO_TEMPLATES, RetroTemplatePreset } from "@/constants";

interface RetroTemplateModalProps {
  isOpen: boolean;
  onSelectPreset: (presetId: string) => void;
  onCancel: () => void;
}

export function RetroTemplateModal({
  isOpen,
  onSelectPreset,
  onCancel
}: RetroTemplateModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal on Escape key press
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCancel();
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const getColColorClass = (color: string) => {
    switch (color) {
      case "emerald":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "rose":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "amber":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "sky":
        return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
      case "purple":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 w-full max-w-4xl rounded-[2.5rem] p-6 sm:p-8 shadow-2xl flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200 relative overflow-hidden max-h-[90vh]"
      >
        {/* Glow decoration */}
        <div className="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-indigo-500 blur-2xl opacity-20 pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={onCancel}
          aria-label="Close template selector"
          className="absolute top-4 right-4 p-3 rounded-2xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col gap-1.5 mt-2">
          <h3 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            Select Retrospective Template
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
            Agile speed redefined. Choose a structured framework to kick off your retrospective board.
          </p>
        </div>

        {/* Scrollable Templates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-1 pb-2 custom-scrollbar">
          {RETRO_TEMPLATES.map((preset: RetroTemplatePreset) => (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset.id)}
              className={cn(
                "group relative flex flex-col text-left p-5 rounded-3xl border border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.05] transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer hover:border-indigo-500/30 hover:shadow-lg dark:hover:border-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              )}
            >
              {/* Preset Icon */}
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-2xl flex items-center justify-center mb-4 transition-all group-hover:scale-110">
                {preset.icon}
              </div>

              {/* Preset Name */}
              <h4 className="text-base font-black text-zinc-900 dark:text-white mb-1 tracking-tight">
                {preset.name}
              </h4>

              {/* Preset Description */}
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium mb-4 flex-grow">
                {preset.description}
              </p>

              {/* Column Previews */}
              <div className="flex flex-wrap gap-1.5 mt-auto pt-2 border-t border-zinc-100 dark:border-white/5">
                {preset.columns.map((col, idx) => (
                  <span
                    key={`preset-col-${preset.id}-${idx}`}
                    className={cn(
                      "text-[9px] font-bold px-2 py-0.5 rounded-lg border",
                      getColColorClass(col.color)
                    )}
                  >
                    {col.title}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
