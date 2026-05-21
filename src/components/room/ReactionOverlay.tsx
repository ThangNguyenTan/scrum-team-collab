"use client";

import { useEffect, useState, useRef } from "react";
import { collection, query, orderBy, limit, onSnapshot, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { playPing } from "@/lib/audioSynth";
import { cn } from "@/lib/utils";

interface ReactionOverlayProps {
  roomId: string;
}

interface FloatingItem {
  id: string;
  emoji: string;
  senderName: string;
  xOffset: number;
  rotation: number;
  delay: number;
}

export function ReactionOverlay({ roomId }: ReactionOverlayProps) {
  const [floatingItems, setFloatingItems] = useState<FloatingItem[]>([]);
  const initializedTimeRef = useRef<number>(Date.now() - 3000); // 3s buffer to skip old animations
  const processedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!roomId) return;

    // Listen for recent reactions (max 20)
    const q = query(
      collection(db, "rooms", roomId, "reactions"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const newItems: FloatingItem[] = [];
      let playSound = false;

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          const docId = change.doc.id;

          // Skip if already processed
          if (processedIdsRef.current.has(docId)) return;
          processedIdsRef.current.add(docId);

          // Get created timestamp
          const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now();

          // Only show reactions that were created after the page loaded
          if (createdAt > initializedTimeRef.current) {
            newItems.push({
              id: docId,
              emoji: data.emoji || "🎉",
              senderName: data.senderName || "Someone",
              xOffset: typeof data.xOffset === "number" ? data.xOffset : Math.random() * 80 + 10,
              rotation: Math.random() * 40 - 20, // -20deg to 20deg
              delay: Math.random() * 0.1,        // subtle delay variation
            });
            playSound = true;
          }
        }
      });

      if (newItems.length > 0) {
        // Add to active floaters list
        setFloatingItems((prev) => [...prev, ...newItems]);
        
        if (playSound) {
          playPing();
        }

        // Clean up DOM nodes after animation finishes (2.5s duration)
        newItems.forEach((item) => {
          setTimeout(() => {
            setFloatingItems((prev) => prev.filter((x) => x.id !== item.id));
            processedIdsRef.current.delete(item.id);
          }, 2600);
        });
      }
    });

    return () => unsub();
  }, [roomId]);

  return (
    <div className="absolute inset-0 pointer-events-none z-[99] overflow-hidden">
      {/* Dynamic Keyframe Injection for Float Up Animation */}
      <style jsx global>{`
        @keyframes float-reaction-up {
          0% {
            transform: translateY(100px) scale(0.3);
            opacity: 0;
          }
          15% {
            transform: translateY(0px) scale(1.1);
            opacity: 1;
          }
          30% {
            transform: translateY(-80px) scale(1.0);
            opacity: 0.95;
          }
          100% {
            transform: translateY(-85vh) scale(0.7) rotate(var(--drift-rot));
            opacity: 0;
          }
        }
        .animate-reaction {
          animation: float-reaction-up 2.4s cubic-bezier(0.1, 0.8, 0.25, 1) forwards;
        }
      `}</style>

      {floatingItems.map((item) => (
        <div
          key={item.id}
          className="absolute bottom-24 flex flex-col items-center animate-reaction pointer-events-none select-none"
          style={{
            left: `${item.xOffset}%`,
            animationDelay: `${item.delay}s`,
            // @ts-ignore custom CSS property for rotation drift
            "--drift-rot": `${item.rotation}deg`,
          }}
        >
          {/* Reaction Emoji */}
          <span className="text-4xl md:text-5xl select-none filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)]">
            {item.emoji}
          </span>
          {/* Glassmorphic Sender Name Tag */}
          <span className="mt-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-zinc-950/80 dark:bg-white/10 text-white dark:text-zinc-200 border border-white/10 dark:border-white/5 backdrop-blur-md shadow-lg truncate max-w-[80px]">
            {item.senderName.split(" ")[0]}
          </span>
        </div>
      ))}
    </div>
  );
}
