import { getSharedAudioContext } from "./sessionCompleteSound";

/** Short two-note "pop" for an incoming chat message while the panel is closed. */
function scheduleBlip(ctx: AudioContext): void {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.6, now);
  master.connect(ctx.destination);

  const notes: Array<{ freq: number; at: number; dur: number }> = [
    { freq: 880, at: 0, dur: 0.09 },
    { freq: 1174.66, at: 0.07, dur: 0.12 },
  ];

  for (const note of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(note.freq, now + note.at);
    gain.gain.setValueAtTime(0.0001, now + note.at);
    gain.gain.exponentialRampToValueAtTime(1, now + note.at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.at + note.dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now + note.at);
    osc.stop(now + note.at + note.dur + 0.02);
  }
}

/** Call-screen audio is unlocked once by unlockSessionCompleteSound() on join; this reuses that context. */
export function playChatMessageSound(): void {
  if (typeof window === "undefined") return;
  const ctx = getSharedAudioContext();
  if (!ctx) return;

  const play = () => {
    try {
      scheduleBlip(ctx);
    } catch {
      // ignore — never break the chat flow for audio
    }
  };

  if (ctx.state === "suspended") {
    void ctx.resume().then(play).catch(() => undefined);
    return;
  }
  play();
}
