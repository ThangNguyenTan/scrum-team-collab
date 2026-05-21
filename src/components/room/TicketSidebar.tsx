import { useState, useEffect, useRef } from "react";
import { collection, query, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, writeBatch, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Ticket, RoomUser } from "@/types";
import { Plus, ListTodo, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TICKET_STATUS_ORDER } from "@/constants";
import { TicketCard } from "./TicketCard";
import { TicketAddForm } from "./TicketAddForm";

interface TicketSidebarProps {
  roomId: string;
  isAdmin: boolean;
  activeTicketId?: string | null;
  users: RoomUser[];
}

export function TicketSidebar({ roomId, isAdmin, activeTicketId, users }: TicketSidebarProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [newTicketName, setNewTicketName] = useState("");
  const [newTicketLink, setNewTicketLink] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'oldest' | 'newest' | 'alpha-asc' | 'alpha-desc' | 'status'>('oldest');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId) return;
    const q = query(collection(db, "rooms", roomId, "tickets"));
    const unsub = onSnapshot(q, (snap) => {
      const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Ticket));
      
      fetched.sort((a, b) => {
        if (sortOrder === 'status') {
          const aS = TICKET_STATUS_ORDER[a.status] ?? 1;
          const bS = TICKET_STATUS_ORDER[b.status] ?? 1;
          if (aS !== bS) return aS - bS;
        }

        if (sortOrder === 'alpha-asc') return a.name.localeCompare(b.name);
        if (sortOrder === 'alpha-desc') return b.name.localeCompare(a.name);

        const aVal = typeof a.order === 'number' ? a.order : (a.createdAt?.toMillis?.() || 0);
        const bVal = typeof b.order === 'number' ? b.order : (b.createdAt?.toMillis?.() || 0);
        
        return sortOrder === 'newest' ? bVal - aVal : aVal - bVal;
      });
      
      setTickets(fetched);
    });
    return () => unsub();
  }, [roomId, sortOrder]);

  const handleAddTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketName.trim() || !isAdmin) return;

    await addDoc(collection(db, "rooms", roomId, "tickets"), {
      name: newTicketName.trim(),
      link: newTicketLink.trim(),
      status: "todo",
      order: Date.now(),
      createdAt: serverTimestamp(),
    });
    setNewTicketName("");
    setNewTicketLink("");
    setShowAddForm(false);

    if (sortOrder === 'oldest') {
      setTimeout(() => {
        const container = scrollRef.current;
        if (container) {
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
      }, 300);
    }
  };

  const handleStatusChange = async (ticket: Ticket, newStatus: string) => {
    if (!isAdmin || !ticket.id) return;
    
    const batch = writeBatch(db);
    
    if (newStatus === "planning") {
      const currentPlanning = tickets.filter(t => t.status === "planning" && t.id !== ticket.id);
      currentPlanning.forEach(t => {
        if (t.id) batch.update(doc(db, "rooms", roomId, "tickets", t.id), { status: "todo" });
      });
      
      batch.update(doc(db, "rooms", roomId), {
        activeTicketId: ticket.id,
        currentTicket: ticket.name,
        revealed: false
      });
      
      if (users && users.length > 0) {
        users.forEach(u => batch.update(doc(db, "rooms", roomId, "users", u.id), { vote: null }));
      }
    } else if (ticket.status === "planning" && newStatus !== "planning") {
      batch.update(doc(db, "rooms", roomId), {
        activeTicketId: null,
        currentTicket: "",
        revealed: false
      });
    }

    batch.update(doc(db, "rooms", roomId, "tickets", ticket.id), { status: newStatus });
    await batch.commit();
  };

  const handleEstimateChange = async (ticket: Ticket, estimate: string) => {
    if (!isAdmin || !ticket.id) return;
    await updateDoc(doc(db, "rooms", roomId, "tickets", ticket.id), { estimate });
  };

  const handleDeleteTicket = async (ticket: Ticket) => {
    if (!isAdmin || !ticket.id) return;
    if (confirm(`Are you sure you want to delete ${ticket.name}?`)) {
      await deleteDoc(doc(db, "rooms", roomId, "tickets", ticket.id));
      if (activeTicketId === ticket.id) {
        await updateDoc(doc(db, "rooms", roomId), {
          activeTicketId: null,
          currentTicket: "",
          revealed: false
        });
      }
    }
  };

  const handleDrop = async (e: React.DragEvent, targetTicket: Ticket) => {
    e.preventDefault();
    setDropTargetId(null);
    if (!isAdmin || !draggedId || draggedId === targetTicket.id || !targetTicket.id) return;

    const sourceIdx = tickets.findIndex(t => t.id === draggedId);
    const targetIdx = tickets.findIndex(t => t.id === targetTicket.id);

    if (sourceIdx === -1 || targetIdx === -1) return;

    let newOrder = 0;
    if (sourceIdx < targetIdx) {
      const afterTarget = tickets[targetIdx + 1];
      const targetOrder = typeof targetTicket.order === 'number' ? targetTicket.order : (targetTicket.createdAt?.toMillis?.() || 0);
      const afterOrder = afterTarget ? (typeof afterTarget.order === 'number' ? afterTarget.order : (afterTarget.createdAt?.toMillis?.() || 0)) : targetOrder - 1000;
      newOrder = (targetOrder + afterOrder) / 2;
    } else {
      const beforeTarget = tickets[targetIdx - 1];
      const targetOrder = typeof targetTicket.order === 'number' ? targetTicket.order : (targetTicket.createdAt?.toMillis?.() || 0);
      const beforeOrder = beforeTarget ? (typeof beforeTarget.order === 'number' ? beforeTarget.order : (beforeTarget.createdAt?.toMillis?.() || 0)) : targetOrder + 1000;
      newOrder = (targetOrder + beforeOrder) / 2;
    }

    await updateDoc(doc(db, "rooms", roomId, "tickets", draggedId), { order: newOrder });
    setDraggedId(null);
  };

  const filteredTickets = tickets.filter(t => 
    (t.name || "").toLowerCase().includes((searchQuery || "").toLowerCase())
  );

  return (
    <div className={cn(
      "flex flex-col h-full bg-zinc-50 dark:bg-black/40 border-l border-zinc-200 dark:border-white/5 shrink-0 transition-all duration-300 z-20 overflow-hidden",
      isExpanded ? "w-full xl:w-80 2xl:w-96" : "w-16"
    )}>
      {!isExpanded ? (
        <div className="flex flex-col items-center py-4 w-full h-full gap-4">
          <button 
            onClick={() => setIsExpanded(true)} 
            className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl hover:bg-indigo-500/20 hover:scale-105 transition-all shadow-lg"
            title="Tickets"
          >
            <ListTodo className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <>
          <div className="p-4 border-b border-zinc-200 dark:border-white/5 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2 tracking-tight">
                <ListTodo className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                Tickets
              </h3>
              <button 
                onClick={() => setIsExpanded(false)}
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors p-1 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-md"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-black/60 border border-zinc-200 dark:border-white/10 rounded-lg pl-3 pr-8 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                  <div className="h-4 w-px bg-zinc-200 dark:bg-white/10 mx-1"></div>
                </div>
              </div>
              
              <div className="relative group/sort">
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
                  className="appearance-none bg-white dark:bg-black/60 border border-zinc-200 dark:border-white/10 rounded-lg px-2 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-white/20 transition-all focus:outline-none cursor-pointer"
                  title="Sort Order"
                >
                  <option value="oldest">Time ↑</option>
                  <option value="newest">Time ↓</option>
                  <option value="alpha-asc">A-Z</option>
                  <option value="alpha-desc">Z-A</option>
                  <option value="status">Status</option>
                </select>
              </div>

              {isAdmin && (
                <button 
                  onClick={() => setShowAddForm(true)} 
                  className={cn(
                    "flex-shrink-0 w-10 h-10 flex items-center justify-center border rounded-lg transition-colors",
                    showAddForm
                      ? "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/50"
                      : "bg-white dark:bg-black/60 border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>

            <TicketAddForm
              newTicketName={newTicketName}
              newTicketLink={newTicketLink}
              onChangeName={setNewTicketName}
              onChangeLink={setNewTicketLink}
              onSubmit={handleAddTicket}
              isAdmin={isAdmin && showAddForm}
              autoFocusName={showAddForm}
            />
          </div>

          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 scroll-smooth"
          >
            {filteredTickets.map((t) => {
              const sourceIdx = tickets.findIndex(x => x.id === draggedId);
              const targetIdx = tickets.findIndex(x => x.id === t.id);
              const isBeforeInList = sourceIdx < targetIdx;

              return (
                <TicketCard
                  key={t.id}
                  ticket={t}
                  isAdmin={isAdmin}
                  draggedId={draggedId}
                  dropTargetId={dropTargetId}
                  onDragStart={(e) => {
                    if (!isAdmin || t.status === "completed") return;
                    setDraggedId(t.id!);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!isAdmin || draggedId === t.id) return;
                    setDropTargetId(t.id!);
                  }}
                  onDragLeave={() => setDropTargetId(null)}
                  onDrop={(e) => handleDrop(e, t)}
                  onDragEnd={() => {
                    setDraggedId(null);
                    setDropTargetId(null);
                  }}
                  onClick={() => {
                    if (!isAdmin) return;
                    if (t.status === "todo" || t.status === "open") {
                      handleStatusChange(t, "planning");
                    } else if (t.status === "planning") {
                      handleStatusChange(t, "completed");
                    }
                  }}
                  onStatusChange={(status) => handleStatusChange(t, status)}
                  onEstimateChange={(estimate) => handleEstimateChange(t, estimate)}
                  onDelete={() => handleDeleteTicket(t)}
                  isBeforeInList={isBeforeInList}
                />
              );
            })}
            {filteredTickets.length === 0 && (
              <div className="text-center py-8 text-zinc-500 text-sm">
                {searchQuery ? "No tickets match your search." : isAdmin ? "Click + to add your first ticket." : "No tickets available."}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
