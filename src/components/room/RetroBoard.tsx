import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { 
  doc, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  collection, 
  serverTimestamp,
  arrayUnion,
  arrayRemove
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
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import { RoomData, RoomUser, RetroColumn, RetroCard as RetroCardType } from "@/types";
import { RetroCard } from "./RetroCard";
import GifPicker from "./GifPicker";
import { playPing, playTada } from "@/lib/audioSynth";

// DND kit imports
import { 
  DndContext, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent, 
  useDroppable,
  DragOverlay
} from "@dnd-kit/core";

interface RetroBoardProps {
  room: RoomData | null;
  roomId: string;
  users: RoomUser[];
  columns: RetroColumn[];
  cards: RetroCardType[];
  isAdmin: boolean;
  currentUserId: string;
  displayName: string;
  avatar: string;
}

// Droppable Column Component
interface ColumnDroppableProps {
  col: RetroColumn;
  children: React.ReactNode;
  isAdmin: boolean;
  renameColumn: (col: RetroColumn) => void;
  deleteColumn: (colId: string) => void;
  cardsCount: number;
}

function ColumnDroppable({ 
  col, 
  children, 
  isAdmin, 
  renameColumn, 
  deleteColumn, 
  cardsCount 
}: ColumnDroppableProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: col.id,
  });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-full lg:min-w-[320px] xl:min-w-[400px] 2xl:min-w-[500px] lg:w-[320px] xl:w-[400px] 2xl:w-[500px] shrink-0 group/col rounded-3xl p-3 border-2 border-transparent transition-all",
        isOver ? "bg-indigo-500/5 dark:bg-indigo-500/10 border-dashed border-indigo-500/30 shadow-inner" : ""
      )}
    >
      <div className="flex items-center justify-between mb-4 lg:mb-6 px-2 lg:px-4">
        <div className="flex items-center gap-2 lg:gap-3">
          <h4 className="text-base sm:text-lg lg:text-xl font-bold text-indigo-900 dark:text-indigo-100">{col.title}</h4>
          <span className="bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-500 text-[9px] sm:text-[10px] lg:text-xs px-2 py-0.5 rounded-full border border-zinc-200 dark:border-white/5 font-mono">
            {cardsCount}
          </span>
        </div>
        {isAdmin && (
          <div className="flex items-center opacity-0 group-hover/col:opacity-100 transition-opacity">
            <button onClick={() => renameColumn(col)} className="p-1 hover:text-zinc-900 dark:hover:text-white text-zinc-400 dark:text-zinc-600"><Settings className="h-3 w-3" /></button>
            <button onClick={() => deleteColumn(col.id)} className="p-1 hover:text-red-500 text-zinc-400 dark:text-zinc-600"><X className="h-3 w-3" /></button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:gap-8 custom-scrollbar pb-6">
        {children}
      </div>
    </div>
  );
}

