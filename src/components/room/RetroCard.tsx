import { ThumbsUp, Edit2, Trash2, X, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { RetroCard as RetroCardType } from "@/types";
import { useState } from "react";
import GifPicker from "./GifPicker";

interface RetroCardProps {
  card: RetroCardType;
  isAdmin: boolean;
  currentUserId: string;
  displayName: string;
  isEditing: boolean;
  editingText: string;
  editingImage: string;
  setEditingText: (text: string) => void;
  setEditingImage: (img: string) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => void;
  onStartEditing: (card: RetroCardType) => void;
  onUpdateCard: (cardId: string) => void;
  onDeleteCard: (cardId: string) => void;
  onToggleUpvote: (card: RetroCardType) => void;
  onAbortEditing: () => void;
}

export function RetroCard({
  card,
  isAdmin,
  currentUserId,
  displayName,
  isEditing,
  editingText,
  editingImage,
  setEditingText,
  setEditingImage,
  handleImageUpload,
  onStartEditing,
  onUpdateCard,
  onDeleteCard,
  onToggleUpvote,
  onAbortEditing
}: RetroCardProps) {
  const [showGifPicker, setShowGifPicker] = useState(false);

  return (
    <div 
      className="group relative flex flex-col gap-3 lg:gap-4 rounded-2xl lg:rounded-3xl bg-white/[0.03] border border-white/5 p-4 lg:p-5 xl:p-6 hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all hover:translate-y-[-4px] shadow-[0_20px_40px_rgba(0,0,0,0.3)] perspective-1000"
    >
      {isEditing ? (
        <div className="flex flex-col gap-3">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-indigo-500"></div>
          
          {editingImage && (
            <div className="relative w-full rounded-xl overflow-hidden bg-black/40 border border-indigo-500/20 mb-2">
              <img 
                src={editingImage} 
                alt="Preview" 
                className="w-full h-auto max-h-60 object-contain opacity-90" 
              />
              <button 
                onClick={() => setEditingImage("")}
                className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white hover:bg-black transition-colors"
                title="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <textarea 
            autoFocus
            className="w-full bg-transparent border-none text-white text-sm md:text-base focus:outline-none resize-none min-h-[80px] custom-scrollbar"
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
          />
           <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2">
                <label 
                  title="Change Image"
                  className="h-8 px-3 rounded-lg transition-all flex items-center justify-center gap-2 bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10 cursor-pointer border border-white/5"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Image</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, true)} />
                </label>
                <button 
                  title="Change GIF"
                  onClick={() => setShowGifPicker(!showGifPicker)}
                  className={cn(
                    "h-8 px-3 rounded-lg transition-all flex items-center justify-center border border-transparent",
                    showGifPicker ? "bg-indigo-500 text-white" : "bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10 border-white/5"
                  )}
                >
                  <span className="text-[10px] font-black uppercase tracking-wider">GIF</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={onAbortEditing} className="text-[10px] font-black text-zinc-600 uppercase tracking-widest hover:text-white transition-colors">Abort</button>
                <button onClick={() => onUpdateCard(card.id)} className="bg-indigo-500 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 shadow-lg shadow-indigo-500/20">Sync Edit</button>
              </div>
           </div>

           {showGifPicker && (
             <div className="mt-4">
               <GifPicker 
                 onSelect={(url) => {
                   setEditingImage(url);
                   setShowGifPicker(false);
                 }} 
                 onClose={() => setShowGifPicker(false)} 
               />
             </div>
           )}
        </div>
      ) : (
        <>
          {card.imageUrl && (
            <div className="w-full rounded-2xl overflow-hidden bg-black/40 border border-white/5 group-hover:border-white/10 transition-all duration-500 mb-1">
              <img 
                src={card.imageUrl} 
                alt="Insight" 
                className="w-full h-auto max-h-72 object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                loading="lazy"
              />
            </div>
          )}
          {card.text && <p className="text-xs sm:text-sm lg:text-[15px] xl:text-base text-zinc-200 leading-relaxed font-medium tracking-tight whitespace-pre-wrap">{card.text}</p>}
          
          <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/[0.03]">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-[9px] md:text-[10px] font-black text-indigo-400 border border-indigo-500/20 shadow-inner">
                {card.authorAvatar ? <span className="text-xs md:text-sm">{card.authorAvatar}</span> : (card.authorName || "S").charAt(0).toUpperCase()}
              </div>
              <span className="text-[8px] sm:text-[9px] lg:text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                {card.authorName || "Squad Member"}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5">
              {(isAdmin || card.authorName === displayName) && (
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all mr-2">
                  <button onClick={() => onStartEditing(card)} className="p-2 text-zinc-600 hover:text-indigo-400 transition-colors">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => onDeleteCard(card.id)} className="p-2 text-zinc-600 hover:text-red-500 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <button 
                disabled={card.authorId === currentUserId || (card.authorName === displayName && displayName !== "")}
                onClick={() => onToggleUpvote(card)}
                className={cn(
                  "flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] lg:text-xs font-black transition-all uppercase tracking-widest",
                  (card.authorId === currentUserId || (card.authorName === displayName && displayName !== "")) 
                    ? "opacity-30 cursor-not-allowed" 
                    : "cursor-pointer active:scale-90",
                  card.upvotes.includes(currentUserId) 
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                    : "bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-indigo-400 border border-transparent hover:border-indigo-500/20"
                )}
              >
                <ThumbsUp className={cn("h-3 w-3", card.upvotes.includes(currentUserId) ? "fill-white" : "")} />
                {card.upvotes.length || 0}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
