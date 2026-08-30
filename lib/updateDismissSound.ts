/**
 * Short synthesized crunch for dismissing sidebar updates (no audio file).
 * Triggered from a click, so autoplay policies are satisfied.
 */

type AudioContextConstructor = typeof AudioContext;

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: AudioContextConstructor })
      .webkitAudioContext ||
    null
  );
}

function scheduleCrunch(ctx: AudioContext): void {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.88, now);
  master.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
  master.connect(ctx.destination);

  const sampleCount = Math.floor(ctx.sampleRate * 0.14);
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i += 1) {
    const decay = 1 - i / sampleCount;
    samples[i] = (Math.random() * 2 - 1) * decay * decay;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.setValueAtTime(920, now);
  bandpass.frequency.exponentialRampToValueAtTime(420, now + 0.1);
  bandpass.Q.setValueAtTime(0.9, now);

  const crackleGain = ctx.createGain();
  crackleGain.gain.setValueAtTime(1, now);
  crackleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

  noise.connect(bandpass);
  bandpass.connect(crackleGain);
  crackleGain.connect(master);
  noise.start(now);
  noise.stop(now + 0.16);

  const thump = ctx.createOscillator();
  thump.type = "triangle";
  thump.frequency.setValueAtTime(210, now);
  thump.frequency.exponentialRampToValueAtTime(55, now + 0.09);

  const thumpGain = ctx.createGain();
  thumpGain.gain.setValueAtTime(0.72, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

  thump.connect(thumpGain);
  thumpGain.connect(master);
  thump.start(now);
  thump.stop(now + 0.12);
}

export function playUpdateDismissCrunch(): void {
  if (typeof window === "undefined") return;

  const AudioCtx = getAudioContextConstructor();
  if (!AudioCtx) return;

  const ctx = new AudioCtx();

  const play = () => {
    try {
      scheduleCrunch(ctx);
      window.setTimeout(() => {
        void ctx.close().catch(() => undefined);
      }, 400);
    } catch {
      void ctx.close().catch(() => undefined);
    }
  };

  if (ctx.state === "suspended") {
    void ctx.resume().then(play).catch(() => undefined);
    return;
  }
  play();
}
