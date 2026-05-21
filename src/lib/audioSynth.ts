"use client";

let audioCtx: AudioContext | null = null;
let isSoundMuted = false;

/**
 * Initializes and returns a lazy-loaded, shared Web Audio API context.
 */
export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

/**
 * Mutes or unmutes the audio context playbacks globally on the client side.
 */
export function setMuteState(muted: boolean) {
  isSoundMuted = muted;
  localStorage.setItem("scrum_sounds_muted", muted ? "true" : "false");
  
  if (muted && audioCtx && audioCtx.state === "running") {
    audioCtx.suspend();
  } else if (!muted && audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

/**
 * Gets the current mute state (initializes from localStorage if possible).
 */
export function getMuteState(): boolean {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("scrum_sounds_muted");
    if (saved !== null) {
      isSoundMuted = saved === "true";
    }
  }
  return isSoundMuted;
}

/**
 * Helper to play a single tone using a standard gain envelope.
 */
function createOscillator(
  ctx: AudioContext,
  type: OscillatorType,
  freq: number,
  startTime: number,
  duration: number,
  volume = 0.12
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

/**
 * Tada sound: A rising arpeggio (C4 -> E4 -> G4 -> C5) with double voice oscillator.
 */
export function playTada() {
  if (getMuteState()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();

  const now = ctx.currentTime;
  const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
  const step = 0.09;

  notes.forEach((freq, idx) => {
    const startTime = now + idx * step;
    const dur = idx === notes.length - 1 ? 0.7 : 0.25;
    
    // Warm base triangle oscillator
    createOscillator(ctx, "triangle", freq, startTime, dur, 0.15);
    // Sine wave octave-up harmonic for clarity
    createOscillator(ctx, "sine", freq * 2, startTime, dur, 0.06);
  });
}

/**
 * Success sound: Double high-pitched crystal chimes.
 */
export function playSuccess() {
  if (getMuteState()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();

  const now = ctx.currentTime;
  const notes = [659.25, 783.99, 1046.5]; // E5, G5, C6
  
  notes.forEach((freq, idx) => {
    const startTime = now + idx * 0.05;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, startTime);
    
    // Crisp high-pass filter
    filter.type = "highpass";
    filter.frequency.setValueAtTime(600, startTime);
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.1, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(startTime);
    osc.stop(startTime + 0.35);
  });
}

/**
 * Fail sound: A sliding low-pitch game show buzzer.
 */
export function playFail() {
  if (getMuteState()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(140, now);
  // Pitch slide downward
  osc.frequency.linearRampToValueAtTime(65, now + 0.5);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(320, now);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.38);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.55);
}

/**
 * Ping sound: A clean, popping bubble notification sound.
 */
export function playPing() {
  if (getMuteState()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(580, now);
  // Fast frequency slide up
  osc.frequency.exponentialRampToValueAtTime(820, now + 0.07);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.22);
}
