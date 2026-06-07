import React from "react";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ANIMAL_MAPPING } from "@/constants";

interface PlanningCardProps {
  card: string;
  myVote: string | null;
  onClick: () => void;
}

export function PlanningCard({ card, myVote, onClick }: PlanningCardProps) {
  const animal = ANIMAL_MAPPING[card];

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center h-16 w-12 sm:h-20 sm:w-14 lg:h-24 lg:w-16 xl:h-32 xl:w-24 2xl:h-40 2xl:w-28 rounded-xl lg:rounded-2xl 2xl:rounded-[2rem] transition-all group relative",
        myVote === card
          ? "bg-indigo-500 border-[3px] border-indigo-400 scale-110 shadow-[0_20px_60px_rgba(99,102,241,0.4)] z-20"
          : "bg-white dark:bg-black/60 border border-zinc-200 dark:border-white/10 shadow-sm",
        myVote !== card &&
          "hover:border-zinc-300 dark:hover:border-white/40 hover:bg-zinc-50 dark:hover:bg-white/10 hover:-translate-y-3 active:scale-95"
      )}
    >
      {/* Animal Backdrop Wrapper with Overflow Hidden and Safari Webkit fix */}
      {animal && (
        <div className="absolute inset-x-0 inset-y-0 z-0 overflow-hidden rounded-[inherit] [transform:translateZ(0)] border-[0.5px] border-transparent">
          <Image
            src={animal.image}
            alt={animal.name}
            fill
            unoptimized
            className={cn(
              "object-cover transition-all duration-700",
              myVote === card
                ? "opacity-40 grayscale-0 scale-110"
                : "opacity-10 grayscale group-hover:opacity-30 group-hover:grayscale-0"
            )}
          />
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-t via-transparent to-transparent",
              myVote === card ? "from-black/60" : "from-white/80 dark:from-black/80"
            )}
          ></div>
        </div>
      )}

      {myVote === card && (
        <div className="absolute -top-4 -right-4 h-10 w-10 rounded-full bg-white text-indigo-600 flex items-center justify-center shadow-[0_10px_25px_rgba(0,0,0,0.3)] z-30 animate-in zoom-in duration-300 ring-4 ring-indigo-500/20">
          <CheckCircle2 className="h-6 w-6" />
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center">
        <span
          className={cn(
            "text-lg sm:text-xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-black transition-transform group-hover:scale-125 duration-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]",
            card === "☕" ? "text-xl sm:text-2xl lg:text-3xl xl:text-4xl" : "",
            myVote === card ? "text-white" : "text-zinc-900 dark:text-white"
          )}
        >
          {card}
        </span>
        {animal && (
          <span
            className={cn(
              "text-[6px] md:text-[8px] xl:text-[10px] uppercase font-black tracking-[0.2em] mt-1 transition-all",
              myVote === card
                ? "text-white opacity-100"
                : "text-zinc-500 group-hover:text-zinc-700 dark:text-white/40 dark:group-hover:text-white/80"
            )}
          >
            {animal.name}
          </span>
        )}
        {!animal && card !== "☕" && (
          <span
            className={cn(
              "text-[8px] md:text-[9px] xl:text-[10px] uppercase font-black tracking-widest mt-1 sm:mt-2 transition-all",
              myVote === card
                ? "text-white opacity-80"
                : "text-zinc-500 group-hover:text-zinc-700 dark:text-white/40 dark:opacity-30 dark:group-hover:text-white/80 dark:group-hover:opacity-100"
            )}
          >
            Points
          </span>
        )}
      </div>
    </button>
  );
}
