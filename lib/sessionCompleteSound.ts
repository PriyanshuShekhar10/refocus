/**
 * Short celebratory chime for session complete. Synthesized so we don't
 * ship an audio file.
 *
 * Browsers suspend AudioContext until a user gesture. Session end is usually
 * a timer (no gesture), so we unlock on call start and resume before playing.
 */

type AudioContextConstructor = typeof AudioContext;

let sharedCtx: AudioContext | null = null;

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: AudioContextConstructor })
      .webkitAudioContext ||
    null
  );
}

function getOrCreateContext(): AudioContext | null {
  const AudioCtx = getAudioContextConstructor();
  if (!AudioCtx) return null;
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new AudioCtx();
  }
  return sharedCtx;
}

/**
 * Call from a user gesture (e.g. Start call) so the chime can play later
 * when the session timer hits zero.
 */
export function unlockSessionCompleteSound(): void {
  const ctx = getOrCreateContext();
  if (!ctx) return;

  const resume = () => {
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => undefined);
    }
  };
  resume();

  // iOS / strict autoplay: a tiny silent buffer during the gesture unlocks output.
  try {
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start(0);
  } catch {
    // ignore
  }
}

function scheduleChime(ctx: AudioContext): void {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.85, now);
  master.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
  master.connect(ctx.destination);

  const notes: Array<{
    freq: number;
    at: number;
    dur: number;
    type: OscillatorType;
  }> = [
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
}

export function playSessionCompleteSound(): void {
  if (typeof window === "undefined") return;

  const ctx = getOrCreateContext();
  if (!ctx) return;

  const play = () => {
    try {
      scheduleChime(ctx);
    } catch {
      // ignore — never break the leave/complete flow for audio
    }
  };

  if (ctx.state === "suspended") {
    void ctx
      .resume()
      .then(play)
      .catch(() => undefined);
    return;
  }
  play();
}
