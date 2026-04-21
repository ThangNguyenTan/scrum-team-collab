import { useRef } from "react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { cn } from "@/lib/utils";
import { TEAM_GROUPS } from "@/constants";

interface JoinRoomModalProps {
  avatar: string;
  defaultName?: string;
  defaultGroup?: string;
  buttonText?: string;
  setAvatar: (avatar: string) => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (show: boolean) => void;
  handleJoin: (name: string, group: string) => void;
  onClose?: () => void;
}

export function JoinRoomModal({ 
  avatar, 
  defaultName,
  defaultGroup,
  buttonText = "Join Room",
  setAvatar, 
  showEmojiPicker, 
  setShowEmojiPicker, 
  handleJoin,
  onClose
}: JoinRoomModalProps) {
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  const isUpdate = buttonText === "Update Profile";

  return (
    <div 
      onClick={handleBackdropClick}
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6",
        onClose && "cursor-pointer"
      )}
    >
      <div className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-[#161618] p-8 shadow-2xl cursor-default">
        <h2 className="text-2xl font-bold text-white mb-1">{isUpdate ? "Update Profile" : "Joining Scrum Room"}</h2>
        <p className="text-zinc-400 text-sm mb-6">{isUpdate ? "Modify your identity for this session." : "Enter your details to get started. No account needed."}</p>
        <form onSubmit={(e) => {
          e.preventDefault();
          const name = (e.currentTarget.elements.namedItem("name") as HTMLInputElement).value;
          const group = (e.currentTarget.elements.namedItem("group") as HTMLInputElement).value;
          handleJoin(name, group);
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
              defaultValue={defaultName}
              placeholder="Display Name"
              className="flex-1 h-14 rounded-xl bg-white/5 border border-white/10 px-4 text-white font-bold placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
          </div>

          <div className="space-y-2">
            <input 
              name="group" 
              type="text" 
              list="groups-list"
              defaultValue={defaultGroup}
              placeholder="Team Group (FE, BE, QA...)"
              maxLength={15}
              className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-4 text-white font-medium placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm"
            />
            <datalist id="groups-list">
              {TEAM_GROUPS.map(g => <option key={g} value={g} />)}
            </datalist>
            <div className="flex flex-wrap gap-2 mt-2">
              {TEAM_GROUPS.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={(e) => {
                    const input = (e.currentTarget.parentElement?.previousElementSibling?.previousElementSibling) as HTMLInputElement;
                    if (input) {
                      input.value = g;
                      input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-500 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full h-14 rounded-xl bg-white text-black font-black text-lg hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-xl"
          >
            {buttonText}
          </button>
        </form>
      </div>
    </div>
  );
}
