import { Zap, LayoutPanelLeft, Users, CheckCircle2 } from "lucide-react";

export const EMOJIS = [
  "🚀", "🔥", "🐱", "🐶", "🦊", "🐼", "🦁", "🦖", "🛸", "🧠", 
  "💎", "🌈", "☀️", "🌙", "⭐", "🦾", "🎨", "🎭", "🎮", "🎸"
];

export const PLANNING_CARDS = ["0", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89", "?", "☕"];

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
