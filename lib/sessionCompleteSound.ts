/**
 * Short celebratory chime for session complete. Synthesized so we don't
 * ship an audio file; skipped when the tab is hidden.
 */
export function playSessionCompleteSound(): void {
  if (typeof window === "undefined") return;
  if (typeof document !== "undefined" && document.hidden) return;

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return;

  const ctx = new AudioCtx();
  const now = ctx.currentTime;
  const master = ctx.createGain();
  // Louder celebratory chime — was 0.18 and easy to miss over call audio / OS volume.
  master.gain.setValueAtTime(0.55, now);
  master.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
  master.connect(ctx.destination);

  const notes: Array<{ freq: number; at: number; dur: number; type: OscillatorType }> = [
    { freq: 523.25, at: 0, dur: 0.22, type: "triangle" }, // C5
    { freq: 659.25, at: 0.11, dur: 0.22, type: "triangle" }, // E5
    { freq: 783.99, at: 0.22, dur: 0.28, type: "triangle" }, // G5
    { freq: 1046.5, at: 0.36, dur: 0.55, type: "sine" }, // C6
    { freq: 1318.51, at: 0.48, dur: 0.45, type: "sine" }, // E6 sparkle
  ];

  for (const note of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = note.type;
    osc.frequency.setValueAtTime(note.freq, now + note.at);
    gain.gain.setValueAtTime(0.0001, now + note.at);
    gain.gain.exponentialRampToValueAtTime(1, now + note.at + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.at + note.dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now + note.at);
    osc.stop(now + note.at + note.dur + 0.02);
  }

  window.setTimeout(() => {
    void ctx.close().catch(() => undefined);
  }, 1800);
}
