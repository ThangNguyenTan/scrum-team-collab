import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  collection,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  writeBatch
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Plus,
  Download,
  Settings,
  X,
  FileDown,
  UploadCloud,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Check,
  GripHorizontal,
  LayoutGrid
} from "lucide-react";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import { RoomData, RoomUser, RetroColumn, RetroCard as RetroCardType } from "@/types";
import { RetroCard } from "./RetroCard";
import { GifPicker, CustomDialog, useCustomDialog, RetroInsightModal, RetroTemplateModal } from "@/ui";
import { playPing, playTada } from "@/lib/audioSynth";
import { RETRO_TEMPLATES } from "@/constants";


// DND kit imports
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
  DragOverlay,
  closestCenter
} from "@dnd-kit/core";
import { useSortable, SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface RetroBoardProps {
  room: RoomData | null;
  roomId: string;
  users: RoomUser[];
  columns: RetroColumn[];
  setColumns?: React.Dispatch<React.SetStateAction<RetroColumn[]>>;
  cards: RetroCardType[];
  setCards?: React.Dispatch<React.SetStateAction<RetroCardType[]>>;
  isAdmin: boolean;
  currentUserId: string;
  displayName: string;
  avatar: string;
}

const hexToRgba = (hex: string, alpha: number) => {
  const cleanHex = hex.replace("#", "");
  const num = parseInt(cleanHex, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const presetHexes: Record<string, string> = {
  emerald: "#10b981",
  rose: "#f43f5e",
  amber: "#f59e0b",
  sky: "#0ea5e9",
  purple: "#a855f7",
  default: "#71717a"
};

const getColumnColorTheme = (title: string, color?: string) => {
  // If color is a preset name, resolve its hex
  const activeColor = color && presetHexes[color] ? presetHexes[color] : color;

  if (activeColor && activeColor.startsWith("#")) {
    return {
      bg: "", // applied dynamically as style
      border: "", // applied dynamically as style
      glow: "", // applied dynamically as style
      badge: "", // applied dynamically as style
      titleColor: "text-zinc-900 dark:text-white",
      line: "", // applied dynamically as style
      customHex: activeColor
    };
  }

  const t = title.toLowerCase();
  if (color === "emerald" || (!color && (t.includes("well") || t.includes("good") || t.includes("happy") || t.includes("positive")))) {
    return {
      bg: "bg-emerald-500/[0.015] dark:bg-emerald-500/[0.005]",
      border: "border-emerald-500/10 dark:border-emerald-500/5 hover:border-emerald-500/25 dark:hover:border-emerald-500/20",
      glow: "shadow-[0_0_40px_-20px_rgba(16,185,129,0.05)] hover:shadow-[0_0_40px_-5px_rgba(16,185,129,0.1)]",
      badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      titleColor: "text-emerald-950 dark:text-emerald-50",
      line: "bg-emerald-500/50"
    };
  }
  if (color === "rose" || (!color && (t.includes("improve") || t.includes("bad") || t.includes("sad") || t.includes("neg") || t.includes("concern")))) {
    return {
      bg: "bg-rose-500/[0.015] dark:bg-rose-500/[0.005]",
      border: "border-rose-500/10 dark:border-rose-500/5 hover:border-rose-500/25 dark:hover:border-rose-500/20",
      glow: "shadow-[0_0_40px_-20px_rgba(244,63,94,0.05)] hover:shadow-[0_0_40px_-5px_rgba(244,63,94,0.1)]",
      badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      titleColor: "text-rose-950 dark:text-rose-50",
      line: "bg-rose-500/50"
    };
  }
  if (color === "purple" || (!color && (t.includes("action") || t.includes("task") || t.includes("todo")))) {
    return {
      bg: "bg-purple-500/[0.015] dark:bg-purple-500/[0.005]",
      border: "border-purple-500/10 dark:border-purple-500/5 hover:border-purple-500/25 dark:hover:border-purple-500/20",
      glow: "shadow-[0_0_40px_-20px_rgba(168,85,247,0.05)] hover:shadow-[0_0_40px_-5px_rgba(168,85,247,0.1)]",
      badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      titleColor: "text-purple-950 dark:text-purple-50",
      line: "bg-purple-500/50"
    };
  }
  if (color === "amber") {
    return {
      bg: "bg-amber-500/[0.015] dark:bg-amber-500/[0.005]",
      border: "border-amber-500/10 dark:border-amber-500/5 hover:border-amber-500/25 dark:hover:border-amber-500/20",
      glow: "shadow-[0_0_40px_-20px_rgba(245,158,11,0.05)] hover:shadow-[0_0_40px_-5px_rgba(245,158,11,0.1)]",
      badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      titleColor: "text-amber-950 dark:text-amber-50",
      line: "bg-amber-500/50"
    };
  }
  if (color === "sky") {
    return {
      bg: "bg-sky-500/[0.015] dark:bg-sky-500/[0.005]",
      border: "border-sky-500/10 dark:border-sky-500/5 hover:border-sky-500/25 dark:hover:border-sky-500/20",
      glow: "shadow-[0_0_40px_-20px_rgba(14,165,233,0.05)] hover:shadow-[0_0_40px_-5px_rgba(14,165,233,0.1)]",
      badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
      titleColor: "text-sky-950 dark:text-sky-50",
      line: "bg-sky-500/50"
    };
  }
  return {
    bg: "bg-zinc-500/[0.015] dark:bg-zinc-500/[0.005]",
    border: "border-zinc-500/10 dark:border-zinc-500/5 hover:border-zinc-500/25 dark:hover:border-zinc-500/20",
    glow: "shadow-[0_0_40px_-20px_rgba(113,113,122,0.05)] hover:shadow-[0_0_40px_-5px_rgba(113,113,122,0.1)]",
    badge: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
    titleColor: "text-zinc-950 dark:text-zinc-50",
    line: "bg-zinc-500/50"
  };
};

// Droppable Column Component
interface ColumnDroppableProps {
  col: RetroColumn;
  children: React.ReactNode;
  isAdmin: boolean;
  renameColumn: (col: RetroColumn) => void;
  deleteColumn: (colId: string) => void;
  cardsCount: number;
  isOverlay?: boolean;
  dragHandleProps?: any;
  setNodeRef?: (node: HTMLElement | null) => void;
  style?: React.CSSProperties;
  isDragging?: boolean;
  isOver?: boolean;
  isDraggingAny?: boolean;
}

class SmartPointerSensor extends PointerSensor {
  static exhibitors = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent }: { nativeEvent: any }) => {
        const target = nativeEvent.target as HTMLElement;
        if (!target) return true;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'BUTTON' ||
          target.tagName === 'SELECT' ||
          target.closest('button') ||
          target.closest('a') ||
          target.closest('.no-drag')
        ) {
          return false;
        }
        return true;
      },
    },
  ];
}

