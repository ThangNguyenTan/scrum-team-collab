import { X, Copy, Download, Check } from "lucide-react";
import { useState } from "react";
import { copyToClipboard } from "@/lib/utils";

interface ExportModalProps {
  markdown: string;
  onClose: () => void;
}

export function ExportModal({ markdown, onClose }: ExportModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meeting-summary-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-white/10 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-black/20">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Export Meeting Summary</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col gap-4 bg-zinc-50 dark:bg-black/40">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Copy the markdown below to paste into Jira, Confluence, Slack, or your favorite note-taking app.
          </p>
          
          <div className="relative flex-1 min-h-[300px] border border-zinc-200 dark:border-white/10 rounded-xl bg-white dark:bg-zinc-950 overflow-y-auto">
            <pre className="w-full min-h-full p-4 bg-transparent text-zinc-800 dark:text-zinc-300 font-mono text-sm whitespace-pre-wrap break-words select-text">
              {markdown}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/20 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download .md
          </button>
          
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy to Clipboard
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
