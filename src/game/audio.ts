let ctx: AudioContext | null = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function setMuted(next: boolean) {
  muted = next;
}

export function unlockAudio() {
  if (typeof window === "undefined") return;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume();
}

export function tone(freq: number, dur = 0.08, type: OscillatorType = "square", gain = 0.04) {
  if (!ctx || muted || ctx.state !== "running") return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  o.connect(g);
  g.connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + dur);
}
