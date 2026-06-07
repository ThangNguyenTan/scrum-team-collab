"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  onAuthStateChanged, 
  signInAnonymously,
  User 
} from "firebase/auth";
import { 
  collection, 
  addDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { EMOJIS, FEATURES, TEAM_GROUPS, DECKS, DeckType } from "@/constants";
import { FeatureCard, DraggableEmojiPicker } from "@/ui";
import { LandingNavbar } from "@/features";
import { LandingLayout } from "@/layouts";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(EMOJIS[0]);
  const [group, setGroup] = useState("");
  const [deckType, setDeckType] = useState<DeckType>("fibonacci");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const cards = entry.target.querySelectorAll(".feature-card");
          cards.forEach((card, i) => {
            setTimeout(() => {
              card.classList.remove("opacity-0", "translate-y-8");
              card.classList.add("opacity-100", "translate-y-0", "duration-1000", "transition-all");
            }, i * 150);
          });
        }
      });
    }, { threshold: 0.1 });

    const target = document.querySelector("#feature-grid");
    if (target) observer.observe(target);

    return () => observer.disconnect();
  }, [loading]);

  useEffect(() => {
    // Attempt auto-login anonymously if not logged in
    console.log("DEBUG: useEffect running, auth is", !!auth);
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      console.log("DEBUG: onAuthStateChanged triggered. user:", u ? u.uid : "null");
      if (!u) {
        try {
          console.log("DEBUG: calling signInAnonymously");
          await signInAnonymously(auth);
          console.log("DEBUG: signInAnonymously completed successfully");
        } catch (error) {
          console.error("Firebase signInAnonymously failed:", error);
        }
      } else {
        console.log("DEBUG: User logged in, setting loading to false");
        setUser(u);
        setLoading(false);
      }
    });

    setTimeout(() => {
      console.log("DEBUG: localStorage timeout running");
      const savedName = localStorage.getItem("scrum_user_name");
      if (savedName) setName(savedName);

      const savedAvatar = localStorage.getItem("scrum_user_avatar");
      if (savedAvatar) setAvatar(savedAvatar); else {
        setAvatar(EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
      }

      const savedGroup = localStorage.getItem("scrum_user_group");
      if (savedGroup) setGroup(savedGroup);
    }, 0);

    return () => {
      console.log("DEBUG: useEffect cleanup running");
      unsubscribe();
    };
  }, []);

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setCreating(true);
    localStorage.setItem("scrum_user_name", name);
    localStorage.setItem("scrum_user_avatar", avatar);
    localStorage.setItem("scrum_user_group", group);
    
    try {
      let currentUser = auth.currentUser;
      if (!currentUser) {
        const cred = await signInAnonymously(auth);
        currentUser = cred.user;
      }

      // Create a new room in Firestore
      const roomRef = await addDoc(collection(db, "rooms"), {
        creatorId: currentUser.uid,
        creatorName: name,
        status: "planning", // default starting mode
        revealed: false,
        deckType: deckType,
        createdAt: serverTimestamp(),
      });
      
      localStorage.setItem(`scrum_is_creator_${roomRef.id}`, "true");
      
      // Redirect to the new room
      router.push(`/room/${roomRef.id}`);
    } catch (error) {
      console.error("Failed to create room:", error);
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <LandingLayout
      navbarSlot={<LandingNavbar />}
      formSlot={
        <form onSubmit={createRoom} className="flex flex-col gap-3 bg-background p-6 rounded-[2rem] border border-zinc-200 dark:border-white/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-1 sm:gap-0">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Creator Identity</span>
            <span className="text-[10px] font-mono text-zinc-600">ID: {user?.uid?.slice(0, 8) || "ANON-0X"}</span>
          </div>
          
          <div className="relative group/input flex items-center gap-3">
            <div className="relative" ref={emojiPickerRef}>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={cn(
                  "h-[56px] w-[56px] sm:h-[68px] sm:w-[68px] rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-2xl sm:text-3xl transition-all hover:bg-zinc-200 active:scale-95 shrink-0",
                  "dark:bg-zinc-900 dark:border-white/5 dark:hover:bg-white/5",
                  showEmojiPicker && "ring-2 ring-indigo-500/50 border-indigo-500/30 dark:border-indigo-500/30"
                )}
              >
                {avatar}
              </button>

              {showEmojiPicker && (
                <DraggableEmojiPicker defaultClassName="top-20 left-0 animate-in fade-in zoom-in duration-200">
                  <EmojiPicker 
                    onEmojiClick={(emojiData) => {
                      setAvatar(emojiData.emoji);
                      setShowEmojiPicker(false);
                    }}
                    theme={Theme.AUTO}
                  />
                </DraggableEmojiPicker>
              )}
            </div>

            <div className="relative flex-1 group/field">
              <input 
                type="text"
                required
                placeholder="Identify yourself..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl bg-zinc-100 border border-zinc-200 px-4 sm:px-6 py-4 sm:py-5 text-sm sm:text-base font-bold text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all duration-300 dark:bg-zinc-900 dark:border-white/5 dark:text-white dark:placeholder:text-zinc-600"
              />
              <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 opacity-0 group-focus-within/field:opacity-100 transition-opacity hidden sm:block">
                <span className="text-[9px] font-mono text-indigo-400">READY__</span>
              </div>
            </div>
          </div>

          <div className="relative group/group-input space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1 ml-1">Squad / Team Group <span className="text-rose-500">*</span></label>
            <input 
              type="text"
              placeholder="Team Group (Ex: FE, BE, QA...)"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              maxLength={15}
              required
              className="w-full rounded-2xl bg-zinc-100 border border-zinc-200 px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all duration-300 dark:bg-zinc-900 dark:border-white/5 dark:text-zinc-300 dark:placeholder:text-zinc-700"
            />
            <div className="grid grid-cols-5 gap-2 mt-3">
              {TEAM_GROUPS.map(g => (
                <button
                  key={`home-group-${g}`}
                  type="button"
                  onClick={() => setGroup(g)}
                  className={cn(
                    "h-10 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center",
                    group === g 
                      ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-600 dark:text-indigo-400" 
                      : "bg-zinc-100 border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 hover:border-zinc-300 dark:bg-white/5 dark:border-white/10 dark:hover:text-white dark:hover:bg-white/10 dark:hover:border-white/20"
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="relative group/deck-input space-y-2 mt-2">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1 ml-1">Estimation Deck Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(DECKS) as DeckType[]).map((type) => {
                const config = DECKS[type];
                const isSelected = deckType === type;
                return (
                  <button
                    key={`deck-select-${type}`}
                    type="button"
                    onClick={() => setDeckType(type)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
                      isSelected
                        ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-600 dark:text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                        : "bg-zinc-100 border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 hover:border-zinc-300 dark:bg-white/5 dark:border-white/10 dark:hover:text-white dark:hover:bg-white/10 dark:hover:border-white/20"
                    )}
                  >
                    <span className="text-xl mb-1">{config.icon}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider">{config.name}</span>
                    <span className="text-[8px] text-zinc-400 dark:text-zinc-500 mt-1 font-medium leading-tight line-clamp-2">{config.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
          <button 
            type="submit"
            disabled={creating}
            className="group relative h-16 w-full overflow-hidden rounded-2xl bg-zinc-900 dark:bg-white transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
            <span className="relative flex items-center justify-center gap-3 text-base font-black text-white dark:text-black">
              {creating ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
              ) : (
                <>
                  Initialize SCRUM_SESSION
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </span>
          </button>
        </form>
      }
      featureGridSlot={
        <>
          {FEATURES.map((feature, i) => (
            <FeatureCard key={i} feature={feature} index={i} />
          ))}
        </>
      }
    />
  );
}
