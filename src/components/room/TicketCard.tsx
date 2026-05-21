import React from "react";
import { CheckCircle2, Eye, ExternalLink, Activity, ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Ticket } from "@/types";

interface TicketCardProps {
  ticket: Ticket;
  isAdmin: boolean;
  draggedId: string | null;
  dropTargetId: string | null;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: () => void;
  onStatusChange: (newStatus: string) => void;
  onEstimateChange: (newEstimate: string) => void;
  onDelete: () => void;
  isBeforeInList: boolean;
}

export function TicketCard({
  ticket,
  isAdmin,
  draggedId,
  dropTargetId,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onClick,
  onStatusChange,
  onEstimateChange,
  onDelete,
  isBeforeInList,
}: TicketCardProps) {
  return (
    <div
      data-testid="ticket-card"
      draggable={isAdmin && ticket.status !== "completed"}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "w-full flex flex-col gap-3 p-3 rounded-xl border transition-all text-left shadow-sm dark:shadow-none",
        isAdmin && ticket.status !== "completed"
          ? "cursor-grab active:cursor-grabbing hover:bg-zinc-100 dark:hover:bg-white/10"
          : "",
        ticket.status === "planning"
          ? "bg-indigo-50/50 dark:bg-indigo-500/5 border-indigo-200 dark:border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.05)]"
          : "bg-white dark:bg-white/[0.02] border-zinc-200 dark:border-white/5",
        ticket.status === "completed" && "opacity-60",
        draggedId === ticket.id && "opacity-30 border-dashed border-indigo-500/50",
        dropTargetId === ticket.id &&
          (isBeforeInList
            ? "border-b-4 border-b-indigo-500"
            : "border-t-4 border-t-indigo-500")
      )}
    >
      <div className="flex items-center justify-between w-full pointer-events-none">
        <div className="flex items-center gap-2 overflow-hidden w-full pr-2 pointer-events-auto">
          {isAdmin ? (
            <div className="relative shrink-0">
              <select
                onClick={(e) => e.stopPropagation()}
                value={ticket.status === "open" ? "todo" : ticket.status}
                onChange={(e) => onStatusChange(e.target.value)}
                className={cn(
                  "appearance-none text-[10px] md:text-xs font-black uppercase tracking-wider pl-3 pr-7 py-1.5 rounded-lg bg-zinc-50 dark:bg-black/40 border cursor-pointer focus:border-indigo-500/50 focus:outline-none transition-colors",
                  ticket.status === "completed"
                    ? "border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                    : ticket.status === "planning"
                    ? "border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                    : "border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5"
                )}
              >
                <option
                  className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-300 font-bold"
                  value="todo"
                >
                  Todo
                </option>
                <option
                  className="bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 font-bold"
                  value="planning"
                >
                  Planning
                </option>
                <option
                  className="bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 font-bold"
                  value="completed"
                >
                  Completed
                </option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none opacity-50" />
            </div>
          ) : (
            <span
              className={cn(
                "flex shrink-0 items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                ticket.status === "completed"
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                  : ticket.status === "planning"
                  ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20"
                  : "bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/5"
              )}
            >
              {ticket.status === "completed" && <CheckCircle2 className="h-3 w-3" />}
              {ticket.status === "planning" && <Activity className="h-3 w-3 animate-pulse" />}
              {(ticket.status === "todo" || ticket.status === "open") && <Eye className="h-3 w-3" />}
              {ticket.status === "open" ? "TODO" : ticket.status}
            </span>
          )}

          {ticket.link ? (
            <a
              href={ticket.link}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-[11px] md:text-xs font-mono font-bold text-indigo-600 dark:text-indigo-300 border border-zinc-200 dark:border-white/5 hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-700 dark:hover:text-indigo-200 px-2 py-1.5 rounded-lg bg-zinc-50 dark:bg-black/40 transition-colors truncate"
            >
              <ExternalLink className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
              <span className="truncate">
                {ticket.name.length > 20 ? ticket.name.slice(0, 20) + "..." : ticket.name}
              </span>
            </a>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] md:text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/5 px-2 py-1.5 rounded-lg bg-zinc-50 dark:bg-black/40 truncate">
              <span className="truncate">
                {ticket.name.length > 20 ? ticket.name.slice(0, 20) + "..." : ticket.name}
              </span>
            </span>
          )}
        </div>

        {isAdmin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="flex-shrink-0 text-zinc-400 dark:text-white/20 hover:text-rose-500 dark:hover:text-rose-400 transition-colors p-1 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded pointer-events-auto"
            title="Delete ticket"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="flex justify-between items-center w-full mt-1">
        <div className="text-[10px] text-zinc-500 font-medium">
          {ticket.votesAtCompletion !== undefined && ticket.totalUsersAtCompletion !== undefined && (
            <span>
              {ticket.votesAtCompletion}/{ticket.totalUsersAtCompletion}{" "}
              <span className="opacity-70">users</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-widest font-black text-zinc-600">EST:</span>
          {isAdmin ? (
            <input
              type="text"
              onClick={(e) => e.stopPropagation()}
              value={ticket.estimate || ""}
              onChange={(e) => onEstimateChange(e.target.value)}
              placeholder="-"
              className={cn(
                "w-12 md:w-16 text-center font-black tabular-nums border rounded-md px-1 py-0.5 focus:outline-none transition-colors",
                ticket.status === "completed"
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 focus:border-emerald-500"
                  : "bg-zinc-50 dark:bg-black/40 text-zinc-500 dark:text-white/50 border-zinc-200 dark:border-white/10 focus:border-indigo-500 focus:text-zinc-900 dark:focus:text-white"
              )}
            />
          ) : (
            <span
              className={cn(
                "text-lg font-black tabular-nums px-3 py-0.5 rounded-lg border",
                ticket.status === "completed"
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30"
                  : "bg-zinc-100 dark:bg-white/5 text-zinc-400 dark:text-white/20 border-zinc-200 dark:border-white/5"
              )}
            >
              {ticket.estimate || "-"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
