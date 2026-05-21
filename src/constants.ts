import { Zap, LayoutPanelLeft, Users, CheckCircle2 } from "lucide-react";

export const EMOJIS = [
  "🚀", "🔥", "🐱", "🐶", "🦊", "🐼", "🦁", "🦖", "🛸", "🧠", 
  "💎", "🌈", "☀️", "🌙", "⭐", "🦾", "🎨", "🎭", "🎮", "🎸"
];

export const TEAM_GROUPS = ["FE", "BE", "QA", "BA", "PM"];

export const PLANNING_CARDS = ["1", "2", "3", "5", "8", "13", "21", "34", "55", "89", "?", "☕"];

export const ANIMAL_MAPPING: Record<string, { name: string, image: string }> = {
  "1": { name: "Ant", image: "https://images.unsplash.com/photo-1763810885185-56c7731b4ce5?auto=format&fit=crop&q=80&w=600" },
  "2": { name: "Mouse", image: "https://images.unsplash.com/photo-1613773215530-471bd830edb9?auto=format&fit=crop&q=80&w=600" },
  "3": { name: "Hedgehog", image: "https://images.unsplash.com/photo-1619101803727-699263d0fc60?auto=format&fit=crop&q=80&w=600" },
  "5": { name: "Cat", image: "https://images.unsplash.com/photo-1701642321998-eb0b3bf460e0?auto=format&fit=crop&q=80&w=600" },
  "8": { name: "Dog", image: "https://images.unsplash.com/photo-1671382847012-248f137d9cc5?auto=format&fit=crop&q=80&w=600" },
  "13": { name: "Lion", image: "https://images.unsplash.com/photo-1614027164847-1b28cfe1df60?auto=format&fit=crop&q=80&w=600" },
  "21": { name: "Bison", image: "https://images.unsplash.com/photo-1613744788621-05fdc92f9de2?auto=format&fit=crop&q=80&w=600" },
  "34": { name: "Elephant", image: "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&q=80&w=600" },
  "55": { name: "Whale", image: "https://images.unsplash.com/photo-1612443385320-5b5a3fbf6725?auto=format&fit=crop&q=80&w=600" },
  "89": { name: "T-Rex", image: "https://images.unsplash.com/photo-1583867195148-e869329c07b4?auto=format&fit=crop&q=80&w=600" },
};

export const FEATURES = [
  { 
    title: "Planning Poker", 
    desc: "Fibonacci-based voting with instant extraction.", 
    icon: Zap, 
    color: "indigo", 
    styles: "hover:border-indigo-500/30", 
    iconStyles: "bg-indigo-500/10 text-indigo-400" 
  },
  { 
    title: "Retrospectives", 
    desc: "Kanban orchestration with weighted voting.", 
    icon: LayoutPanelLeft, 
    color: "purple", 
    styles: "hover:border-purple-500/30", 
    iconStyles: "bg-purple-500/10 text-purple-400" 
  },
  { 
    title: "Dynamic Sync", 
    desc: "Identity-less collaboration. Zero setup friction.", 
    icon: Users, 
    color: "pink", 
    styles: "hover:border-pink-500/30", 
    iconStyles: "bg-pink-500/10 text-pink-400" 
  },
  { 
    title: "Deep Data", 
    desc: "Generate schema-compliant PDF or CSV archives.", 
    icon: CheckCircle2, 
    color: "emerald", 
    styles: "hover:border-emerald-500/30", 
    iconStyles: "bg-emerald-500/10 text-emerald-400" 
  }
];

export const TICKET_STATUS_ORDER: Record<string, number> = {
  planning: 0,
  todo: 1,
  open: 1,
  completed: 2,
};

export const FIBONACCI_SEQUENCE = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

export const GROUP_COLORS: Record<string, string> = {
  FE: "border-blue-500/40 bg-blue-500/5 text-blue-400",
  BE: "border-emerald-500/40 bg-emerald-500/5 text-emerald-400",
  QA: "border-rose-500/40 bg-rose-500/5 text-rose-400",
  BA: "border-amber-500/40 bg-amber-500/5 text-amber-400",
  PM: "border-purple-500/40 bg-purple-500/5 text-purple-400",
};

export const getGroupStyles = (group?: string) => {
  if (!group) {
    return "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-white/5 dark:bg-white/[0.02] dark:text-zinc-500";
  }
  const normalized = group.toUpperCase();
  return GROUP_COLORS[normalized] || "border-indigo-500/40 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400";
};

