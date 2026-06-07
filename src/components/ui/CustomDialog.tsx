"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, AlertTriangle, HelpCircle, Info, Check, Pipette } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DialogOptions {
  type: 'alert' | 'confirm' | 'prompt';
  title: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger' | 'success';
  showColorPicker?: boolean;
  defaultColor?: string;
}

interface CustomDialogComponentProps {
  isOpen: boolean;
  options: DialogOptions;
  onConfirm: (value?: string, color?: string) => void;
  onCancel: () => void;
}

export function CustomDialog({
  isOpen,
  options,
  onConfirm,
  onCancel
}: CustomDialogComponentProps) {
  const [inputValue, setInputValue] = useState("");
  const [selectedColor, setSelectedColor] = useState("default");
  const inputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement | null>(null);

  const handleNativeColorChange = useCallback((e: Event) => {
    const target = e.target as HTMLInputElement;
    setSelectedColor(target.value);
  }, []);

  const colorInputCallbackRef = useCallback((node: HTMLInputElement | null) => {
    if (colorInputRef.current) {
      colorInputRef.current.removeEventListener("change", handleNativeColorChange);
    }
    colorInputRef.current = node;
    if (node) {
      node.addEventListener("change", handleNativeColorChange);
    }
  }, [handleNativeColorChange]);

  // Sync state and focus on prompt opening
  useEffect(() => {
    if (isOpen) {
      setInputValue(options.defaultValue || "");
      setSelectedColor(options.defaultColor || "default");
      if (options.type === "prompt") {
        // Delay slightly for render cycles to complete
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 50);
      }
    }
  }, [isOpen, options.defaultValue, options.defaultColor, options.type]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onConfirm(
        options.type === "prompt" ? inputValue : undefined,
        options.type === "prompt" && options.showColorPicker ? selectedColor : undefined
      );
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  const isDanger = options.variant === "danger";
  const isSuccess = options.variant === "success";

  // Get icon based on type / variant
  const getIcon = () => {
    if (isDanger) return <AlertTriangle className="w-6 h-6 text-rose-500" />;
    if (isSuccess) return <Info className="w-6 h-6 text-emerald-500" />;
    if (options.type === "confirm") return <HelpCircle className="w-6 h-6 text-indigo-500" />;
    return <Info className="w-6 h-6 text-indigo-500 animate-pulse" />;
  };

  // Get icon background theme
  const getIconBg = () => {
    if (isDanger) return "bg-rose-500/10 border-rose-500/20";
    if (isSuccess) return "bg-emerald-500/10 border-emerald-500/20";
    return "bg-indigo-500/10 border-indigo-500/20";
  };

  return (
    <div 
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 w-full max-w-md rounded-[2rem] p-6 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200 relative overflow-hidden">
        
        {/* Glow decoration */}
        <div className={cn(
          "absolute -top-12 -left-12 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none",
          isDanger ? "bg-rose-500" : isSuccess ? "bg-emerald-500" : "bg-indigo-500"
        )}></div>

        {/* Close Button */}
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content Area */}
        <div className="flex gap-4 items-start mt-2">
          <div className={cn("p-3 rounded-2xl border shrink-0 flex items-center justify-center", getIconBg())}>
            {getIcon()}
          </div>

          <div className="flex-1 flex flex-col gap-1.5">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">{options.title}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">{options.message}</p>
          </div>
        </div>

        {/* Prompt Input */}
        {options.type === "prompt" && (
          <div className="px-1 flex flex-col gap-4">
            <input 
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={options.placeholder || "Enter value..."}
              className="w-full h-12 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 px-4 text-zinc-900 dark:text-white font-bold placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm"
            />
            {options.showColorPicker && (
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Select Column Color
                </label>
                <div className="flex flex-wrap items-center gap-2.5">
                  {[
                    { id: 'default', name: 'Gray', class: 'bg-zinc-400 dark:bg-zinc-600 ring-zinc-500/30' },
                    { id: 'emerald', name: 'Green', class: 'bg-emerald-500 ring-emerald-500/30' },
                    { id: 'rose', name: 'Red', class: 'bg-rose-500 ring-rose-500/30' },
                    { id: 'amber', name: 'Orange', class: 'bg-amber-500 ring-amber-500/30' },
                    { id: 'sky', name: 'Blue', class: 'bg-sky-500 ring-sky-500/30' },
                    { id: 'purple', name: 'Purple', class: 'bg-purple-500 ring-purple-500/30' },
                  ].map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setSelectedColor(color.id)}
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 cursor-pointer border-2 border-white dark:border-zinc-900 shadow-md",
                        color.class,
                        selectedColor === color.id ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-zinc-900 scale-105" : "opacity-80 hover:opacity-100"
                      )}
                      title={color.name}
                    >
                      {selectedColor === color.id && <Check className="w-4 h-4 text-white font-bold" />}
                    </button>
                  ))}

                  {/* Custom color picker */}
                  {(() => {
                    const presetIds = ['default', 'emerald', 'rose', 'amber', 'sky', 'purple'];
                    const isCustomColor = !presetIds.includes(selectedColor);
                    return (
                      <div className="relative">
                        <button
                          id="custom-color-btn"
                          type="button"
                          onClick={() => colorInputRef.current?.click()}
                          style={{ background: isCustomColor ? selectedColor : undefined }}
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 cursor-pointer border-2 border-white dark:border-zinc-900 shadow-md",
                            isCustomColor 
                              ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-zinc-900 scale-105" 
                              : "bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 opacity-80 hover:opacity-100 text-white"
                          )}
                          title="Custom Color"
                        >
                          {isCustomColor ? (
                            <Check className={cn("w-4 h-4 font-bold", getContrastColor(selectedColor))} />
                          ) : (
                            <Pipette className="w-4 h-4" />
                          )}
                        </button>
                        <input
                          ref={colorInputCallbackRef}
                          type="color"
                          value={isCustomColor ? selectedColor : "#4f46e5"}
                          onInput={(e) => {
                            const newColor = e.currentTarget.value;
                            const btn = document.getElementById("custom-color-btn");
                            if (btn) {
                              btn.style.background = newColor;
                            }
                          }}
                          className="absolute inset-0 w-0 h-0 opacity-0 pointer-events-none"
                        />
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 mt-2 border-t border-zinc-100 dark:border-white/5 pt-4">
          {options.type !== "alert" && (
            <button
              onClick={onCancel}
              className="h-11 px-5 rounded-xl text-xs font-black uppercase tracking-wider bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white transition-all active:scale-[0.98] cursor-pointer"
            >
              {options.cancelText || "Cancel"}
            </button>
          )}
          
          <button
            onClick={() => onConfirm(
              options.type === "prompt" ? inputValue : undefined,
              options.type === "prompt" && options.showColorPicker ? selectedColor : undefined
            )}
            className={cn(
              "h-11 px-5 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all active:scale-[0.98] shadow-lg cursor-pointer",
              isDanger 
                ? "bg-rose-500 hover:bg-rose-600 shadow-rose-500/10" 
                : "bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/10"
            )}
          >
            {options.confirmText || (options.type === "alert" ? "OK" : "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useCustomDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<DialogOptions>({
    type: 'alert',
    title: '',
    message: '',
  });
  
  const resolveRef = useRef<((value: any) => void) | null>(null);

  const showDialog = useCallback((opts: DialogOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<any>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const confirmCustom = useCallback((
    title: string, 
    message: string, 
    variant: 'primary' | 'danger' | 'success' = 'primary', 
    confirmText = 'Confirm',
    cancelText = 'Cancel'
  ) => {
    return showDialog({
      type: 'confirm',
      title,
      message,
      variant,
      confirmText,
      cancelText
    }) as Promise<boolean>;
  }, [showDialog]);

  const alertCustom = useCallback((
    title: string, 
    message: string,
    confirmText = 'OK'
  ) => {
    return showDialog({
      type: 'alert',
      title,
      message,
      confirmText
    }) as Promise<void>;
  }, [showDialog]);

  const promptCustom = useCallback((
    title: string, 
    message: string, 
    defaultValue = '', 
    placeholder = '', 
    confirmText = 'Submit',
    cancelText = 'Cancel',
    showColorPicker = false,
    defaultColor = 'default'
  ) => {
    return showDialog({
      type: 'prompt',
      title,
      message,
      defaultValue,
      placeholder,
      confirmText,
      cancelText,
      showColorPicker,
      defaultColor
    }) as Promise<any>;
  }, [showDialog]);

  const handleConfirm = useCallback((value?: string, color?: string) => {
    setIsOpen(false);
    if (resolveRef.current) {
      if (options.type === 'prompt') {
        if (options.showColorPicker) {
          resolveRef.current({ title: value ?? "", color: color ?? "default" });
        } else {
          resolveRef.current(value ?? null);
        }
      } else if (options.type === 'confirm') {
        resolveRef.current(true);
      } else {
        resolveRef.current(undefined);
      }
      resolveRef.current = null;
    }
  }, [options.type, options.showColorPicker]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    if (resolveRef.current) {
      if (options.type === 'prompt') {
        resolveRef.current(null);
      } else if (options.type === 'confirm') {
        resolveRef.current(false);
      } else {
        resolveRef.current(undefined);
      }
      resolveRef.current = null;
    }
  }, [options.type]);

  const dialogProps = {
    isOpen,
    options,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
  };

  return {
    alertCustom,
    confirmCustom,
    promptCustom,
    dialogProps
  };
}

// Helper to determine if a hex color is light or dark
function getContrastColor(hexColor: string) {
  if (!hexColor || !hexColor.startsWith("#")) return "text-white";
  try {
    const hex = hexColor.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 140 ? "text-zinc-950" : "text-white";
  } catch (e) {
    return "text-white";
  }
}
