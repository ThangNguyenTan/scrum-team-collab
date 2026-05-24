"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Headphones, 
  Volume2, 
  VolumeX, 
  Coffee, 
  CloudRain, 
  Waves, 
  Brain,
  Play,
  Pause,
  Music4
} from "lucide-react";
import { cn } from "@/lib/utils";

type Station = "off" | "lofi" | "rain" | "waves" | "binaural";

interface StationOption {
  id: Station;
  name: string;
  desc: string;
  icon: React.ElementType;
  emoji: string;
  color: string;
}

const STATIONS: StationOption[] = [
  { 
    id: "lofi", 
    name: "Lofi Cafe", 
    desc: "Chill jazz-hop beats", 
    icon: Coffee, 
    emoji: "☕", 
    color: "from-amber-500/20 to-orange-500/20 text-amber-500 dark:text-amber-400 border-amber-500/30" 
  },
  { 
    id: "rain", 
    name: "Cozy Rain", 
    desc: "Synthesized rain noise", 
    icon: CloudRain, 
    emoji: "🌧️", 
    color: "from-sky-500/20 to-blue-500/20 text-sky-500 dark:text-sky-400 border-sky-500/30" 
  },
  { 
    id: "waves", 
    name: "Deep Ocean", 
    desc: "Modulated wave sweeps", 
    icon: Waves, 
    emoji: "🌊", 
    color: "from-blue-500/20 to-indigo-500/20 text-blue-500 dark:text-indigo-400 border-blue-500/30" 
  },
  { 
    id: "binaural", 
    name: "Focus Drone", 
    desc: "7.5Hz Binaural Alpha beats", 
    icon: Brain, 
    emoji: "🧘", 
    color: "from-purple-500/20 to-pink-500/20 text-purple-500 dark:text-purple-400 border-purple-500/30" 
  },
];

