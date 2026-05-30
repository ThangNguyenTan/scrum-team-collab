"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, AlertTriangle, HelpCircle, Info } from "lucide-react";
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
}

interface CustomDialogComponentProps {
  isOpen: boolean;
  options: DialogOptions;
  onConfirm: (value?: string) => void;
  onCancel: () => void;
}

export function CustomDialog({
  isOpen,
  options,
  onConfirm,
  onCancel
}: CustomDialogComponentProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync state and focus on prompt opening
  useEffect(() => {
    if (isOpen) {
      setInputValue(options.defaultValue || "");
      if (options.type === "prompt") {
        // Delay slightly for render cycles to complete
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 50);
      }
    }
  }, [isOpen, options.defaultValue, options.type]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onConfirm(options.type === "prompt" ? inputValue : undefined);
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
          <div className="px-1">
            <input 
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={options.placeholder || "Enter value..."}
              className="w-full h-12 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 px-4 text-zinc-900 dark:text-white font-bold placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm"
            />
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
            onClick={() => onConfirm(options.type === "prompt" ? inputValue : undefined)}
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
    cancelText = 'Cancel'
  ) => {
    return showDialog({
      type: 'prompt',
      title,
      message,
      defaultValue,
      placeholder,
      confirmText,
      cancelText
    }) as Promise<string | null>;
  }, [showDialog]);

  const handleConfirm = useCallback((value?: string) => {
    setIsOpen(false);
    if (resolveRef.current) {
      if (options.type === 'prompt') {
        resolveRef.current(value ?? null);
      } else if (options.type === 'confirm') {
        resolveRef.current(true);
      } else {
        resolveRef.current(undefined);
      }
      resolveRef.current = null;
    }
  }, [options.type]);

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