function ColumnDroppable({
  col,
  children,
  isAdmin,
  renameColumn,
  deleteColumn,
  cardsCount,
  isOverlay = false,
  dragHandleProps = {},
  setNodeRef,
  style,
  isDragging = false,
  isOver = false,
  isDraggingAny = false
}: ColumnDroppableProps) {
  const [isHovered, setIsHovered] = useState(false);
  const theme = getColumnColorTheme(col.title, col.color);

  // Dynamic style calculation for custom colors
  const customStyles = theme.customHex ? {
    backgroundColor: hexToRgba(theme.customHex, 0.015),
    borderColor: isOver
      ? hexToRgba(theme.customHex, 0.5)
      : isHovered
        ? hexToRgba(theme.customHex, 0.25)
        : hexToRgba(theme.customHex, 0.1),
    boxShadow: isOver
      ? `0 0 45px -5px ${hexToRgba(theme.customHex, 0.15)}, inset 0 0 20px ${hexToRgba(theme.customHex, 0.05)}`
      : isHovered
        ? `0 0 40px -5px ${hexToRgba(theme.customHex, 0.15)}`
        : `0 0 40px -20px ${hexToRgba(theme.customHex, 0.05)}`
  } : {};

  const badgeStyles = theme.customHex ? {
    backgroundColor: hexToRgba(theme.customHex, 0.1),
    color: theme.customHex,
    borderColor: hexToRgba(theme.customHex, 0.2)
  } : {};

  const lineStyles = theme.customHex ? {
    backgroundColor: theme.customHex
  } : {};

  return (
    <div
      ref={setNodeRef}
      id={`column-container-${col.id}`}
      style={{ ...style, ...customStyles }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...dragHandleProps}
      className={cn(
        "flex flex-col w-[calc(100vw-2.5rem)] sm:w-[360px] md:w-[380px] lg:w-[420px] xl:w-[450px] shrink-0 group/col rounded-[2rem] p-4 border backdrop-blur-md cursor-default snap-center",
        !theme.customHex && theme.bg,
        !theme.customHex && theme.border,
        !theme.customHex && theme.glow,
        isOver && !theme.customHex ? "ring-2 ring-indigo-500/30 dark:ring-indigo-500/20 border-dashed border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-inner" : "",
        isDragging ? "opacity-30" : "",
        isOverlay ? "scale-102 border-dashed border-indigo-500/30 bg-white/70 dark:bg-zinc-900/70" : "hover:scale-[1.005]",
        isDraggingAny || isDragging || isOverlay ? "transition-none" : "transition-all duration-300"
      )}
    >
      <div className="flex items-center justify-between mb-4 lg:mb-6 px-2 lg:px-4">
        <div className="flex items-center gap-2.5 lg:gap-3.5 min-w-0 flex-1">
          <div
            style={lineStyles}
            className={cn("w-1.5 h-6 rounded-full transition-all group-hover/col:scale-y-110 shrink-0", !theme.customHex && theme.line)}
          ></div>
          <h4 className={cn("text-base sm:text-lg lg:text-xl font-black tracking-tight truncate", theme.titleColor)} title={col.title}>
            {col.title}
          </h4>
        </div>
        {isAdmin && !isOverlay && (
          <div className="flex items-center gap-1 opacity-0 group-hover/col:opacity-100 transition-opacity no-drag shrink-0">
            <button onClick={() => renameColumn(col)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white text-zinc-400 dark:text-zinc-600 transition-all cursor-pointer"><Settings className="h-4 w-4" /></button>
            <button onClick={() => deleteColumn(col.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 text-zinc-400 dark:text-zinc-600 transition-all cursor-pointer"><X className="h-4 w-4" /></button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:gap-6 custom-scrollbar pb-6 flex-1 overflow-y-auto pr-1">
        {children}
      </div>
    </div>
  );
}

function SortableColumnWrapper({
  col,
  children,
  isAdmin,
  renameColumn,
  deleteColumn,
  cardsCount,
  isDraggingAny
}: ColumnDroppableProps & { isDraggingAny: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver
  } = useSortable({
    id: `column-${col.id}`,
    disabled: !isAdmin
  });

  const style = {
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition,
  };

  return (
    <ColumnDroppable
      col={col}
      isAdmin={isAdmin}
      renameColumn={renameColumn}
      deleteColumn={deleteColumn}
      cardsCount={cardsCount}
      setNodeRef={setNodeRef}
      style={style}
      isDragging={isDragging}
      isOver={isOver}
      isDraggingAny={isDraggingAny}
      dragHandleProps={{ ...attributes, ...listeners }}
    >
      {children}
    </ColumnDroppable>
  );
}

export function RetroBoard({
  room,
  roomId,
  users,
  columns,
  setColumns,
  cards,
  setCards,
  isAdmin,
  currentUserId,
  displayName,
  avatar
}: RetroBoardProps) {
  const { alertCustom, confirmCustom, promptCustom, dialogProps } = useCustomDialog();
  // Template presets states
  const [manualOpenModal, setManualOpenModal] = useState(false);
  const [hasDismissedModal, setHasDismissedModal] = useState(false);

  // Derived state to avoid triggering setState in useEffect
  const showTemplateModal = manualOpenModal || (isAdmin && columns.length === 0 && !hasDismissedModal);

  // New Card State
  const [newCardText, setNewCardText] = useState("");
  const [newCardImage, setNewCardImage] = useState("");
  const [activeGifSearch, setActiveGifSearch] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  // Retro Insight Modal State
  const [activeInsightColId, setActiveInsightColId] = useState<string | null>(null);
  const [activeInsightCard, setActiveInsightCard] = useState<RetroCardType | null>(null);
  const [isInsightModalOpen, setIsInsightModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [activeColumnIdDrag, setActiveColumnIdDrag] = useState<string | null>(null);


  // Participant Filter State
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);

  const isDraggingAny = activeCardId !== null || activeColumnIdDrag !== null;

  // Timer Customization States
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showCustomTimer, setShowCustomTimer] = useState(false);
  const [customMin, setCustomMin] = useState("5");
  const [customSec, setCustomSec] = useState("0");
  const hasChimed = useRef(false);



  // Pointer constraint sensor so drag starts only after click and hold for 0.3 seconds (300ms)
  const sensors = useSensors(
    useSensor(SmartPointerSensor, {
      activationConstraint: {
        delay: 300,
        tolerance: 5,
      },
    })
  );

  // Sync Timer Countdown
  useEffect(() => {
    const timer = room?.retroTimer;
    if (!timer || timer.status === "idle") {
      setTimeLeft(null);
      hasChimed.current = false;
      return;
    }

    if (timer.status === "paused") {
      setTimeLeft(timer.pausedTimeLeft ?? 0);
      return;
    }

    const runTimer = () => {
      const startedAt = timer.startedAt?.toMillis() || Date.now();
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const left = Math.max(0, timer.duration - elapsed);
      setTimeLeft(left);

      if (left === 0 && !hasChimed.current) {
        playPing();
        hasChimed.current = true;
      }
    };

    runTimer();
    const interval = setInterval(runTimer, 1000);

    return () => clearInterval(interval);
  }, [room?.retroTimer]);

  const addCard = async (colId: string, text: string, imageUrl: string | null) => {
    const currentUserData = users.find((u) => u.id === currentUserId);
    const finalName = currentUserData?.name || displayName || (isAdmin ? room?.creatorName : "") || "Team Member";
    const finalAvatar = currentUserData?.avatar || avatar || "";

    await addDoc(collection(db, "rooms", roomId, "cards"), {
      columnId: colId,
      text: text.trim(),
      imageUrl: imageUrl || null,
      upvotes: [],
      authorName: finalName,
      authorId: currentUserId,
      authorAvatar: finalAvatar,
      color: 'default',
      isAnonymous: false,
      parentCardId: null,
      comments: [],
      assigneeId: null,
      assigneeName: null,
      actionStatus: 'todo',
      createdAt: serverTimestamp()
    });
  };

  const updateCard = async (cardId: string, text: string, imageUrl: string | null) => {
    const ref = doc(db, "rooms", roomId, "cards", cardId);
    await updateDoc(ref, {
      text: text.trim(),
      imageUrl: imageUrl || null,
      color: 'default'
    });
  };

  const handleSaveInsight = async (text: string, imageUrl: string | null) => {
    if (activeInsightCard) {
      await updateCard(activeInsightCard.id, text, imageUrl);
    } else if (activeInsightColId) {
      await addCard(activeInsightColId, text, imageUrl);
    }
    setIsInsightModalOpen(false);
    setActiveInsightColId(null);
    setActiveInsightCard(null);
  };

  const toggleUpvote = async (card: RetroCardType) => {
    if (card.authorId === currentUserId) return;

    const ref = doc(db, "rooms", roomId, "cards", card.id);
    if (card.upvotes.includes(currentUserId)) {
      await updateDoc(ref, { upvotes: arrayRemove(currentUserId) });
    } else {
      await updateDoc(ref, { upvotes: arrayUnion(currentUserId) });
    }
  };

  const deleteCard = async (cardId: string) => {
    const confirmed = await confirmCustom("Delete Insight Card", "Are you sure you want to delete this card? This action cannot be undone.", "danger", "Delete");
    if (!confirmed) return;
    await deleteDoc(doc(db, "rooms", roomId, "cards", cardId));
  };

  const applyTemplate = async (presetId: string) => {
    const preset = RETRO_TEMPLATES.find(t => t.id === presetId);
    if (!preset) return;

    setManualOpenModal(false);
    setHasDismissedModal(true);

    try {
      const batch = writeBatch(db);

      // 1. Delete all existing cards (if any)
      for (const card of cards) {
        const cardRef = doc(db, "rooms", roomId, "cards", card.id);
        batch.delete(cardRef);
      }

      // 2. Delete all existing columns (if any)
      for (const col of columns) {
        const colRef = doc(db, "rooms", roomId, "columns", col.id);
        batch.delete(colRef);
      }

      // 3. Create new columns from preset
      preset.columns.forEach((colPreset, index) => {
        const colCollectionRef = collection(db, "rooms", roomId, "columns");
        const newColRef = doc(colCollectionRef);
        batch.set(newColRef, {
          title: colPreset.title,
          color: colPreset.color,
          order: index
        });
      });

      // 4. Reset revealed status (if transitioning from planning)
      const roomRef = doc(db, "rooms", roomId);
      batch.update(roomRef, {
        revealed: false
      });

      await batch.commit();
      playTada();
    } catch (error) {
      console.error("Failed to apply retrospective template:", error);
      await alertCustom("Error", "Failed to apply retrospective template. Please try again.");
    }
  };

  const addColumn = async () => {
    if (!isAdmin) return;
    const res = await promptCustom(
      "Add Retro Column",
      "Enter the name and choose a color for your new retro column:",
      "",
      "Column Title (e.g., Ideas, Risks)",
      "Create",
      "Cancel",
      true,
      "default"
    );
    if (!res) return;
    const { title, color } = res;
    await addDoc(collection(db, "rooms", roomId, "columns"), {
      title,
      color,
      order: columns.length
    });
  };

  const renameColumn = async (col: RetroColumn) => {
    if (!isAdmin) return;

    // Resolve implicit color if col.color is not set
    let activeColor = col.color;
    if (!activeColor) {
      const t = col.title.toLowerCase();
      if (t.includes("well") || t.includes("good") || t.includes("happy") || t.includes("positive")) {
        activeColor = "emerald";
      } else if (t.includes("improve") || t.includes("bad") || t.includes("sad") || t.includes("neg") || t.includes("concern")) {
        activeColor = "rose";
      } else if (t.includes("action") || t.includes("task") || t.includes("todo")) {
        activeColor = "purple";
      } else {
        activeColor = "default";
      }
    }

    const res = await promptCustom(
      "Edit Column",
      "Enter the title and choose a color for this retro column:",
      col.title,
      "Column Title",
      "Save",
      "Cancel",
      true,
      activeColor
    );
    if (!res) return;
    const { title, color } = res;
    await updateDoc(doc(db, "rooms", roomId, "columns", col.id), {
      title,
      color
    });
  };

  const deleteColumn = async (colId: string) => {
    if (!isAdmin) return;
    const confirmed = await confirmCustom("Delete Column", "Deleting a column will permanently hide all of its cards. Are you sure you want to continue?", "danger", "Delete Column");
    if (!confirmed) return;
    await deleteDoc(doc(db, "rooms", roomId, "columns", colId));
  };

  // Timer Admin Controls
  const startTimer = async (durationSeconds: number) => {
    if (!isAdmin) return;
    await updateDoc(doc(db, "rooms", roomId), {
      retroTimer: {
        duration: durationSeconds,
        status: "running",
        startedAt: serverTimestamp()
      }
    });
  };

  const pauseTimer = async () => {
    if (!isAdmin || !room?.retroTimer || room.retroTimer.status !== "running") return;

    const startedAt = room.retroTimer.startedAt?.toMillis() || Date.now();
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    const calculatedLeft = Math.max(0, room.retroTimer.duration - elapsed);

    await updateDoc(doc(db, "rooms", roomId), {
      "retroTimer.status": "paused",
      "retroTimer.pausedTimeLeft": calculatedLeft
    });
  };

  const resumeTimer = async () => {
    if (!isAdmin || !room?.retroTimer || room.retroTimer.status !== "paused") return;

    await updateDoc(doc(db, "rooms", roomId), {
      "retroTimer.status": "running",
      "retroTimer.duration": room.retroTimer.pausedTimeLeft || 0,
      "retroTimer.startedAt": serverTimestamp()
    });
  };

  const resetTimer = async () => {
    if (!isAdmin) return;
    await updateDoc(doc(db, "rooms", roomId), {
      retroTimer: {
        duration: 300,
        status: "idle",
        startedAt: null
      }
    });
  };

  const handleStartCustomTimer = () => {
    const mins = parseInt(customMin) || 0;
    const secs = parseInt(customSec) || 0;
    const totalSeconds = (mins * 60) + secs;
    if (totalSeconds <= 0) return;

    startTimer(totalSeconds);
    setShowCustomTimer(false);
  };

  // Drag & Drop Handler
  const handleDragStart = (event: any) => {
    const activeId = event.active.id as string;
    if (activeId.startsWith("column-")) {
      setActiveColumnIdDrag(activeId.replace("column-", ""));
    } else {
      setActiveCardId(activeId);
    }
  };

  const handleDragCancel = () => {
    setActiveCardId(null);
    setActiveColumnIdDrag(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCardId(null);
    setActiveColumnIdDrag(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    // Case 1: Column dragging
    if (activeId.startsWith("column-") && overId.startsWith("column-")) {
      const activeColId = activeId.replace("column-", "");
      const overColId = overId.replace("column-", "");

      const activeIndex = columns.findIndex(c => c.id === activeColId);
      const overIndex = columns.findIndex(c => c.id === overColId);

      if (activeIndex !== -1 && overIndex !== -1) {
        // Create new columns list locally
        const newColumns = [...columns];
        const [movedCol] = newColumns.splice(activeIndex, 1);
        newColumns.splice(overIndex, 0, movedCol);

        // Optimistically update columns state
        if (setColumns) {
          setColumns(newColumns);
        }

        // Update orders in Firestore
        const batchUpdates = newColumns.map((col, index) => {
          if (col.order !== index) {
            const ref = doc(db, "rooms", roomId, "columns", col.id);
            return updateDoc(ref, { order: index });
          }
          return null;
        }).filter(Boolean);

        await Promise.all(batchUpdates);
      }
      return;
    }

    // Case 2: Card dragging
    if (activeId.startsWith("column-")) return;

    // Check if over target is a column
    const overCol = columns.find(c => `column-${c.id}` === overId || c.id === overId);

    if (overCol) {
      // Move to column & unmerge from any stack
      if (setCards) {
        setCards(prev => prev.map(c => c.id === activeId ? { ...c, columnId: overCol.id, parentCardId: null } : c));
      }
      const ref = doc(db, "rooms", roomId, "cards", activeId);
      await updateDoc(ref, {
        columnId: overCol.id,
        parentCardId: null
      });
    } else {
      // Move to target card's column and stack it under target card
      const targetCard = cards.find(c => c.id === overId);
      if (targetCard) {
        // Prevent stacking a card under a child card (only parent level stacking)
        const parentId = targetCard.parentCardId || targetCard.id;

        if (setCards) {
          setCards(prev => prev.map(c => c.id === activeId ? { ...c, columnId: targetCard.columnId, parentCardId: parentId } : c));
        }
        const ref = doc(db, "rooms", roomId, "cards", activeId);
        await updateDoc(ref, {
          columnId: targetCard.columnId,
          parentCardId: parentId
        });
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const exportToCSV = () => {
    const rows = [["Column", "Card Text", "Upvotes", "Author"]];
    columns.forEach((col) => {
      cards.filter((c) => c.columnId === col.id).forEach((card) => {
        rows.push([col.title, card.text, card.upvotes.length.toString(), card.authorName]);
      });
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Retro_${roomId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = async () => {
    if (!boardRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(boardRef.current, {
        backgroundColor: "#0a0a0b",
        pixelRatio: 2,
        skipFonts: true,
      });

      const pdf = new jsPDF("l", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (boardRef.current.offsetHeight * pdfWidth) / boardRef.current.offsetWidth;
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Retro_${roomId}.pdf`);
    } catch (error) {
      console.error("PDF export failed:", error);
    }
    setIsExporting(false);
  };

  const participants = useMemo(() => {
    const list: { id: string; name: string; avatar?: string; cardCount: number }[] = [];

    // Helper to get card count for an author
    const getCount = (authorId: string) => {
      return cards.filter(c => c.authorId === authorId).length;
    };

    // Add current users first
    users.forEach(u => {
      list.push({
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        cardCount: getCount(u.id)
      });
    });

    // Add other authors from cards who are not currently online (not in users list)
    cards.forEach(c => {
      if (!list.some(p => p.id === c.authorId)) {
        list.push({
          id: c.authorId,
          name: c.authorName || "Squad Member",
          avatar: c.authorAvatar,
          cardCount: getCount(c.authorId)
        });
      }
    });

    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [users, cards]);

  const filteredCards = useMemo(() => {
    if (!selectedParticipantId) return cards;
    return cards.filter(c => {
      if (c.authorId === selectedParticipantId) return true;
      if (!c.parentCardId) {
        return cards.some(child => child.parentCardId === c.id && child.authorId === selectedParticipantId);
      }
      return false;
    });
  }, [cards, selectedParticipantId]);

  // Filter out cards that are grouped under another (parentCardId is set)
  const mainCards = filteredCards.filter(c => !c.parentCardId);

  const totalDuration = room?.retroTimer?.duration ?? 300;
  const progressPercent = timeLeft !== null ? (timeLeft / totalDuration) * 100 : 0;

  if (!room) return null;

  if (columns.length === 0 && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center select-none animate-in fade-in duration-300 relative">
        <div className="absolute top-[-10%] left-[-10%] -z-10 h-[60%] w-[60%] rounded-full bg-indigo-500/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] -z-10 h-[50%] w-[50%] rounded-full bg-purple-600/10 blur-[120px]"></div>

        <div className="relative z-10 flex flex-col items-center max-w-md gap-6 glass p-8 rounded-[2rem] border border-zinc-200 dark:border-white/5">
          <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-3xl flex items-center justify-center animate-bounce">
            ⏳
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
              Retrospective Board Configuration
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
              Waiting for the host to select a board template and launch the session. Hang tight!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col gap-3 md:gap-4 lg:gap-8 h-full p-3 md:p-4 lg:p-6 xl:p-8 overflow-hidden select-none transition-all duration-500 relative",
      isDraggingAny ? "cursor-grabbing" : "",
      timeLeft !== null && timeLeft <= 30 && timeLeft > 0 && room?.retroTimer?.status === "running"
        ? "ring-4 ring-rose-500/20 ring-inset dark:ring-rose-500/10 shadow-[inset_0_0_100px_rgba(244,63,94,0.15)] animate-pulse"
        : ""
    )}>

      {/* Upper Dock: Session Title & Actions Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white/60 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 p-4 lg:p-6 rounded-[1.5rem] xl:rounded-[2rem] shadow-sm shrink-0">

        {/* Left Side: Session Title */}
        <div className="flex flex-col gap-1">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-black flex flex-wrap items-center gap-2 md:gap-4 text-zinc-900 dark:text-white tracking-tight">
            Retro Session
            <span className="text-purple-600 dark:text-purple-400 bg-purple-500/10 px-3 py-1 rounded-xl text-[10px] md:text-xs lg:text-sm border border-purple-500/20 shadow-lg uppercase tracking-widest font-black">
              {mainCards.length} INSIGHTS
            </span>
          </h2>
          <p className="text-zinc-500 text-[10px] lg:text-xs uppercase tracking-[0.3em] font-black font-mono mt-1">Archive sprint learnings with team priorities</p>
        </div>

        {/* Right Side: Timer & Action Controls */}
        <div className="flex flex-wrap items-center md:justify-end gap-3 md:gap-4">
          {/* Synchronized Countdown Timer */}
          <div className="relative">
            <div className="flex flex-col relative overflow-hidden bg-zinc-100/80 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 p-3 rounded-2xl">
              {timeLeft !== null && room.retroTimer?.status !== "idle" && (
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-zinc-200 dark:bg-white/5">
                  <div
                    className={cn(
                      "h-full transition-all duration-1000 ease-linear",
                      timeLeft <= 15 ? "bg-rose-500 animate-pulse" : timeLeft <= 60 ? "bg-amber-500" : "bg-indigo-500"
                    )}
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Timer className={cn(
                    "h-5 w-5 transition-all duration-300",
                    timeLeft !== null && timeLeft > 0 && room.retroTimer?.status === "running" ? "text-indigo-500 animate-pulse" : "text-zinc-400",
                    timeLeft !== null && timeLeft <= 30 && timeLeft > 0 && "text-rose-500 animate-bounce scale-110"
                  )} />

                  <span className={cn(
                    "font-mono font-black text-lg md:text-xl lg:text-2xl tracking-wider tabular-nums transition-colors duration-300",
                    timeLeft === null ? "text-zinc-400" : "text-zinc-800 dark:text-white",
                    timeLeft !== null && timeLeft <= 30 && timeLeft > 0 && "text-rose-500 animate-pulse font-black"
                  )}>
                    {timeLeft !== null ? formatTime(timeLeft) : "00:00"}
                  </span>

                  {timeLeft !== null && timeLeft === 0 && (
                    <span className="text-[10px] font-black uppercase text-rose-500 animate-pulse px-2 py-0.5 bg-rose-500/10 rounded-md border border-rose-500/20">
                      Time&apos;s Up!
                    </span>
                  )}
                </div>

                <div className="h-6 w-px bg-zinc-300 dark:bg-white/10"></div>

                {/* Facilitator / Admin Timer Actions */}
                {isAdmin ? (
                  <div className="flex items-center gap-1.5">
                    {room.retroTimer?.status === "running" ? (
                      <button
                        onClick={pauseTimer}
                        className="p-2 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="Pause Timer"
                      >
                        <Pause className="h-4 w-4" />
                      </button>
                    ) : room.retroTimer?.status === "paused" ? (
                      <button
                        onClick={resumeTimer}
                        className="p-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors shadow-md shadow-indigo-500/15 cursor-pointer"
                        title="Resume Timer"
                      >
                        <Play className="h-4 w-4 fill-white" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startTimer(60)}
                          className="px-2 py-1 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-[10px] font-black uppercase rounded-lg border border-zinc-200 dark:border-zinc-800/50 transition-all cursor-pointer"
                        >
                          1m
                        </button>
                        <button
                          onClick={() => startTimer(180)}
                          className="px-2 py-1 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-[10px] font-black uppercase rounded-lg border border-zinc-200 dark:border-zinc-800/50 transition-all cursor-pointer"
                        >
                          3m
                        </button>
                        <button
                          onClick={() => startTimer(300)}
                          className="px-2 py-1 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-[10px] font-black uppercase rounded-lg border border-zinc-200 dark:border-zinc-800/50 transition-all cursor-pointer"
                        >
                          5m
                        </button>
                        <button
                          onClick={() => startTimer(600)}
                          className="px-2 py-1 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-[10px] font-black uppercase rounded-lg border border-zinc-200 dark:border-zinc-800/50 transition-all cursor-pointer"
                        >
                          10m
                        </button>
                        <button
                          onClick={() => setShowCustomTimer(!showCustomTimer)}
                          className={cn(
                            "p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-all cursor-pointer",
                            showCustomTimer ? "bg-indigo-500/10 text-indigo-500" : "hover:bg-zinc-200 dark:hover:bg-white/10"
                          )}
                          title="Customize Timer"
                        >
                          <Sliders className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {room.retroTimer?.status && room.retroTimer?.status !== "idle" && (
                      <button
                        onClick={resetTimer}
                        className="p-2 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                        title="Reset Timer"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-2">
                    {room.retroTimer?.status === "running" ? "Running" : room.retroTimer?.status === "paused" ? "Paused" : "Timer Off"}
                  </span>
                )}
              </div>
            </div>

            {/* Custom Timer Input Dialog */}
            {showCustomTimer && isAdmin && (
              <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 animate-in zoom-in-95 duration-100">
                <input
                  type="number"
                  value={customMin}
                  onChange={e => setCustomMin(e.target.value)}
                  min="0"
                  placeholder="Min"
                  className="w-12 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-lg px-2 py-1 text-xs text-center font-bold"
                />
                <span className="text-zinc-400 font-bold">:</span>
                <input
                  type="number"
                  value={customSec}
                  onChange={e => setCustomSec(e.target.value)}
                  min="0"
                  max="59"
                  placeholder="Sec"
                  className="w-12 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-lg px-2 py-1 text-xs text-center font-bold"
                />
                <button
                  onClick={handleStartCustomTimer}
                  className="p-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors shadow-md shadow-indigo-500/10 cursor-pointer"
                  title="Start custom timer"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Templates Selector Button */}
          {isAdmin && (
            <button
              onClick={async () => {
                if (columns.length > 0) {
                  const confirmed = await confirmCustom(
                    "Reset Board Template",
                    "Are you sure you want to load a new template? This will permanently delete all existing cards and columns on this board.",
                    "danger",
                    "Reset & Change"
                  );
                  if (!confirmed) return;
                }
                setManualOpenModal(true);
                setHasDismissedModal(false);
              }}
              className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-white/5 py-2.5 px-4 md:py-3 md:px-6 text-xs md:text-sm font-black text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all active:scale-95 whitespace-nowrap"
            >
              <LayoutGrid className="h-4 w-4" />
              Templates
            </button>
          )}

          {/* New Column Button */}
          {isAdmin && (
            <button
              onClick={addColumn}
              className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-white/5 py-2.5 px-4 md:py-3 md:px-6 text-xs md:text-sm font-black text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white transition-all active:scale-95 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              New Column
            </button>
          )}

          {/* Export controls */}
          <div className="flex items-center p-1 bg-zinc-100 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10">
            <button
              onClick={exportToCSV}
              className="p-3 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all active:scale-95"
              title="Export CSV"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={exportToPDF}
              disabled={isExporting}
              className="p-3 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all active:scale-95 disabled:opacity-30"
              title="Export PDF Card Board"
            >
              <FileDown className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Participant Filter Bar */}
      <div className="flex flex-col gap-2 bg-white/40 dark:bg-white/[0.01] border border-zinc-200 dark:border-white/5 p-3 rounded-2xl md:rounded-[1.5rem] shadow-sm shrink-0">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-500">
              Filter by Participant
            </span>
            {selectedParticipantId && (
              <button
                onClick={() => setSelectedParticipantId(null)}
                className="text-[10px] font-black uppercase text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
              >
                • Clear Filter
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar scrollbar-none">
          {/* Everyone/All Filter Option */}
          <button
            onClick={() => setSelectedParticipantId(null)}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-300 border cursor-pointer shrink-0 active:scale-95 hover:scale-[1.02]",
              !selectedParticipantId
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 border-transparent text-white shadow-lg shadow-indigo-500/20"
                : "bg-white/80 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-zinc-950 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700"
            )}
          >
            <div className="relative flex items-center justify-center h-6 w-6 rounded-lg bg-indigo-500/10 text-xs shrink-0">
              <span className="text-sm">👥</span>
            </div>

            <span className="font-extrabold max-w-[120px] truncate">Everyone</span>

            <span className={cn(
              "font-mono font-black text-[10px] px-1.5 py-0.5 rounded-md",
              !selectedParticipantId ? "bg-white/20 text-white" : "bg-zinc-100 dark:bg-white/10 text-zinc-500 dark:text-zinc-400 group-hover:bg-zinc-200"
            )}>
              {cards.filter(c => !c.parentCardId).length}
            </span>
          </button>

          {/* Participant Options */}
          {participants.map((p) => {
            const isSelected = selectedParticipantId === p.id;

            return (
              <button
                key={p.id}
                onClick={() => setSelectedParticipantId(p.id)}
                className={cn(
                  "flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-300 border cursor-pointer shrink-0 active:scale-95 hover:scale-[1.02]",
                  isSelected
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 border-transparent text-white shadow-lg shadow-indigo-500/20"
                    : "bg-white/80 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-zinc-950 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700"
                )}
              >
                {/* Avatar Container */}
                <div className="relative flex items-center justify-center h-6 w-6 rounded-lg bg-indigo-500/10 text-xs shrink-0">
                  {p.avatar ? (
                    <span className="text-sm">{p.avatar}</span>
                  ) : (
                    <span className="font-mono font-black text-indigo-400">
                      {(p.name || "U").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <span className="font-extrabold max-w-[120px] truncate">{p.name}</span>

                {/* Card Count Badge */}
                {p.cardCount > 0 && (
                  <span className={cn(
                    "font-mono font-black text-[10px] px-1.5 py-0.5 rounded-md",
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-zinc-100 dark:bg-white/10 text-zinc-500 dark:text-zinc-400 group-hover:bg-zinc-200"
                  )}>
                    {p.cardCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Retro Columns Drag & Drop Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          ref={boardRef}
          className="flex-1 flex flex-row overflow-x-auto overflow-y-hidden gap-4 lg:gap-6 xl:gap-8 p-2 sm:p-4 md:p-6 pb-24 custom-scrollbar animate-in fade-in duration-300 snap-x snap-mandatory lg:snap-none items-stretch"
        >
          <SortableContext items={columns.map(c => `column-${c.id}`)} strategy={horizontalListSortingStrategy}>
            {columns.map((col) => {
              const colCards = mainCards.filter((c) => c.columnId === col.id);
              const isActionItemColumn = col.title.toLowerCase().includes("action") || col.title.toLowerCase().includes("task");

              return (
                <SortableColumnWrapper
                  key={col.id}
                  col={col}
                  isAdmin={isAdmin}
                  renameColumn={renameColumn}
                  deleteColumn={deleteColumn}
                  cardsCount={colCards.length}
                  isDraggingAny={isDraggingAny}
                >
                  {colCards.map((card) => (
                    <RetroCard
                      key={card.id}
                      card={card}
                      roomId={roomId}
                      isAdmin={isAdmin}
                      currentUserId={currentUserId}
                      displayName={displayName}
                      avatar={avatar}
                      users={users}
                      mergedCards={filteredCards.filter(c => c.parentCardId === card.id)}
                      isActionItem={isActionItemColumn}
                      onDeleteCard={deleteCard}
                      onToggleUpvote={toggleUpvote}
                      onEditCard={(c) => {
                        setActiveInsightCard(c);
                        setActiveInsightColId(c.columnId);
                        setIsInsightModalOpen(true);
                      }}
                    />
                  ))}
                  {/* Big Add Card Button triggering modal */}
                  <button
                    onClick={() => {
                      setActiveInsightColId(col.id);
                      setActiveInsightCard(null);
                      setIsInsightModalOpen(true);
                    }}
                    className="flex h-12 lg:h-16 items-center justify-center gap-2 lg:gap-3 rounded-xl lg:rounded-2xl border-2 border-dashed border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.02] text-zinc-500 dark:text-zinc-400 hover:border-indigo-500/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all group active:scale-95 cursor-pointer"
                  >
                    <Plus className="h-4 w-4 lg:h-5 lg:w-5 transition-transform group-hover:scale-125" />
                    <span className="font-bold text-xs lg:text-sm uppercase tracking-widest">Add a card</span>
                  </button>
                </SortableColumnWrapper>
              );
            })}
          </SortableContext>
        </div>

        <DragOverlay adjustScale={false} dropAnimation={null}>
          {activeCardId ? (
            <div className="rotate-[2deg] scale-105 shadow-2xl opacity-90 cursor-grabbing pointer-events-none w-[320px] xl:w-[400px] 2xl:w-[500px]">
              {(() => {
                const activeCard = cards.find(c => c.id === activeCardId);
                if (!activeCard) return null;
                const isActionItemColumn = columns.find(col => col.id === activeCard.columnId)?.title.toLowerCase().includes("action") || false;
                return (
                  <RetroCard
                    card={activeCard}
                    roomId={roomId}
                    isAdmin={isAdmin}
                    currentUserId={currentUserId}
                    displayName={displayName}
                    avatar={avatar}
                    users={users}
                    mergedCards={filteredCards.filter(c => c.parentCardId === activeCardId)}
                    isActionItem={isActionItemColumn}
                    onDeleteCard={async () => { }}
                    onToggleUpvote={async () => { }}
                    isOverlay={true}
                  />
                );
              })()}
            </div>
          ) : activeColumnIdDrag ? (
            <div className="rotate-[1deg] scale-[1.01] shadow-2xl opacity-95 cursor-grabbing pointer-events-none w-[320px] xl:w-[400px] 2xl:w-[500px] max-h-[80vh] flex flex-col">
              {(() => {
                const col = columns.find(c => c.id === activeColumnIdDrag);
                if (!col) return null;
                const colCards = mainCards.filter((c) => c.columnId === col.id);
                const isActionItemColumn = col.title.toLowerCase().includes("action") || col.title.toLowerCase().includes("task");
                return (
                  <ColumnDroppable
                    col={col}
                    isAdmin={isAdmin}
                    renameColumn={() => { }}
                    deleteColumn={() => { }}
                    cardsCount={colCards.length}
                    isOverlay={true}
                  >
                    {colCards.map((card) => (
                      <RetroCard
                        key={card.id}
                        card={card}
                        roomId={roomId}
                        isAdmin={isAdmin}
                        currentUserId={currentUserId}
                        displayName={displayName}
                        avatar={avatar}
                        users={users}
                        mergedCards={filteredCards.filter(c => c.parentCardId === card.id)}
                        isActionItem={isActionItemColumn}
                        onDeleteCard={async () => { }}
                        onToggleUpvote={async () => { }}
                        isOverlay={true}
                      />
                    ))}
                  </ColumnDroppable>
                );
              })()}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <CustomDialog {...dialogProps} />
      <RetroTemplateModal
        isOpen={showTemplateModal}
        onSelectPreset={applyTemplate}
        onCancel={() => {
          setManualOpenModal(false);
          setHasDismissedModal(true);
        }}
      />
      <RetroInsightModal
        key={activeInsightColId + "-" + (activeInsightCard?.id || "new")}
        isOpen={isInsightModalOpen}
        columnTitle={columns.find(c => c.id === activeInsightColId)?.title || ""}
        columnColor={columns.find(c => c.id === activeInsightColId)?.color || "default"}
        card={activeInsightCard}
        onSave={handleSaveInsight}
        onCancel={() => {
          setIsInsightModalOpen(false);
          setActiveInsightColId(null);
          setActiveInsightCard(null);
        }}
      />
    </div>
  );
}

export default RetroBoard;
