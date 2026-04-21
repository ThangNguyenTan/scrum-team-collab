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
import { Zap, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { EMOJIS, FEATURES } from "@/constants";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { FeatureCard } from "@/components/landing/FeatureCard";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(EMOJIS[0]);
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
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        await signInAnonymously(auth);
      } else {
        setUser(u);
        setLoading(false);
      }
    });

    const savedName = localStorage.getItem("scrum_user_name");
    if (savedName) setName(savedName);

    const savedAvatar = localStorage.getItem("scrum_user_avatar");
    if (savedAvatar) setAvatar(savedAvatar); else {
      setAvatar(EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
    }

    return () => unsubscribe();
  }, []);

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setCreating(true);
    localStorage.setItem("scrum_user_name", name);
    localStorage.setItem("scrum_user_avatar", avatar);
    
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
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0b] text-white selection:bg-indigo-500/30">
      <LandingNavbar />

      {/* Hero Section */}
      <main className="relative flex-grow flex flex-col items-center justify-center overflow-hidden pt-24 sm:pt-32 pb-12">
        {/* Engineering Mesh Gradients */}
        <div className="absolute top-[-10%] left-[-10%] -z-10 h-[60%] w-[60%] rounded-full bg-indigo-500/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] -z-10 h-[50%] w-[50%] rounded-full bg-purple-600/10 blur-[120px]"></div>
        <div className="absolute top-[20%] right-[10%] -z-10 h-[30%] w-[30%] rounded-full bg-emerald-500/5 blur-[100px]"></div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center z-10 w-full">
          <div className="flex flex-col items-center gap-10 sm:gap-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 w-full">
            <div className="flex flex-col items-center gap-4 sm:gap-6 w-full">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/5 px-3 sm:px-4 py-1.5 sm:py-2 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Fast-Track Agile v2.0</span>
              </div>
              
              <h1 className="text-4xl font-black tracking-tighter text-white sm:text-6xl lg:text-8xl leading-[0.95] sm:leading-[0.85] w-full px-2">
                Agile speed <br />
                <span className="bg-gradient-to-r from-indigo-400 via-emerald-400 to-indigo-400 bg-clip-text text-transparent">redefined.</span>
              </h1>
              
              <p className="max-w-xl text-lg font-medium leading-relaxed text-zinc-400 opacity-80">
                Eliminate friction. No signups, no seat limits. 
                Just pure collaborative engineering for elite teams.
              </p>
            </div>

            <div className="w-full max-w-lg relative z-50 glass p-2 rounded-[2.5rem] shadow-2xl">
              <form onSubmit={createRoom} className="flex flex-col gap-3 bg-[#0a0a0b] p-6 rounded-[2rem] border border-white/5">
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
                        "h-[56px] w-[56px] sm:h-[68px] sm:w-[68px] rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-2xl sm:text-3xl transition-all hover:bg-white/5 active:scale-95 shrink-0",
                        showEmojiPicker && "ring-2 ring-indigo-500/50 border-indigo-500/30"
                      )}
                    >
                      {avatar}
                    </button>

                    {showEmojiPicker && (
                      <div className="absolute top-20 left-0 z-[100] shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in duration-200">
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

                  <div className="relative flex-1 group/field">
                    <input 
                      type="text"
                      required
                      placeholder="Identify yourself..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-2xl bg-zinc-900 border border-white/5 px-4 sm:px-6 py-4 sm:py-5 text-sm sm:text-base font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all duration-300"
                    />
                    <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 opacity-0 group-focus-within/field:opacity-100 transition-opacity hidden sm:block">
                      <span className="text-[9px] font-mono text-indigo-400">READY__</span>
                    </div>
                  </div>
                </div>
                
                <button 
                  type="submit"
                  disabled={creating}
                  className="group relative h-16 w-full overflow-hidden rounded-2xl bg-white transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
                  <span className="relative flex items-center justify-center gap-3 text-base font-black text-black">
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
            </div>

            <div id="feature-grid" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full mt-16 sm:mt-24 px-2 sm:px-0">
              {FEATURES.map((feature, i) => (
                <FeatureCard key={i} feature={feature} index={i} />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-zinc-500">
          © {new Date().getFullYear()} ScrumCollab. Built for high-performance agile teams.
        </div>
      </footer>
    </div>
  );
}