export function FocusMusicPlayer() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeStation, setActiveStation] = useState<Station>("off");
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(30); // default 30%
  const [isMuted, setIsMuted] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Web Audio Context & Node refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mainGainRef = useRef<GainNode | null>(null);
  
  // Synthesizer Node refs
  const binauralNodesRef = useRef<{ oscL: OscillatorNode; oscR: OscillatorNode } | null>(null);
  const noiseSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const lfoOscRef = useRef<OscillatorNode | null>(null);
  const lfoGainRef = useRef<GainNode | null>(null);
  
  // HTML5 Audio stream refs
  const lofiAudioRef = useRef<HTMLAudioElement | null>(null);

  const activeStationRef = useRef<Station>("off");
  const isPlayingRef = useRef<boolean>(false);
  const dropletIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Shared audio buffers to prevent re-generation
  const whiteNoiseBufferRef = useRef<AudioBuffer | null>(null);
  const pinkNoiseBufferRef = useRef<AudioBuffer | null>(null);
  const brownNoiseBufferRef = useRef<AudioBuffer | null>(null);

  // Sync state variables to refs
  useEffect(() => {
    activeStationRef.current = activeStation;
  }, [activeStation]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Handle click outside to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Clean up all audio nodes on component unmount
  useEffect(() => {
    return () => {
      stopAllAudio();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // Update volume gain in real-time
  useEffect(() => {
    const targetVol = isMuted ? 0 : volume / 100;
    
    // Update main Web Audio gain
    if (mainGainRef.current) {
      mainGainRef.current.gain.setValueAtTime(targetVol, mainGainRef.current.context.currentTime);
    }
    
    // Update lofi element volume directly
    if (lofiAudioRef.current) {
      lofiAudioRef.current.volume = targetVol;
    }
  }, [volume, isMuted]);

  // Initialize Audio Context lazily upon user interaction
  const initAudioCtx = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;
        
        const gainNode = ctx.createGain();
        gainNode.gain.value = isMuted ? 0 : volume / 100;
        gainNode.connect(ctx.destination);
        mainGainRef.current = gainNode;
      }
    }
    
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
  };

  const stopAllAudio = () => {
    // Stop HTML5 Audio
    if (lofiAudioRef.current) {
      lofiAudioRef.current.pause();
    }

    // Stop Rain Droplet Scheduler
    if (dropletIntervalRef.current) {
      clearTimeout(dropletIntervalRef.current);
      dropletIntervalRef.current = null;
    }

    // Stop Binaural Oscillators
    if (binauralNodesRef.current) {
      try { binauralNodesRef.current.oscL.stop(); } catch(e){}
      try { binauralNodesRef.current.oscR.stop(); } catch(e){}
      binauralNodesRef.current = null;
    }

    // Stop Noise Generators
    if (noiseSourcesRef.current.length > 0) {
      noiseSourcesRef.current.forEach(source => {
        try { source.stop(); } catch(e){}
      });
      noiseSourcesRef.current = [];
    }

    // Stop LFOs
    if (lfoOscRef.current) {
      try { lfoOscRef.current.stop(); } catch(e){}
      lfoOscRef.current = null;
    }
    lfoGainRef.current = null;
    filterNodeRef.current = null;
  };

  // Lazy generators for shared audio buffers
  const getWhiteNoiseBuffer = (ctx: AudioContext) => {
    if (!whiteNoiseBufferRef.current) {
      const bufferSize = 2 * ctx.sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      whiteNoiseBufferRef.current = buffer;
    }
    return whiteNoiseBufferRef.current;
  };

  const getPinkNoiseBuffer = (ctx: AudioContext) => {
    if (!pinkNoiseBufferRef.current) {
      const bufferSize = 4 * ctx.sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        b6 = white * 0.115926;
        data[i] = pink * 0.11;
      }
      pinkNoiseBufferRef.current = buffer;
    }
    return pinkNoiseBufferRef.current;
  };

  const getBrownNoiseBuffer = (ctx: AudioContext) => {
    if (!brownNoiseBufferRef.current) {
      const bufferSize = 4 * ctx.sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }
      brownNoiseBufferRef.current = buffer;
    }
    return brownNoiseBufferRef.current;
  };

  const startBinaural = (ctx: AudioContext, dest: AudioNode) => {
    const oscL = ctx.createOscillator();
    const oscR = ctx.createOscillator();
    
    oscL.type = "sine";
    oscL.frequency.value = 100; // 100Hz in Left ear
 
    oscR.type = "sine";
    oscR.frequency.value = 107.5; // 107.5Hz in Right ear (Creating 7.5Hz Alpha Hum)

    const panL = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const panR = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

    if (panL && panR) {
      panL.pan.value = -1;
      panR.pan.value = 1;
      oscL.connect(panL).connect(dest);
      oscR.connect(panR).connect(dest);
    } else {
      oscL.connect(dest);
      oscR.connect(dest);
    }

    oscL.start();
    oscR.start();

    binauralNodesRef.current = { oscL, oscR };
  };

  const playRainDroplet = (ctx: AudioContext, dest: AudioNode) => {
    const now = ctx.currentTime;
    
    // In a steady gentle night rain, individual droplets are very soft and muffled
    const isPuddlePlop = Math.random() < 0.1; // 10% chance
    
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const panValue = Math.random() * 1.6 - 0.8;
    if (panner) {
      panner.pan.setValueAtTime(panValue, now);
      panner.connect(dest);
    }
    
    const dropDest = panner || dest;

    if (isPuddlePlop) {
      // Soft, warm, low puddle plop (liquid accent)
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      
      const startFreq = 600 + Math.random() * 400;  // 600 - 1000 Hz
      const endFreq = 150 + Math.random() * 80;    // 150 - 230 Hz
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.05);
      
      oscGain.gain.setValueAtTime(0, now);
      oscGain.gain.linearRampToValueAtTime(0.0015 + Math.random() * 0.003, now + 0.004); // Extremely soft
      const decay = 0.04 + Math.random() * 0.04;
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
      
      osc.connect(oscGain).connect(dropDest);
      osc.start(now);
      osc.stop(now + decay + 0.05);
    } else {
      // Muffled, soft noise impact (rain hitting foliage/dirt)
      const whiteBuffer = getWhiteNoiseBuffer(ctx);
      if (!whiteBuffer) return;

      const source = ctx.createBufferSource();
      source.buffer = whiteBuffer;
      source.loopStart = Math.random() * 1.8;
      
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      
      const hitType = Math.random();
      if (hitType < 0.5) {
        // Distant foliage hit (warm bandpass, Q=0.8)
        filter.frequency.setValueAtTime(2000 + Math.random() * 1500, now); // 2kHz - 3.5kHz
        filter.Q.setValueAtTime(0.8, now);
      } else {
        // Soft ground/soil hit (very warm, Q=0.5)
        filter.frequency.setValueAtTime(800 + Math.random() * 800, now); // 800Hz - 1.6kHz
        filter.Q.setValueAtTime(0.5, now);
      }
      
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.002 + Math.random() * 0.004, now + 0.003); // Very soft, non-piercing
      
      const decay = 0.015 + Math.random() * 0.025; // 15ms to 40ms soft decay
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decay);
      
      source.connect(filter).connect(gainNode).connect(dropDest);
      source.start(now);
      source.stop(now + decay + 0.05);
    }
  };

  const startRain = (ctx: AudioContext, dest: AudioNode) => {
    // 1. Cozy Background rumble (Brown Noise)
    const brownBuffer = getBrownNoiseBuffer(ctx);
    const brownSource = ctx.createBufferSource();
    brownSource.buffer = brownBuffer;
    brownSource.loop = true;

    const brownFilter = ctx.createBiquadFilter();
    brownFilter.type = "lowpass";
    brownFilter.frequency.setValueAtTime(180, ctx.currentTime); // Deep warm base

    const brownGain = ctx.createGain();
    brownGain.gain.setValueAtTime(0.75, ctx.currentTime);

    brownSource.connect(brownFilter).connect(brownGain).connect(dest);
    brownSource.start();

    // 2. Main warm rain wash body (Pink Noise)
    const pinkBuffer = getPinkNoiseBuffer(ctx);
    const pinkSource1 = ctx.createBufferSource();
    pinkSource1.buffer = pinkBuffer;
    pinkSource1.loop = true;

    const pinkFilter1 = ctx.createBiquadFilter();
    pinkFilter1.type = "bandpass";
    pinkFilter1.frequency.setValueAtTime(1000, ctx.currentTime);
    pinkFilter1.Q.setValueAtTime(0.3, ctx.currentTime); // Wide band pass

    const pinkLowpass1 = ctx.createBiquadFilter();
    pinkLowpass1.type = "lowpass";
    pinkLowpass1.frequency.setValueAtTime(1800, ctx.currentTime); // Roll off harsh high frequencies

    const pinkGain1 = ctx.createGain();
    pinkGain1.gain.setValueAtTime(0.45, ctx.currentTime);

    pinkSource1.connect(pinkFilter1).connect(pinkLowpass1).connect(pinkGain1).connect(dest);
    pinkSource1.start();

    // 3. Gentle distant canopy canopy shimmer (Pink Noise)
    const pinkSource2 = ctx.createBufferSource();
    pinkSource2.buffer = pinkBuffer;
    pinkSource2.loop = true;

    const pinkFilter2 = ctx.createBiquadFilter();
    pinkFilter2.type = "bandpass";
    pinkFilter2.frequency.setValueAtTime(3200, ctx.currentTime);
    pinkFilter2.Q.setValueAtTime(0.5, ctx.currentTime);

    const pinkGain2 = ctx.createGain();
    pinkGain2.gain.setValueAtTime(0.04, ctx.currentTime); // Very soft background canopy wash

    pinkSource2.connect(pinkFilter2).connect(pinkGain2).connect(dest);
    pinkSource2.start();

    // 4. Slow LFO to modulate rain body and canopy shimmer (natural night wind gusts)
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(0.03, ctx.currentTime); // 33-second cycle

    const lfoGainMod1 = ctx.createGain();
    lfoGainMod1.gain.setValueAtTime(0.08, ctx.currentTime); // Swells main wash

    const lfoGainMod2 = ctx.createGain();
    lfoGainMod2.gain.setValueAtTime(0.02, ctx.currentTime); // Swells canopy shimmer

    lfo.connect(lfoGainMod1).connect(pinkGain1.gain);
    lfo.connect(lfoGainMod2).connect(pinkGain2.gain);
    lfo.start();

    noiseSourcesRef.current = [brownSource, pinkSource1, pinkSource2];
    lfoOscRef.current = lfo;

    // 5. Recursive organic droplet scheduler
    const scheduleNext = () => {
      if (
        audioCtxRef.current &&
        activeStationRef.current === "rain" &&
        isPlayingRef.current &&
        mainGainRef.current
      ) {
        // Distant gentle rain has a steady but subtle, non-intrusive pitter-patter
        // Play 1-3 droplets per burst
        const count = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
          const delay = Math.random() * 300;
          setTimeout(() => {
            if (
              audioCtxRef.current &&
              activeStationRef.current === "rain" &&
              isPlayingRef.current &&
              mainGainRef.current
            ) {
              playRainDroplet(audioCtxRef.current, mainGainRef.current);
            }
          }, delay);
        }

        // Delay between bursts: 250ms to 850ms
        const nextDelay = 250 + Math.random() * 600;
        dropletIntervalRef.current = setTimeout(scheduleNext, nextDelay);
      }
    };

    // Begin scheduling
    scheduleNext();
  };

  const startWaves = (ctx: AudioContext, dest: AudioNode) => {
    const source = ctx.createBufferSource();
    source.buffer = getBrownNoiseBuffer(ctx);
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 300;

    const waveGain = ctx.createGain();
    waveGain.gain.value = 0.55;

    source.connect(filter).connect(waveGain).connect(dest);

    // LFO to sweep filter cutoff frequency (waves crashing)
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.08; // extremely slow wave cycle (12.5 seconds)

    const lfoFilterGain = ctx.createGain();
    lfoFilterGain.gain.value = 220; // Modulate cutoff by +/- 220Hz

    const lfoGainMod = ctx.createGain();
    lfoGainMod.gain.value = 0.4; // Modulate volume dynamically for swells

    lfo.connect(lfoFilterGain).connect(filter.frequency);
    lfo.connect(lfoGainMod).connect(waveGain.gain);

    source.start();
    lfo.start();

    noiseSourcesRef.current = [source];
    filterNodeRef.current = filter;
    lfoOscRef.current = lfo;
    lfoGainRef.current = lfoFilterGain;
  };

  const startLofi = () => {
    if (!lofiAudioRef.current) {
      lofiAudioRef.current = new Audio("https://stream.zeno.fm/0r0xa792kwzuv");
      lofiAudioRef.current.loop = true;
    }
    lofiAudioRef.current.volume = isMuted ? 0 : volume / 100;
    lofiAudioRef.current.play().catch(e => {
      console.warn("Lofi play interrupted or blocked by browser autoplay settings:", e);
    });
  };

  const handleStationChange = (station: Station) => {
    initAudioCtx();
    stopAllAudio();

    if (station === "off") {
      setActiveStation("off");
      setIsPlaying(false);
      return;
    }

    setActiveStation(station);
    setIsPlaying(true);

    const ctx = audioCtxRef.current;
    const dest = mainGainRef.current;

    if (!ctx || !dest) return;

    if (station === "binaural") {
      startBinaural(ctx, dest);
    } else if (station === "rain") {
      startRain(ctx, dest);
    } else if (station === "waves") {
      startWaves(ctx, dest);
    } else if (station === "lofi") {
      startLofi();
    }
  };

  const handlePlayPause = () => {
    if (activeStation === "off") {
      // Default to first station if user clicks play when Off
      handleStationChange("lofi");
      return;
    }

    if (isPlaying) {
      // Pause
      stopAllAudio();
      setIsPlaying(false);
    } else {
      // Resume
      handleStationChange(activeStation);
    }
  };

  return (
    <div ref={containerRef} className="relative z-[99]">
      <style>{`
        @keyframes bounceVisualizerBar {
          0%, 100% { height: 4px; }
          50% { height: 18px; }
        }
        .bounce-bar {
          animation: bounceVisualizerBar 1.2s ease-in-out infinite;
        }
        .bounce-bar-1 { animation-delay: 0.1s; }
        .bounce-bar-2 { animation-delay: 0.3s; }
        .bounce-bar-3 { animation-delay: 0.5s; }
        .bounce-bar-4 { animation-delay: 0.2s; }
      `}</style>

      {/* Header Activation Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs sm:text-base font-semibold transition-all active:scale-95 cursor-pointer relative overflow-hidden",
          isPlaying
            ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-600 dark:text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
            : "bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/10 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-900 dark:text-white"
        )}
      >
        {isPlaying ? (
          <div className="flex items-end gap-0.5 h-4 w-4 shrink-0 pb-[1px]">
            <div className="w-[2.5px] bg-indigo-500 dark:bg-indigo-400 rounded-full bounce-bar bounce-bar-1" />
            <div className="w-[2.5px] bg-indigo-500 dark:bg-indigo-400 rounded-full bounce-bar bounce-bar-2" />
            <div className="w-[2.5px] bg-indigo-500 dark:bg-indigo-400 rounded-full bounce-bar bounce-bar-3" />
            <div className="w-[2.5px] bg-indigo-500 dark:bg-indigo-400 rounded-full bounce-bar bounce-bar-4" />
          </div>
        ) : (
          <Headphones className="h-3 w-3 sm:h-4 sm:w-4" />
        )}
        <span className="hidden sm:inline">Focus Music</span>
      </button>

      {/* Floating Control Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-white/5 rounded-2xl shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-4 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
          
          <div className="flex items-center justify-between border-b border-zinc-200/50 dark:border-white/[0.03] pb-3">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
              <Headphones className="h-4 w-4 text-indigo-500" />
              <span className="text-xs font-black uppercase tracking-[0.2em]">Focus Station</span>
            </div>
            
            {isPlaying && (
              <div className="flex items-center gap-1">
                <Music4 className="h-3 w-3 text-indigo-400 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-500 animate-pulse">Playing</span>
              </div>
            )}
          </div>

          {/* Grid Selection of soundscapes */}
          <div className="grid grid-cols-2 gap-2">
            {STATIONS.map((station) => {
              const Icon = station.icon;
              const isActive = activeStation === station.id;
              
              return (
                <button
                  key={station.id}
                  onClick={() => handleStationChange(station.id)}
                  className={cn(
                    "flex flex-col items-start text-left p-3 rounded-xl border transition-all cursor-pointer group hover:scale-[1.01] active:scale-[0.98]",
                    isActive 
                      ? `bg-gradient-to-br ${station.color} border-indigo-500/50 shadow-md` 
                      : "bg-zinc-50 border-zinc-200/50 hover:bg-zinc-100 hover:border-zinc-300 dark:bg-white/[0.01] dark:border-white/[0.02] dark:hover:bg-white/5 dark:hover:border-white/10 text-zinc-500 dark:text-zinc-400"
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className={cn(
                      "p-1.5 rounded-lg border transition-transform group-hover:scale-105 shrink-0",
                      isActive ? "bg-white/40 dark:bg-black/30 border-transparent" : "bg-white border-zinc-200 dark:bg-white/5 dark:border-white/5"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm">{station.emoji}</span>
                  </div>
                  <span className={cn(
                    "text-[11px] font-black tracking-tight",
                    isActive ? "text-zinc-900 dark:text-white" : "text-zinc-800 dark:text-zinc-300"
                  )}>
                    {station.name}
                  </span>
                  <span className="text-[9px] text-zinc-400 dark:text-zinc-600 mt-0.5 leading-none">
                    {station.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Audio controls */}
          <div className="flex flex-col gap-3 bg-zinc-50/50 dark:bg-black/20 border border-zinc-200/50 dark:border-white/[0.02] p-3 rounded-xl">
            
            {/* Play/Pause & Station Details */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePlayPause}
                className={cn(
                  "h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer",
                  isPlaying && "bg-indigo-500 dark:bg-indigo-500 text-white shadow-indigo-500/20"
                )}
              >
                {isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
              </button>
              
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 leading-none">
                  Currently Active
                </span>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate mt-1">
                  {activeStation === "off" 
                    ? "Sound playback disabled" 
                    : STATIONS.find(s => s.id === activeStation)?.name}
                </span>
              </div>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-2 border-t border-zinc-200/50 dark:border-white/[0.03] pt-3 mt-1.5">
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="text-zinc-500 hover:text-zinc-950 dark:hover:text-white p-1 hover:bg-zinc-200/50 dark:hover:bg-white/5 rounded transition-colors cursor-pointer"
              >
                {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => {
                  setVolume(Number(e.target.value));
                  if (isMuted) setIsMuted(false);
                }}
                className="flex-1 h-1 bg-zinc-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500 dark:accent-indigo-400 focus:outline-none"
              />
              
              <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-600 font-mono w-6 text-right tabular-nums">
                {isMuted ? "0" : volume}%
              </span>
            </div>

          </div>

          {/* Off Trigger Button */}
          {activeStation !== "off" && (
            <button
              onClick={() => handleStationChange("off")}
              className="w-full h-9 rounded-xl border border-zinc-200/50 hover:bg-zinc-50 dark:border-white/5 dark:hover:bg-white/5 text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition-all active:scale-[0.99] cursor-pointer"
            >
              Mute Soundscape
            </button>
          )}

        </div>
      )}
    </div>
  );
}
