"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { X, UploadCloud, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { RetroCard } from "@/types";
import { GifPicker, CustomDialog, useCustomDialog } from "@/ui";

interface RetroInsightModalProps {
  isOpen: boolean;
  columnTitle: string;
  columnColor?: string;
  card?: RetroCard | null; // null for add, RetroCard for edit
  onSave: (text: string, imageUrl: string | null) => Promise<void>;
  onCancel: () => void;
}

const colorThemes: Record<string, {
  border: string;
  glow: string;
  badge: string;
  text: string;
  line: string;
  primaryButton: string;
}> = {
  emerald: {
    border: "border-emerald-500/20 focus-within:border-emerald-500/50",
    glow: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    text: "text-emerald-500",
    line: "bg-emerald-500",
    primaryButton: "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20"
  },
  rose: {
    border: "border-rose-500/20 focus-within:border-rose-500/50",
    glow: "bg-rose-500",
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    text: "text-rose-500",
    line: "bg-rose-500",
    primaryButton: "bg-rose-600 hover:bg-rose-500 shadow-rose-500/20"
  },
  amber: {
    border: "border-amber-500/20 focus-within:border-amber-500/50",
    glow: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    text: "text-amber-500",
    line: "bg-amber-500",
    primaryButton: "bg-amber-600 hover:bg-emerald-500 shadow-amber-500/20"
  },
  sky: {
    border: "border-sky-500/20 focus-within:border-sky-500/50",
    glow: "bg-sky-500",
    badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    text: "text-sky-500",
    line: "bg-sky-500",
    primaryButton: "bg-sky-600 hover:bg-sky-500 shadow-sky-500/20"
  },
  purple: {
    border: "border-purple-500/20 focus-within:border-purple-500/50",
    glow: "bg-purple-500",
    badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    text: "text-purple-500",
    line: "bg-purple-500",
    primaryButton: "bg-purple-600 hover:bg-purple-500 shadow-purple-500/20"
  },
  default: {
    border: "border-zinc-500/20 focus-within:border-zinc-500/50",
    glow: "bg-zinc-500",
    badge: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
    text: "text-zinc-500",
    line: "bg-zinc-500",
    primaryButton: "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20"
  }
};

const getTheme = (title: string, color?: string) => {
  const activeColor = color && colorThemes[color] ? color : "default";
  if (activeColor !== "default") return colorThemes[activeColor];

  const t = title.toLowerCase();
  if (t.includes("well") || t.includes("good") || t.includes("happy") || t.includes("positive")) {
    return colorThemes.emerald;
  }
  if (t.includes("improve") || t.includes("bad") || t.includes("sad") || t.includes("neg") || t.includes("concern")) {
    return colorThemes.rose;
  }
  if (t.includes("action") || t.includes("task") || t.includes("todo")) {
    return colorThemes.purple;
  }
  return colorThemes.default;
};

