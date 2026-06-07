import React from "react";
import Image from "next/image";
import { Coffee, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoomUser } from "@/types";
import { ANIMAL_MAPPING, getGroupStyles } from "@/constants";

interface UserVoteCardProps {
  user: RoomUser;
  revealed: boolean;
  currentUserId: string;
}

export function UserVoteCard({ user, revealed, currentUserId }: UserVoteCardProps) {
  const groupStyles = getGroupStyles(user.group);
  const groupBorderAndBg = groupStyles.split(" ");
  const borderClass = groupBorderAndBg[0];
  const bgClass = groupBorderAndBg[1];

  return (
    <div
      data-testid="user-vote-card"
      className={cn(
        "flex flex-col items-center justify-center p-2 sm:p-4 xl:p-8 2xl:p-10 rounded-xl xl:rounded-[2.5rem] 2xl:rounded-[3rem] border transition-all duration-700 relative group/member w-full h-full",
        borderClass,
        bgClass,
        revealed && user.vote && "shadow-[0_0_40px_rgba(99,102,241,0.1)] scale-105"
      )}
    >
      {user.group && (
        <div
          className={cn(
            "absolute top-4 left-4 px-2 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-tighter transition-all group-hover/member:opacity-100",
            groupStyles
          )}
        >
          {user.group}
        </div>
      )}
      <div
        className={cn(
          "h-20 w-14 sm:h-24 sm:w-16 md:h-28 md:w-20 lg:h-32 lg:w-24 xl:h-36 xl:w-28 2xl:h-44 2xl:w-32 rounded-lg md:rounded-2xl 2xl:rounded-[1.5rem] flex items-center justify-center transition-all duration-1000 perspective-1000 group/card cursor-pointer mb-2 xl:mb-8",
          revealed ? "rotate-0 scale-110" : user.vote ? "rotate-y-180" : "opacity-30 dark:opacity-10 scale-90"
        )}
      >
        {revealed ? (
          <div
            className={cn(
              "h-full w-full rounded-lg md:rounded-2xl bg-white text-zinc-900 flex flex-col items-center justify-center shadow-md dark:shadow-[0_25px_50px_rgba(0,0,0,0.5)] relative overflow-hidden ring-2",
              user.group ? borderClass.replace("border-", "ring-") : "ring-zinc-200 dark:ring-white/20"
            )}
          >
            {/* Animal Reveal Backdrop */}
            {user.vote && ANIMAL_MAPPING[user.vote] && (
              <div className="absolute inset-0 z-0">
                <Image
                  src={ANIMAL_MAPPING[user.vote].image}
                  alt={ANIMAL_MAPPING[user.vote].name}
                  fill
                  unoptimized
                  className="object-cover opacity-20 filter sepia-[0.3]"
                />
              </div>
            )}
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-br from-transparent to-transparent z-10",
                user.group && bgClass.replace("bg-", "from-").replace("/5", "/20")
              )}
            ></div>
            <div className="absolute top-1 left-1 lg:top-3 lg:left-3 text-[6px] md:text-[8px] opacity-30 font-black tracking-tighter uppercase z-20">
              ESTM
            </div>
            <div className="absolute bottom-1 right-1 lg:bottom-3 lg:right-3 text-[6px] md:text-[8px] opacity-30 font-black tracking-tighter self-end rotate-180 uppercase z-20">
              ESTM
            </div>
            <div className="flex flex-col items-center relative z-20">
              <span className="text-3xl md:text-5xl xl:text-7xl 2xl:text-8xl font-black tracking-tighter mt-1">
                {user.vote === "☕" ? (
                  <Coffee className="h-6 w-6 lg:h-12 lg:w-12 2xl:h-16 2xl:w-16" />
                ) : (
                  user.vote || "-"
                )}
              </span>
              {user.vote && ANIMAL_MAPPING[user.vote] && (
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-black/60">
                  {ANIMAL_MAPPING[user.vote].name}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "h-full w-full rounded-lg md:rounded-2xl flex items-center justify-center shadow-lg border-2 relative overflow-hidden",
              user.vote
                ? "bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 border-transparent ring-2 ring-indigo-400/20"
                : "bg-zinc-50 border-zinc-200 dark:bg-white/5 dark:border-white/5 border-dashed"
            )}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.1),transparent)]"></div>
            {user.vote && (
              <div className="flex flex-col items-center gap-2 [transform:rotateY(180deg)]">
                <div className="h-10 w-10 border border-white/20 rounded-xl bg-white/10 flex items-center justify-center shadow-lg">
                  <Zap className="h-5 w-5 text-indigo-200" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">
                  Voted
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center w-full mt-2 lg:mt-0">
        <div className="mb-2 h-6 w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs lg:text-sm font-black text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/5 shadow-inner">
          {user.avatar ? (
            <span className="text-base lg:text-xl">{user.avatar}</span>
          ) : (
            user.name.charAt(0).toUpperCase()
          )}
        </div>
        <span className="text-[8px] md:text-[10px] font-black text-zinc-600 dark:text-zinc-500 truncate w-full text-center uppercase tracking-[0.2em]">
          {user.name} {user.id === currentUserId && "(YOU)"}
        </span>
      </div>
    </div>
  );
}
