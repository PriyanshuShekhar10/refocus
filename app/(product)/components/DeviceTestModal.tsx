"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, X } from "lucide-react";
import {
  registerLocalMediaStream,
  releaseAllLocalMediaStreams,
  unregisterLocalMediaStream,
} from "@/lib/localMedia";

type Props = {
  open: boolean;
  onClose: () => void;
};

function mediaErrorMessage(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") {
      return "Camera or microphone access was blocked. Allow permissions in your browser settings and try again.";
    }
    if (err.name === "NotFoundError") {
      return "No camera or microphone was found on this device.";
    }
    if (err.name === "NotReadableError" || err.name === "AbortError") {
      return "Your camera or microphone is in use by another app or tab. Close Zoom, Teams, or other video apps, then try again.";
    }
  }
  return "Could not access your camera or microphone.";
}

export default function DeviceTestModal({ open, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<{ ctx: AudioContext; raf: number } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [micLevel, setMicLevel] = useState(0);

  const stopStream = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      unregisterLocalMediaStream(stream);
      stream.getTracks().forEach((track) => track.stop());
    }
    streamRef.current = null;
    if (audioRef.current) {
      cancelAnimationFrame(audioRef.current.raf);
      void audioRef.current.ctx.close().catch(() => {});
      audioRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setMicLevel(0);
  }, []);

  const startStream = useCallback(async () => {
    setLoading(true);
    setError(null);
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      registerLocalMediaStream(stream);

      const videoEl = videoRef.current;
      if (videoEl) {
        videoEl.srcObject = stream;
        await videoEl.play().catch(() => {});
      }

      setMicOn(true);
      setCamOn(true);

      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const bins = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(bins);
        let sum = 0;
        for (let i = 0; i < bins.length; i++) sum += bins[i];
        const avg = sum / bins.length;
        setMicLevel(Math.min(100, Math.round(avg / 1.28)));
        if (audioRef.current) {
          audioRef.current.raf = requestAnimationFrame(tick);
        }
      };

      audioRef.current = { ctx, raf: requestAnimationFrame(tick) };
    } catch (err) {
      setError(mediaErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [stopStream]);

  useEffect(() => {
    if (!open) {
      stopStream();
      setError(null);
      return;
    }
    void startStream();
    return () => {
      stopStream();
    };
  }, [open, startStream, stopStream]);

  const setTrackEnabled = (kind: "audio" | "video", enabled: boolean) => {
    streamRef.current
      ?.getTracks()
      .filter((track) => track.kind === kind)
      .forEach((track) => {
        track.enabled = enabled;
      });
  };

  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    setTrackEnabled("audio", next);
  };

  const toggleCam = () => {
    const next = !camOn;
    setCamOn(next);
    setTrackEnabled("video", next);
  };

  const handleClose = () => {
    stopStream();
    releaseAllLocalMediaStreams();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="device-test-title"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div>
            <h2
              id="device-test-title"
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              Test audio and video
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Check your camera and mic before joining a session.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-950">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover ${
                camOn ? "" : "opacity-0"
              }`}
              style={{ transform: "scaleX(-1)" }}
            />
            {!camOn ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
                Camera off
              </div>
            ) : null}
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-sm text-white">
                Starting devices…
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          ) : (
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Microphone level</span>
                <span>{micOn ? "Listening" : "Muted"}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-[#5D1C6A] transition-[width] duration-75 dark:bg-[#CA5995]"
                  style={{ width: `${micOn ? micLevel : 0}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleMic}
              disabled={!!error && !streamRef.current}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                micOn
                  ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300"
              }`}
            >
              {micOn ? (
                <Mic className="h-4 w-4" aria-hidden />
              ) : (
                <MicOff className="h-4 w-4" aria-hidden />
              )}
              {micOn ? "Mic on" : "Mic off"}
            </button>
            <button
              type="button"
              onClick={toggleCam}
              disabled={!!error && !streamRef.current}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                camOn
                  ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300"
              }`}
            >
              {camOn ? (
                <Video className="h-4 w-4" aria-hidden />
              ) : (
                <VideoOff className="h-4 w-4" aria-hidden />
              )}
              {camOn ? "Camera on" : "Camera off"}
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-800">
          {error ? (
            <button
              type="button"
              onClick={() => void startStream()}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Try again
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg bg-[#5D1C6A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#CA5995] dark:bg-[#7A2D88] dark:hover:bg-[#CA5995]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