export function RetroInsightModal({
  isOpen,
  columnTitle,
  columnColor,
  card = null,
  onSave,
  onCancel
}: RetroInsightModalProps) {
  const { alertCustom, confirmCustom, dialogProps } = useCustomDialog();
  const modalRef = useRef<HTMLDivElement>(null);
  
  const [text, setText] = useState(card?.text || "");
  const [imageUrl, setImageUrl] = useState(card?.imageUrl || "");
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const theme = getTheme(columnTitle, columnColor);

  const handleClose = useCallback(async () => {
    const originalText = card?.text || "";
    const originalImageUrl = card?.imageUrl || "";
    const hasUnsavedChanges = text.trim() !== originalText.trim() || imageUrl.trim() !== originalImageUrl.trim();

    if (hasUnsavedChanges) {
      const confirmed = await confirmCustom(
        "Discard Changes",
        "Are you sure you want to discard your draft? Your changes will be lost.",
        "danger",
        "Discard"
      );
      if (!confirmed) return;
    }
    onCancel();
  }, [text, imageUrl, card, onCancel, confirmCustom]);

  // Handle escape key press
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      await alertCustom("File Too Large", "Image size must be below 5MB to ensure fast loading times.");
      return;
    }

    const reader = new FileReader();
    if (file.type === "image/gif") {
      reader.onload = (ev) => setImageUrl(ev.target?.result as string);
      reader.readAsDataURL(file);
      return;
    }

    reader.onload = (ev) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 600;
        let scaleSize = 1;
        if (img.width > MAX_WIDTH) {
          scaleSize = MAX_WIDTH / img.width;
        }
        canvas.width = img.width * scaleSize;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setImageUrl(dataUrl);
      };
      if (typeof ev.target?.result === "string") {
        img.src = ev.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSubmit = async () => {
    if (!text.trim() && !imageUrl.trim()) return;
    setIsSubmitting(true);
    try {
      await onSave(text.trim(), imageUrl.trim() || null);
    } catch (error) {
      console.error("Failed to save retro card insight:", error);
      await alertCustom("Save Error", "Failed to save card. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 w-full max-w-2xl rounded-[2rem] p-6 sm:p-8 shadow-2xl flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200 relative overflow-hidden max-h-[90vh]"
      >
        {/* Dynamic color glow matching option 1 design choice */}
        <div className={cn("absolute -top-12 -left-12 w-24 h-24 rounded-full blur-2xl opacity-15 pointer-events-none", theme.glow)}></div>
        
        {/* Color bar indicator at top */}
        <div className={cn("absolute top-0 left-0 right-0 h-[4px] z-20", theme.line)}></div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          aria-label="Close insight form"
          className="absolute top-4 right-4 p-3 rounded-2xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex items-center gap-2">
            <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border tracking-wider", theme.badge)}>
              {columnTitle}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            {card ? "Edit Insight Card" : "Add Insight Card"}
          </h3>
        </div>

        {/* Form Body */}
        <div className="flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
          {imageUrl && (
            <div className="relative w-full min-h-[250px] rounded-2xl overflow-hidden bg-black/5 dark:bg-black/40 border border-zinc-200 dark:border-white/5 flex items-center justify-center">
              <Image
                src={imageUrl}
                alt="Upload preview"
                fill
                unoptimized
                className="object-contain opacity-95"
              />
              <button
                onClick={() => setImageUrl("")}
                className="absolute top-3 right-3 bg-black/60 hover:bg-black p-2 rounded-full text-white transition-colors cursor-pointer"
                title="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className={cn(
            "relative rounded-2xl border bg-zinc-50/30 dark:bg-zinc-950/40 p-4 focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:bg-white dark:focus-within:bg-zinc-950/60 transition-all duration-300",
            theme.border
          )}>
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your thought..."
              className="w-full bg-transparent border-none text-zinc-900 dark:text-white text-sm sm:text-base focus:outline-none resize-none min-h-[140px] custom-scrollbar placeholder-zinc-400 dark:placeholder-zinc-600 font-medium"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveSubmit();
                }
              }}
            />
          </div>

          {showGifPicker && (
            <div className="border border-zinc-200 dark:border-white/5 rounded-2xl p-4 bg-zinc-50/50 dark:bg-zinc-950/20">
              <GifPicker
                onSelect={(url) => {
                  setImageUrl(url);
                  setShowGifPicker(false);
                }}
                onClose={() => setShowGifPicker(false)}
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <label
              title="Upload Image"
              className="h-10 px-4 rounded-xl transition-all flex items-center justify-center gap-2 bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10 hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer active:scale-95 border border-zinc-200/50 dark:border-white/5 text-[11px] font-black uppercase tracking-wider whitespace-nowrap"
            >
              <UploadCloud className="h-4 w-4" />
              <span>Image</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
            
            <button
              title="Add GIF"
              onClick={() => setShowGifPicker(!showGifPicker)}
              className={cn(
                "h-10 px-4 rounded-xl transition-all flex items-center justify-center border border-zinc-200/50 dark:border-white/5 active:scale-95 text-[11px] font-black uppercase tracking-wider cursor-pointer whitespace-nowrap",
                showGifPicker
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 border-transparent"
                  : "bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10 hover:border-zinc-300 dark:hover:border-zinc-700"
              )}
            >
              <span>GIF</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl active:scale-95 text-xs font-black uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSubmit}
              disabled={isSubmitting || (!text.trim() && !imageUrl.trim())}
              className={cn(
                "text-white h-10 px-5 rounded-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider disabled:opacity-50 disabled:pointer-events-none",
                theme.primaryButton
              )}
            >
              {card ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              <span>{card ? "Save" : "Post"}</span>
            </button>
          </div>
        </div>
      </div>

      <CustomDialog {...dialogProps} />
    </div>
  );
}
