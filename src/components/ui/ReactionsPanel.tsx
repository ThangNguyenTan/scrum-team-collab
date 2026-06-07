"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  Smile, 
  Volume2, 
  VolumeX, 
  X, 
  Sparkles, 
  Flame, 
  Trophy, 
  Bomb, 
  BellRing,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMuteState, setMuteState } from "@/lib/audioSynth";

interface ReactionsPanelProps {
  roomId: string;
  senderId: string;
  senderName: string;
}

const EMOJIS = ["🎉", "🔥", "👏", "💡", "🚨", "🚀"];

const SOUNDS = [
  { type: "tada", label: "Tada", icon: Sparkles, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  { type: "success", label: "Success", icon: Trophy, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  { type: "fail", label: "Buzz", icon: Bomb, color: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
  { type: "ping", label: "Ping", icon: BellRing, color: "text-sky-500 bg-sky-500/10 border-sky-500/20" },
] as const;

export function ReactionsPanel({ roomId, senderId, senderName }: ReactionsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});

  useEffect(() => {
    // Sync mute state on mount
    setIsMuted(getMuteState());
  }, []);

  const handleMuteToggle = () => {
    const nextMuted = !isMuted;
    setMuteState(nextMuted);
    setIsMuted(nextMuted);
  };

  const triggerReaction = async (emoji: string) => {
    if (!roomId || !senderId) return;

    try {
      const xOffset = Math.random() * 70 + 15; // Stay between 15% and 85% width
      
      const docRef = await addDoc(collection(db, "rooms", roomId, "reactions"), {
        emoji,
        senderId,
        senderName: senderName || "Someone",
        xOffset,
        createdAt: serverTimestamp(),
      });

      // Self-cleaning: Delete from Firestore after 3 seconds
      setTimeout(() => {
        deleteDoc(docRef).catch(() => {});
      }, 3000);
    } catch (error) {
      console.error("Failed to send reaction:", error);
    }
  };

  const triggerSound = async (soundType: string) => {
    if (!roomId || !senderId) return;

    // Check Cooldown
    const now = Date.now();
    if (cooldowns[soundType] && now < cooldowns[soundType]) {
      return;
    }

    // Set 3-second cooldown
    setCooldowns((prev) => ({ ...prev, [soundType]: now + 3000 }));

    try {
      const docRef = await addDoc(collection(db, "rooms", roomId, "sounds"), {
        soundType,
        senderId,
        senderName: senderName || "Someone",
        createdAt: serverTimestamp(),
      });

      // Self-cleaning: Delete sound event document after 3 seconds
      setTimeout(() => {
        deleteDoc(docRef).catch(() => {});
      }, 3000);
    } catch (error) {
      console.error("Failed to send sound event:", error);
    }
  };

  // Helper to get active cooldown remaining percentage
  const getCooldownPercent = (soundType: string) => {
    const expires = cooldowns[soundType];
    if (!expires) return 0;
    const now = Date.now();
    if (now >= expires) return 0;
    return ((expires - now) / 3000) * 100;
  };

  // Re-render cooldown progress circles if any are active
  const [, setTick] = useState(0);
  useEffect(() => {
    const activeCooldowns = Object.values(cooldowns).some((exp) => exp > Date.now());
    if (!activeCooldowns) return;

    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 100);

    return () => clearInterval(interval);
  }, [cooldowns]);

  return (
    <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 flex flex-col items-end gap-3 pointer-events-auto">
      {/* Expanded Control Box */}
      {isOpen && (
        <div className="flex flex-col gap-4 bg-white/80 dark:bg-zinc-950/80 border border-zinc-200 dark:border-white/10 p-4 rounded-3xl backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] animate-in slide-in-from-bottom-5 duration-300 w-48 md:w-56 overflow-hidden">
          
          {/* Reaction Emojis Section */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 ml-1">
              Send Reaction
            </span>
            <div className="grid grid-cols-3 gap-2">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => triggerReaction(emoji)}
                  className="h-10 text-xl flex items-center justify-center rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 active:scale-90 transition-all border border-zinc-200/50 dark:border-white/5"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[1px] bg-zinc-200 dark:bg-white/5"></div>

          {/* Soundboard Section */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between ml-1 pr-1">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
                Team Soundboard
              </span>
              <button
                onClick={handleMuteToggle}
                className={cn(
                  "p-1 rounded-md transition-colors",
                  isMuted 
                    ? "text-rose-500 hover:bg-rose-500/10" 
                    : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
                )}
                title={isMuted ? "Unmute local sounds" : "Mute local sounds"}
              >
                {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {SOUNDS.map((sound) => {
                const expires = cooldowns[sound.type] || 0;
                const onCooldown = Date.now() < expires;
                const cooldownPercent = getCooldownPercent(sound.type);
                const SoundIcon = sound.icon;

                return (
                  <button
                    key={sound.type}
                    onClick={() => triggerSound(sound.type)}
                    disabled={onCooldown}
                    className={cn(
                      "h-12 relative overflow-hidden rounded-xl border flex flex-col items-center justify-center gap-1 active:scale-95 transition-all text-xs font-bold",
                      sound.color,
                      onCooldown && "opacity-40 cursor-not-allowed active:scale-100"
                    )}
                  >
                    {/* Visual circular/progress bar countdown when on cooldown */}
                    {onCooldown && (
                      <div 
                        className="absolute bottom-0 left-0 h-1 bg-current opacity-30 transition-all duration-100"
                        style={{ width: `${cooldownPercent}%` }}
                      ></div>
                    )}
                    <SoundIcon className="h-4 w-4" />
                    <span className="text-[9px] font-medium tracking-tight">{sound.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Circular Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-14 w-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg active:scale-95 group",
          isOpen
            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-[0_15px_30px_rgba(0,0,0,0.3)] rotate-90"
            : "bg-indigo-500 text-white hover:scale-110 shadow-[0_10px_25px_rgba(99,102,241,0.4)]"
        )}
        title={isOpen ? "Close reactions" : "Express yourself"}
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Smile className="h-6 w-6 transition-transform group-hover:scale-110 group-hover:rotate-12" />
        )}
      </button>
    </div>
  );
}
