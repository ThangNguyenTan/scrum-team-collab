import { 
  ThumbsUp, 
  Edit2, 
  Trash2, 
  X, 
  GripVertical, 
  MessageSquare, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle, 
  Circle,
  Undo
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { RetroCard as RetroCardType, RoomUser } from "@/types";
import { useState } from "react";
import { CustomDialog, useCustomDialog } from "@/ui";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface RetroCardProps {
  card: RetroCardType;
  roomId: string;
  isAdmin: boolean;
  currentUserId: string;
  displayName: string;
  avatar: string;
  users: RoomUser[];
  mergedCards: RetroCardType[];
  isActionItem: boolean;
  onDeleteCard: (cardId: string) => Promise<void>;
  onToggleUpvote: (card: RetroCardType) => Promise<void>;
  onEditCard?: (card: RetroCardType) => void;
  isOverlay?: boolean;
}

export function RetroCard({
  card,
  roomId,
  isAdmin,
  currentUserId,
  displayName,
  avatar,
  users,
  mergedCards,
  isActionItem,
  onDeleteCard,
  onToggleUpvote,
  onEditCard,
  isOverlay = false
}: RetroCardProps) {
  const { alertCustom, confirmCustom, dialogProps } = useCustomDialog();

  // Accordion Stack State
  const [stackExpanded, setStackExpanded] = useState(false);

  // Comments State
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");

  // Drag & Drop configuration
  const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({
    id: card.id,
    disabled: isOverlay
  });
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: card.id,
  });

  const setCombinedRef = (node: HTMLDivElement | null) => {
    if (isOverlay) return;
    setDraggableRef(node);
    setDroppableRef(node);
  };

  const showAsPlaceholder = isDragging && !isOverlay;
  const isTargetHighlight = isOver && !isDragging && !isOverlay;

  const dragStyle = transform && !isDragging && !isOverlay ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const commentText = newComment.trim();
    if (!commentText) return;

    // Optimistically clear the input field immediately
    setNewComment("");

    const ref = doc(db, "rooms", roomId, "cards", card.id);
    const currentUser = users.find(u => u.id === currentUserId);
    const commentObj = {
      id: Math.random().toString(36).substring(2, 11),
      text: commentText,
      authorId: currentUserId,
      authorName: currentUser?.name || displayName || "Team Member",
      authorAvatar: currentUser?.avatar || avatar || "👤",
      createdAt: Date.now()
    };

    try {
      await updateDoc(ref, {
        comments: arrayUnion(commentObj)
      });
    } catch (err) {
      console.error("Failed to add comment:", err);
      // Restore input text on database failure
      setNewComment(commentText);
    }
  };

  const handleDeleteComment = async (comment: any) => {
    const confirmed = await confirmCustom("Delete Comment", "Are you sure you want to delete this comment?", "danger", "Delete");
    if (!confirmed) return;
    const ref = doc(db, "rooms", roomId, "cards", card.id);
    await updateDoc(ref, {
      comments: arrayRemove(comment)
    });
  };

  const unmergeCard = async (childId: string) => {
    const confirmed = await confirmCustom("Separate Thought", "Are you sure you want to separate this thought from the stack?", "primary", "Separate");
    if (!confirmed) return;
    const ref = doc(db, "rooms", roomId, "cards", childId);
    await updateDoc(ref, {
      parentCardId: null
    });
  };

  // Combine comments from parent and children
  const allComments = [...(card.comments || [])];
  mergedCards.forEach(c => {
    if (c.comments) {
      allComments.push(...c.comments);
    }
  });
  allComments.sort((a, b) => a.createdAt - b.createdAt);

  const totalUpvotes = card.upvotes.length + mergedCards.reduce((acc, c) => acc + (c.upvotes?.length || 0), 0);

  const cardTheme = "bg-white/80 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-zinc-500/5";

  return (
    <div 
      ref={setCombinedRef}
      style={dragStyle}
      {...attributes}
      {...listeners}
      className={cn(
        "relative w-full cursor-default",
        isDragging || isOverlay ? "transition-none" : "transition-all duration-300",
        isTargetHighlight ? "scale-[1.02]" : ""
      )}
    >
      {/* Decorative Card Stack layers behind the card */}
      {mergedCards.length > 0 && !showAsPlaceholder && (
        <>
          {/* Layer 2 (Furthest) */}
          <div className={cn(
            "absolute -bottom-2.5 left-4 right-4 h-full rounded-2xl border opacity-40 z-0 pointer-events-none shadow-sm",
            isDragging || isOverlay ? "transition-none" : "transition-all duration-300",
            cardTheme
          )} />
          {/* Layer 1 (Middle) */}
          <div className={cn(
            "absolute -bottom-1.5 left-2 right-2 h-full rounded-2xl border opacity-70 z-0 pointer-events-none shadow-sm",
            isDragging || isOverlay ? "transition-none" : "transition-all duration-300",
            cardTheme
          )} />
        </>
      )}

      {/* Main Card */}
      <div 
        className={cn(
          "group relative flex flex-col gap-3 lg:gap-4 rounded-2xl lg:rounded-3xl border p-5 lg:p-6 shadow-sm dark:shadow-[0_20px_40px_rgba(0,0,0,0.3)] hover:shadow-md z-10",
          isDragging || isOverlay ? "transition-none" : "transition-all duration-300",
          cardTheme,
          isTargetHighlight ? "ring-4 ring-indigo-500/50 border-indigo-500" : "",
          showAsPlaceholder ? "opacity-30 border-dashed border-indigo-500 bg-transparent dark:bg-transparent" : ""
        )}
      >

          {card.imageUrl && (
            <div className="w-full relative min-h-[250px] rounded-2xl overflow-hidden bg-black/5 dark:bg-black/40 border border-zinc-200 dark:border-white/5 group-hover:border-zinc-300 dark:group-hover:border-white/10 transition-all duration-500 mb-1">
              <Image 
                src={card.imageUrl} 
                alt="Insight" 
                fill
                unoptimized
                className="object-contain opacity-80 group-hover:opacity-100 transition-opacity"
              />
            </div>
          )}
          {card.text && <p className="text-xs sm:text-sm lg:text-[15px] xl:text-base leading-relaxed font-semibold tracking-tight whitespace-pre-wrap">{card.text}</p>}

          {/* Render Stacked Cards Accordion */}
          {mergedCards.length > 0 && (
            <div className="mt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800 pt-3">
              <button
                onClick={() => setStackExpanded(!stackExpanded)}
                className="flex items-center justify-between w-full text-xs font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
              >
                <span className="flex items-center gap-2">
                  📚 Stacked Thoughts ({mergedCards.length + 1})
                </span>
                {stackExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {stackExpanded && (
                <div className="flex flex-col gap-3 mt-3 pl-3 border-l-2 border-indigo-500/30 animate-in slide-in-from-top-2 duration-200">
                  {mergedCards.map((c) => (
                    <div 
                      key={c.id} 
                      className="group/child relative flex flex-col gap-2 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/50"
                    >
                      {c.imageUrl && (
                        <div className="w-full relative min-h-[120px] rounded-lg overflow-hidden bg-black/5 dark:bg-black/40 mb-1">
                          <Image src={c.imageUrl} alt="Insight" fill unoptimized className="object-contain opacity-90" />
                        </div>
                      )}
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">{c.text}</p>
                      
                      <div className="flex items-center justify-between mt-1 text-[10px] text-zinc-400 dark:text-zinc-600">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded">
                            {c.authorAvatar || "👤"}
                          </span>
                          <span className="font-semibold uppercase tracking-wider">{c.authorName}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Unmerge capability */}
                          {(isAdmin || c.authorId === currentUserId) && (
                            <button
                              onClick={() => unmergeCard(c.id)}
                              className="p-1 hover:text-red-500 text-zinc-400 dark:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-white/5 rounded transition-colors"
                              title="Unmerge thought"
                            >
                              <Undo className="h-3 w-3" />
                            </button>
                          )}
                          <span className="flex items-center gap-0.5 font-black">
                            👍 {c.upvotes?.length || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 mt-2 pt-4 border-t border-zinc-200 dark:border-white/[0.03] w-full">
            {/* Row 1: Author Info */}
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-[9px] md:text-[10px] font-black text-indigo-400 border border-indigo-500/20 shadow-inner shrink-0">
                {card.authorAvatar ? <span className="text-xs md:text-sm">{card.authorAvatar}</span> : (card.authorName || "S").charAt(0).toUpperCase()}
              </div>
              <span className="text-[8px] sm:text-[9px] lg:text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] truncate">
                {card.authorName || "Squad Member"}
              </span>
            </div>

            {/* Row 2: Actions Row */}
            <div className="flex items-center justify-between w-full gap-2 no-drag">
              {/* Left side: Comments button */}
              <button 
                onClick={() => setShowComments(!showComments)}
                className={cn(
                  "flex items-center gap-1 md:gap-2 px-2.5 py-1.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] lg:text-xs font-black transition-all uppercase tracking-widest shrink-0",
                  showComments 
                    ? "bg-indigo-500/15 text-indigo-500 border border-indigo-500/25" 
                    : "bg-zinc-100 dark:bg-white/5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-white/10 hover:text-indigo-600 dark:hover:text-indigo-400 border border-transparent"
                )}
              >
                <MessageSquare className="h-3 w-3" />
                <span>Comments ({allComments.length})</span>
              </button>
              
              {/* Right side: Actions (Edit/Delete) and Like/Upvote */}
              <div className="flex items-center gap-1.5 ml-auto shrink-0">
                {/* Edit/Delete options */}
                {(isAdmin || card.authorId === currentUserId) && (
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all mr-1 gap-1">
                    <button 
                      onClick={() => onEditCard?.(card)} 
                      title="Edit Insight"
                      aria-label="Edit Insight"
                      className="p-2 text-zinc-400 dark:text-zinc-600 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:scale-110 rounded-lg active:scale-90 transition-all duration-200"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => onDeleteCard(card.id)} 
                      title="Delete Insight"
                      aria-label="Delete Insight"
                      className="p-2 text-zinc-400 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:scale-110 rounded-lg active:scale-90 transition-all duration-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Upvote button */}
                <button 
                  disabled={card.authorId === currentUserId}
                  onClick={() => onToggleUpvote(card)}
                  className={cn(
                    "flex items-center gap-1 md:gap-2 px-2.5 md:px-3 py-1.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] lg:text-xs font-black transition-all uppercase tracking-widest group/upvote",
                    card.authorId === currentUserId
                      ? "opacity-30 cursor-not-allowed" 
                      : "cursor-pointer active:scale-90",
                    card.upvotes.includes(currentUserId) 
                      ? "bg-indigo-50 text-white shadow-lg shadow-indigo-500/20" 
                      : "bg-zinc-100 dark:bg-white/5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-white/10 hover:text-indigo-600 dark:hover:text-indigo-400 border border-transparent hover:border-indigo-500/20"
                  )}
                >
                  <ThumbsUp className={cn("h-3 w-3 transition-transform duration-200 group-hover/upvote:scale-110", card.upvotes.includes(currentUserId) ? "fill-white" : "")} />
                  {totalUpvotes}
                </button>
              </div>
            </div>
          </div>

          {/* Comments panel */}
          {showComments && (
            <div className="mt-4 border-t border-zinc-200 dark:border-white/5 pt-4 animate-in slide-in-from-bottom-2 duration-200 no-drag">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-3">Discussion Thread</span>
              
              {/* Comment list */}
              {allComments.length === 0 ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-500 italic mb-4">No comments posted yet. Start the conversation!</p>
              ) : (
                <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto custom-scrollbar mb-4 pr-1">
                  {allComments.map((comment: any) => (
                    <div key={comment.id} className="flex gap-2.5 items-start p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-200/50 dark:border-zinc-800/40">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-indigo-500/10 text-[9px] font-black text-indigo-400">
                        {comment.authorAvatar || "👤"}
                      </div>
                      
                      <div className="flex-1 flex flex-col gap-0.5">
                        <div className="flex items-center justify-between text-[9px]">
                          <span className="font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{comment.authorName}</span>
                          <span className="text-zinc-400 dark:text-zinc-600">{new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">{comment.text}</p>
                      </div>

                      {(isAdmin || comment.authorId === currentUserId) && (
                        <button
                          onClick={() => handleDeleteComment(comment)}
                          className="text-[9px] font-bold text-zinc-400 hover:text-red-500 p-0.5"
                          title="Delete comment"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add comment form */}
              <form onSubmit={handleAddComment} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 placeholder-zinc-400 dark:placeholder-zinc-600 font-medium"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider active:scale-95 transition-all shadow-md shadow-indigo-500/10 shrink-0"
                >
                  Post
                </button>
              </form>
            </div>
          )}
      </div>
      <CustomDialog {...dialogProps} />
    </div>
  );
}

export default RetroCard;
