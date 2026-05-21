import React from "react";

interface TicketAddFormProps {
  newTicketName: string;
  newTicketLink: string;
  onChangeName: (val: string) => void;
  onChangeLink: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isAdmin: boolean;
}

export function TicketAddForm({
  newTicketName,
  newTicketLink,
  onChangeName,
  onChangeLink,
  onSubmit,
  isAdmin,
}: TicketAddFormProps) {
  if (!isAdmin) return null;

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-2 p-3 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl mt-1 shadow-sm dark:shadow-none"
    >
      <input
        type="text"
        placeholder="Ticket ID (max 20 chars)"
        maxLength={20}
        value={newTicketName}
        onChange={(e) => onChangeName(e.target.value)}
        className="w-full bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/5 rounded-md px-3 py-1.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/30"
        required
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
  );
}
