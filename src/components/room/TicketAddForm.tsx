import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface TicketAddFormProps {
  newTicketName: string;
  newTicketLink: string;
  onChangeName: (val: string) => void;
  onChangeLink: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBulkSubmit?: (tickets: { name: string; link?: string }[]) => Promise<void>;
  isAdmin: boolean;
  autoFocusName?: boolean; // optional auto‑focus for testing
}

export function TicketAddForm({
  newTicketName,
  newTicketLink,
  onChangeName,
  onChangeLink,
  onSubmit,
  onBulkSubmit,
  isAdmin,
  autoFocusName = false,
}: TicketAddFormProps) {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [bulkText, setBulkText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAdmin) return null;

  const handleLocalBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim() || !onBulkSubmit) return;

    setIsSubmitting(true);
    try {
      const parsedTickets: { name: string; link?: string }[] = [];
      const lines = bulkText.split("\n");
      
      for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        
        // Match name and optional URL
        const urlMatch = line.match(/(https?:\/\/[^\s]+)/i);
        let link = "";
        let name = line;
        
        if (urlMatch) {
          link = urlMatch[0];
          // Remove the link from the name
          name = line.replace(link, "").trim();
        }
        
        // If the line was only a URL, extract the last path segment as the Ticket ID
        if (!name && link) {
          try {
            const urlObj = new URL(link);
            const pathSegments = urlObj.pathname.split("/").filter(Boolean);
            if (pathSegments.length > 0) {
              name = decodeURIComponent(pathSegments[pathSegments.length - 1]).slice(0, 20);
            }
          } catch (e) {
            const segments = link.split("/");
            name = segments[segments.length - 1] || "Ticket";
          }
        }
        
        // Ensure name is not empty
        if (name) {
          parsedTickets.push({ name, link: link || undefined });
        }
      }
      
      if (parsedTickets.length > 0) {
        await onBulkSubmit(parsedTickets);
        setBulkText("");
      }
    } catch (err) {
      console.error("Bulk submit failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl mt-1 shadow-sm dark:shadow-none">
      {/* Mode Toggle */}
      <div className="flex rounded-lg bg-zinc-100 dark:bg-black/40 p-0.5 border border-zinc-200 dark:border-white/5 mb-1">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={cn(
            "flex-1 py-1 rounded-md text-xs font-bold transition-all",
            mode === "single"
              ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
          )}
        >
          Single
        </button>
        <button
          type="button"
          onClick={() => setMode("bulk")}
          className={cn(
            "flex-1 py-1 rounded-md text-xs font-bold transition-all",
            mode === "bulk"
              ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
          )}
        >
          Bulk Insert
        </button>
      </div>

      {mode === "single" ? (
        <form onSubmit={onSubmit} className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Ticket ID (max 20 chars)"
            maxLength={20}
            value={newTicketName}
            onChange={(e) => onChangeName(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/5 rounded-md px-3 py-1.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/30"
            required
            autoFocus={autoFocusName}
          />
          <input
            type="url"
            placeholder="Link URL (optional)"
            value={newTicketLink}
            onChange={(e) => onChangeLink(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/5 rounded-md px-3 py-1.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/30"
          />
          <div className="flex justify-end mt-1">
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-500 text-white text-xs font-bold rounded-lg hover:bg-indigo-600 transition-colors"
              disabled={!newTicketName.trim()}
            >
              Add Ticket
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleLocalBulkSubmit} className="flex flex-col gap-2">
          <textarea
            placeholder="Paste tickets (one per line)&#10;Example:&#10;PROJ-101&#10;https://jira.company.com/browse/PROJ-101"
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className="w-full h-32 bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/5 rounded-md px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/30 font-mono resize-none"
            required
            disabled={isSubmitting}
            autoFocus
          />
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-normal ml-0.5">
            Format: &lt;Ticket ID&gt; [&lt;URL&gt;]
          </span>
          <div className="flex justify-end mt-1">
            <button
              type="submit"
              disabled={isSubmitting || !bulkText.trim()}
              className="px-4 py-1.5 bg-indigo-500 text-white text-xs font-bold rounded-lg hover:bg-indigo-600 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                  Adding...
                </>
              ) : (
                "Add Tickets"
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