export function RetroBoard({ 
  room, 
  roomId, 
  users, 
  columns, 
  cards, 
  isAdmin, 
  currentUserId, 
  displayName, 
  avatar 
}: RetroBoardProps) {
  // New Card State
  const [newCardText, setNewCardText] = useState("");
  const [newCardImage, setNewCardImage] = useState("");
  const [activeGifSearch, setActiveGifSearch] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  // Timer Customization States
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showCustomTimer, setShowCustomTimer] = useState(false);
  const [customMin, setCustomMin] = useState("5");
  const [customSec, setCustomSec] = useState("0");
  const hasChimed = useRef(false);

  // Pointer constraint sensor so clicks inside textarea/buttons are not treated as drag starts
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be below 5MB");
      return;
    }

    const reader = new FileReader();
    
    if (file.type === "image/gif") {
      reader.onload = (ev) => setNewCardImage(ev.target?.result as string);
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
        setNewCardImage(dataUrl);
      };
      if (typeof ev.target?.result === "string") {
        img.src = ev.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const addCard = async (colId: string) => {
    if (!newCardText.trim() && !newCardImage.trim()) return;
    
    const currentUserData = users.find((u) => u.id === currentUserId);
    const finalName = currentUserData?.name || displayName || (isAdmin ? room?.creatorName : "") || "Team Member";
    const finalAvatar = currentUserData?.avatar || avatar || "";

    const textToSave = newCardText.trim();
    const imageToSave = newCardImage.trim() || null;

    setNewCardText("");
    setNewCardImage("");
    setActiveGifSearch(null);
    setActiveColumnId(null);

    await addDoc(collection(db, "rooms", roomId, "cards"), {
      columnId: colId,
      text: textToSave,
      imageUrl: imageToSave,
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
    if(!window.confirm("Delete this card?")) return;
    await deleteDoc(doc(db, "rooms", roomId, "cards", cardId));
  };

  const addColumn = async () => {
    if (!isAdmin) return;
    const title = window.prompt("Column Title:");
    if (!title) return;
    await addDoc(collection(db, "rooms", roomId, "columns"), {
      title,
      order: columns.length
    });
  };

  const renameColumn = async (col: RetroColumn) => {
    if (!isAdmin) return;
    const newTitle = window.prompt("New Column Title:", col.title);
    if (!newTitle) return;
    await updateDoc(doc(db, "rooms", roomId, "columns", col.id), { title: newTitle });
  };

  const deleteColumn = async (colId: string) => {
    if (!isAdmin) return;
    if (!window.confirm("Deleting a column will hide its cards. Continue?")) return;
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
    setActiveCardId(event.active.id as string);
  };

  const handleDragCancel = () => {
    setActiveCardId(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCardId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    // Check if over target is a column
    const isTargetColumn = columns.some(c => c.id === overId);

    if (isTargetColumn) {
      // Move to column & unmerge from any stack
      const ref = doc(db, "rooms", roomId, "cards", activeId);
      await updateDoc(ref, {
        columnId: overId,
        parentCardId: null
      });
    } else {
      // Move to target card's column and stack it under target card
      const targetCard = cards.find(c => c.id === overId);
      if (targetCard) {
        // Prevent stacking a card under a child card (only parent level stacking)
        const parentId = targetCard.parentCardId || targetCard.id;
        
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

  if (!room) return null;

  // Filter out cards that are grouped under another (parentCardId is set)
  const mainCards = cards.filter(c => !c.parentCardId);

  return (
    <div className="flex flex-col gap-3 md:gap-4 lg:gap-8 h-full p-3 md:p-4 lg:p-6 xl:p-8 overflow-hidden select-none">
      
      {/* Upper Dock: Session Title & Sync Countdown Timer */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 bg-white/60 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 p-4 lg:p-6 rounded-[1.5rem] xl:rounded-[2rem] shadow-sm">
        
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

        {/* Center: Synchronized Countdown Timer */}
        <div className="flex flex-wrap items-center gap-3 bg-zinc-100/80 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 p-3 rounded-2xl xl:mx-auto">
          <div className="flex items-center gap-2">
            <Timer className={cn(
              "h-5 w-5",
              timeLeft !== null && timeLeft > 0 && room.retroTimer?.status === "running" ? "text-indigo-500 animate-pulse" : "text-zinc-400",
              timeLeft !== null && timeLeft <= 15 && timeLeft > 0 && "text-rose-500 animate-bounce"
            )} />
            
            <span className={cn(
              "font-mono font-black text-lg md:text-xl lg:text-2xl tracking-wider tabular-nums",
              timeLeft === null ? "text-zinc-400" : "text-zinc-800 dark:text-white",
              timeLeft !== null && timeLeft <= 15 && timeLeft > 0 && "text-rose-500 animate-pulse"
            )}>
              {timeLeft !== null ? formatTime(timeLeft) : "00:00"}
            </span>

            {timeLeft !== null && timeLeft === 0 && (
              <span className="text-[10px] font-black uppercase text-rose-500 animate-pulse px-2 py-0.5 bg-rose-500/10 rounded-md border border-rose-500/20">
                Time's Up!
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
                  className="p-2 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-colors"
                  title="Pause Timer"
                >
                  <Pause className="h-4 w-4" />
                </button>
              ) : room.retroTimer?.status === "paused" ? (
                <button 
                  onClick={resumeTimer}
                  className="p-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors shadow-md shadow-indigo-500/15"
                  title="Resume Timer"
                >
                  <Play className="h-4 w-4 fill-white" />
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => startTimer(180)}
                    className="px-2.5 py-1.5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-[10px] font-black uppercase rounded-lg border border-transparent hover:border-zinc-300 dark:hover:border-zinc-800 transition-all"
                  >
                    3m
                  </button>
                  <button 
                    onClick={() => startTimer(300)}
                    className="px-2.5 py-1.5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-[10px] font-black uppercase rounded-lg border border-transparent hover:border-zinc-300 dark:hover:border-zinc-800 transition-all"
                  >
                    5m
                  </button>
                  <button 
                    onClick={() => setShowCustomTimer(!showCustomTimer)}
                    className={cn(
                      "p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-all",
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
                  className="p-2 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-rose-500 rounded-lg transition-colors"
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

          {/* Custom Timer Input Dialog */}
          {showCustomTimer && isAdmin && (
            <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl absolute top-20 z-50 animate-in zoom-in-95 duration-100">
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
                className="p-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors shadow-md shadow-indigo-500/10"
                title="Start custom timer"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
        
        {/* Right Side: Columns & PDF Export controls */}
        <div className="flex items-center justify-end gap-2 sm:gap-3">
          {isAdmin && (
            <button 
              onClick={addColumn}
              className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-white/5 py-2.5 px-4 md:py-3 md:px-6 text-xs md:text-sm font-black text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white transition-all active:scale-95 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              New Column
            </button>
          )}
          
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

      {/* Retro Columns Drag & Drop Board */}
      <DndContext 
        sensors={sensors} 
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd} 
        onDragCancel={handleDragCancel}
      >
        <div 
          ref={boardRef}
          className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-6 xl:gap-8 overflow-y-auto lg:overflow-x-auto overflow-x-hidden p-2 sm:p-4 md:p-6 pb-24 md:pb-24 custom-scrollbar"
        >
          {columns.map((col) => {
            const colCards = mainCards.filter((c) => c.columnId === col.id);
            const isActionItemColumn = col.title.toLowerCase().includes("action") || col.title.toLowerCase().includes("task");

            return (
              <ColumnDroppable 
                key={col.id} 
                col={col} 
                isAdmin={isAdmin}
                renameColumn={renameColumn}
                deleteColumn={deleteColumn}
                cardsCount={colCards.length}
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
                    mergedCards={cards.filter(c => c.parentCardId === card.id)}
                    isActionItem={isActionItemColumn}
                    onDeleteCard={deleteCard}
                    onToggleUpvote={toggleUpvote}
                  />
                ))}
                
                {/* Adding Retro Card UI */}
                {activeColumnId === col.id ? (
                  <div className="flex flex-col gap-4 rounded-2xl lg:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 lg:p-6 shadow-md dark:shadow-2xl relative overflow-hidden transition-all duration-300">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50"></div>
                    <textarea 
                      autoFocus
                      placeholder="Type your thought..."
                      className="w-full bg-transparent border-none text-zinc-900 dark:text-white text-sm md:text-base focus:outline-none resize-none min-h-[120px] custom-scrollbar placeholder-zinc-400 dark:placeholder-zinc-700 font-medium"
                      value={newCardText}
                      onChange={(e) => setNewCardText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          addCard(col.id);
                        }
                      }}
                    />
                    
                    {newCardImage && (
                      <div className="relative w-full min-h-[300px] rounded-xl overflow-hidden my-2 bg-black/40 border border-indigo-500/20">
                        <Image 
                          src={newCardImage} 
                          alt="Preview" 
                          fill
                          unoptimized
                          className="object-contain opacity-90 transition-opacity" 
                        />
                        <button 
                          onClick={() => setNewCardImage("")}
                          className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white hover:bg-black"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    
                    {activeGifSearch === 'new' && (
                      <div className="mt-2">
                        <GifPicker 
                          onSelect={(url) => {
                            setNewCardImage(url);
                            setActiveGifSearch(null);
                          }} 
                          onClose={() => setActiveGifSearch(null)} 
                        />
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                      <div className="flex flex-wrap items-center gap-3">
                        <label 
                          title="Upload Image"
                          className="h-10 px-4 rounded-xl transition-all flex items-center justify-center gap-2 bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10 cursor-pointer active:scale-90 border border-zinc-200 dark:border-white/5"
                        >
                          <UploadCloud className="h-4 w-4" />
                          <span className="text-[11px] font-black uppercase tracking-wider">Image</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                        <button 
                          title="Add GIF"
                          onClick={() => {
                            setActiveGifSearch(activeGifSearch === 'new' ? null : 'new');
                          }}
                          className={cn(
                            "h-10 px-4 rounded-xl transition-all flex items-center justify-center active:scale-90 border border-transparent",
                            activeGifSearch === 'new' ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10 border-zinc-200 dark:border-white/5"
                          )}
                        >
                          <span className="text-[11px] font-black uppercase tracking-wider">GIF</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            setActiveColumnId(null);
                            setNewCardText("");
                            setNewCardImage("");
                            setActiveGifSearch(null);
                          }}
                          className="px-4 py-2 text-xs md:text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => addCard(col.id)} 
                          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs md:text-sm font-black hover:bg-indigo-500 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/20"
                        >
                          Post Insight
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setActiveColumnId(col.id);
                      setNewCardText("");
                    }}
                    className="flex h-12 lg:h-16 items-center justify-center gap-2 lg:gap-3 rounded-xl lg:rounded-2xl border-2 border-dashed border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.02] text-zinc-500 dark:text-zinc-400 hover:border-indigo-500/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all group active:scale-95"
                  >
                    <Plus className="h-4 w-4 lg:h-5 lg:w-5 transition-transform group-hover:scale-125" />
                    <span className="font-bold text-xs lg:text-sm uppercase tracking-widest">Add a card</span>
                  </button>
                )}
              </ColumnDroppable>
            );
          })}
        </div>

        <DragOverlay adjustScale={true}>
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
                    mergedCards={cards.filter(c => c.parentCardId === activeCardId)}
                    isActionItem={isActionItemColumn}
                    onDeleteCard={async () => {}}
                    onToggleUpvote={async () => {}}
                  />
                );
              })()}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

export default RetroBoard;
