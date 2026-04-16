import { cn } from "@/lib/utils";
import { Feature } from "@/types";

interface FeatureCardProps {
  feature: Feature;
  index: number;
}

export function FeatureCard({ feature, index }: FeatureCardProps) {
  const Icon = feature.icon;
  
  return (
    <div 
      className={cn(
        "feature-card group glass-card p-10 transition-all hover:bg-white/[0.04] opacity-0 translate-y-8 h-full relative flex flex-col items-center text-center",
        feature.styles
      )}
    >
      <div className={cn(
        "mb-8 flex h-20 w-20 items-center justify-center rounded-[2rem] transition-transform group-hover:scale-110 duration-500 shadow-xl",
        feature.iconStyles
      )}>
        <Icon className="h-10 w-10" />
      </div>
      <div className="space-y-4">
        <h3 className="text-lg font-black uppercase tracking-tight flex items-center justify-center gap-3">
          <span className="text-[10px] font-mono text-zinc-700 opacity-50">0{index + 1}</span>
          {feature.title}
        </h3>
        <p className="text-zinc-500 text-[13px] leading-relaxed max-w-[240px] mx-auto font-medium">{feature.desc}</p>
      </div>
      
      {/* Decorative Engineering Lines */}
      <div className="absolute bottom-0 left-0 h-[1.5px] w-0 bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:w-full transition-all duration-700"></div>
    </div>
  );
}
