import { useState, useRef } from "react";
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
  Edit2, 
  Trash2, 
  ThumbsUp, 
  UploadCloud 
} from "lucide-react";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import { RoomData, RoomUser, RetroColumn, RetroCard as RetroCardType } from "@/types";
import { RetroCard } from "./RetroCard";
import GifPicker from "./GifPicker";

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
  if (!room) return null;
  const [newCardText, setNewCardText] = useState("");
  const [newCardImage, setNewCardImage] = useState("");
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingImage, setEditingImage] = useState("");
  const [activeGifSearch, setActiveGifSearch] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be below 5MB");
      return;
    }

    const setter = isEdit ? setEditingImage : setNewCardImage;
    const reader = new FileReader();
    
    if (file.type === "image/gif") {
      reader.onload = (ev) => setter(ev.target?.result as string);
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
        setter(dataUrl);
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

    await addDoc(collection(db, "rooms", roomId, "cards"), {
      columnId: colId,
      text: newCardText.trim(),
      imageUrl: newCardImage.trim() || null,
      upvotes: [],
      authorName: finalName,
      authorId: currentUserId,
      authorAvatar: finalAvatar,
      createdAt: serverTimestamp()
    });
    setNewCardText("");
    setNewCardImage("");
    setActiveGifSearch(null);
    setActiveColumnId(null);
  };

  const startEditing = (card: RetroCardType) => {
    setEditingCardId(card.id);
    setEditingText(card.text);
    setEditingImage(card.imageUrl || "");
  };

  const updateCard = async (cardId: string) => {
    if (!editingText.trim() && !editingImage.trim()) return;
    await updateDoc(doc(db, "rooms", roomId, "cards", cardId), {
      text: editingText.trim(),
      imageUrl: editingImage.trim() || null
    });
    setEditingCardId(null);
    setActiveGifSearch(null);
    setEditingText("");
    setEditingImage("");
  };

  const toggleUpvote = async (card: RetroCardType) => {
    if (card.authorId === currentUserId || (card.authorName === displayName && displayName !== "")) return;
    
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

  return (
    <div className="flex flex-col gap-3 md:gap-4 lg:gap-8 h-full p-3 md:p-4 lg:p-6 xl:p-8 overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 bg-white/[0.02] border border-white/5 p-3 md:p-4 lg:p-6 rounded-[1rem] md:rounded-[1.5rem] xl:rounded-[2rem]">
          <div className="flex flex-col gap-1 w-full">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-black flex flex-wrap items-center gap-2 md:gap-4 text-white tracking-tight">
              Retro Session
              <span className="text-purple-400 bg-purple-500/10 px-3 py-1 md:px-4 md:py-1 rounded-xl text-[10px] md:text-xs lg:text-sm border border-purple-500/20 shadow-lg shadow-purple-500/10 uppercase tracking-widest font-black">
                {cards.length} INSIGHTS
              </span>
            </h2>
            <p className="text-zinc-500 text-[10px] lg:text-xs uppercase tracking-[0.3em] font-black font-mono mt-1">Archive sprint learnings with team priorities</p>
          </div>
          
          <div className="flex w-full md:w-auto items-center justify-end gap-2 sm:gap-3">
          {isAdmin && (
             <button 
              onClick={addColumn}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 md:py-3 md:px-6 text-xs md:text-sm font-black text-zinc-400 hover:bg-white/10 hover:text-white transition-all active:scale-95 whitespace-nowrap"
             >
               <Plus className="h-4 w-4" />
               New Column
             </button>
          )}
          
          <div className="flex items-center p-1 bg-white/5 rounded-xl border border-white/10">
            <button 
              onClick={exportToCSV}
              className="p-3 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-all active:scale-95 tooltip"
              title="Export RAW"
            >
              <Download className="h-5 w-5" />
            </button>
            <button 
              onClick={exportToPDF}
              disabled={isExporting}
              className="p-3 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-all active:scale-95 tooltip disabled:opacity-30"
              title="Export PDF"
            >
              <UploadCloud className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div 
        ref={boardRef}
        className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-6 xl:gap-12 overflow-y-auto lg:overflow-x-auto overflow-x-hidden p-2 sm:p-4 md:p-6 xl:p-12 pb-24 md:pb-24 custom-scrollbar"
      >
        {columns.map((col) => (
          <div 
            key={col.id} 
            className="flex flex-col w-full lg:min-w-[320px] xl:min-w-[400px] 2xl:min-w-[500px] lg:w-[320px] xl:w-[400px] 2xl:w-[500px] shrink-0 group/col"
          >
             <div className="flex items-center justify-between mb-4 lg:mb-6 px-2 lg:px-4">
                <div className="flex items-center gap-2 lg:gap-3">
                  <h4 className="text-base sm:text-lg lg:text-xl font-bold text-indigo-100">{col.title}</h4>
                  <span className="bg-white/5 text-zinc-500 text-[9px] sm:text-[10px] lg:text-xs px-2 py-0.5 rounded-full border border-white/5 font-mono">
                    {cards.filter((c) => c.columnId === col.id).length}
                  </span>
                </div>
                {isAdmin && (
                  <div className="flex items-center opacity-0 group-hover/col:opacity-100 transition-opacity">
                    <button onClick={() => renameColumn(col)} className="p-1 hover:text-white text-zinc-600"><Settings className="h-3 w-3" /></button>
                    <button onClick={() => deleteColumn(col.id)} className="p-1 hover:text-red-500 text-zinc-600"><X className="h-3 w-3" /></button>
                  </div>
                )}
             </div>

             <div className="flex flex-col gap-4 lg:gap-8 custom-scrollbar pb-6">
                {cards.filter((c) => c.columnId === col.id).map((card) => (
                  <RetroCard
                    key={card.id}
                    card={card}
                    isAdmin={isAdmin}
                    currentUserId={currentUserId}
                    displayName={displayName}
                    isEditing={editingCardId === card.id}
                    editingText={editingText}
                    editingImage={editingImage}
                    setEditingText={setEditingText}
                    setEditingImage={setEditingImage}
                    handleImageUpload={handleImageUpload}
                    onStartEditing={startEditing}
                    onUpdateCard={updateCard}
                    onDeleteCard={deleteCard}
                    onToggleUpvote={toggleUpvote}
                    onAbortEditing={() => setEditingCardId(null)}
                  />
                ))}
                
                {activeColumnId === col.id ? (
                  <div className="flex flex-col gap-3 lg:gap-4 rounded-2xl lg:rounded-3xl bg-white/[0.02] border border-white/10 p-4 lg:p-6 shadow-2xl relative overflow-hidden transition-all duration-300">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50"></div>
                    <textarea 
                      autoFocus
                      placeholder="Type your thought..."
                      className="w-full bg-transparent border-none text-white text-sm md:text-base focus:outline-none resize-none min-h-[100px] custom-scrollbar placeholder-zinc-700"
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
                      <div className="relative w-full rounded-xl overflow-hidden my-2 bg-black/40 border border-indigo-500/20">
                        <img 
                          src={newCardImage} 
                          alt="Preview" 
                          className="w-full h-auto max-h-80 object-contain opacity-90 transition-opacity" 
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

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <label 
                          title="Upload Image"
                          className="h-10 px-4 rounded-xl transition-all flex items-center justify-center gap-2 bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10 cursor-pointer active:scale-90 border border-white/5"
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
                            activeGifSearch === 'new' ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10 border-white/5"
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
                          className="px-3 md:px-4 py-2 text-xs md:text-sm font-bold text-zinc-500 hover:text-white transition-all"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => addCard(col.id)} 
                          className="bg-indigo-600 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-black hover:bg-indigo-500 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/20"
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
                    className="flex h-12 lg:h-16 items-center justify-center gap-2 lg:gap-3 rounded-xl lg:rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] text-zinc-400 hover:border-indigo-500/50 hover:bg-indigo-500/5 hover:text-indigo-400 transition-all group active:scale-95"
                  >
                    <Plus className="h-4 w-4 lg:h-5 lg:w-5 transition-transform group-hover:scale-125" />
                    <span className="font-bold text-xs lg:text-sm uppercase tracking-widest">Add a card</span>
                  </button>
                )}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}export default RetroBoard;
