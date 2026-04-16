import { useRef } from "react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { cn } from "@/lib/utils";

interface JoinRoomModalProps {
  avatar: string;
  setAvatar: (avatar: string) => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (show: boolean) => void;
  handleJoin: (name: string) => void;
}

export function JoinRoomModal({ 
  avatar, 
  setAvatar, 
  showEmojiPicker, 
  setShowEmojiPicker, 
  handleJoin 
}: JoinRoomModalProps) {
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
      <div className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-[#161618] p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-2">Joining Scrum Room</h2>
        <p className="text-zinc-400 text-sm mb-6">Enter a display name to get started. No account needed.</p>
        <form onSubmit={(e) => {
          e.preventDefault();
          const name = (e.currentTarget.elements.namedItem("name") as HTMLInputElement).value;
          handleJoin(name);
        }} className="space-y-6">
          <div className="flex items-center gap-3 relative">
            <div className="relative" ref={emojiPickerRef}>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={cn(
                  "h-14 w-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl transition-all hover:bg-white/10 active:scale-95",
                  showEmojiPicker && "ring-2 ring-indigo-500/50 border-indigo-500/30"
                )}
              >
                {avatar}
              </button>

              {showEmojiPicker && (
                <div className="absolute bottom-16 left-0 z-[100] shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <EmojiPicker 
                    onEmojiClick={(emojiData) => {
                      setAvatar(emojiData.emoji);
                      setShowEmojiPicker(false);
                    }}
                    theme={Theme.AUTO}
                  />
                </div>
              )}
            </div>

            <input 
              name="name" 
              type="text" 
              required 
              autoFocus 
              placeholder="Ex: Sapphire Dev"
              className="flex-1 h-14 rounded-xl bg-white/5 border border-white/10 px-4 text-white font-bold placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
          </div>

          <button 
            type="submit" 
            className="w-full h-14 rounded-xl bg-white text-black font-black text-lg hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-xl"
          >
            Join Now
          </button>
        </form>
      </div>
    </div>
  );
}
