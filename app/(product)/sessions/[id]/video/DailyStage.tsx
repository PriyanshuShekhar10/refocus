"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { DailyCall } from "@daily-co/daily-js";
import { prepareForDailyCall } from "@/lib/localMedia";
import type { VideoDeviceError, VideoStageHandle, VideoStageProps } from "./types";

const ACCENT = "5D1C6A"; // shared plum accent

/** Daily Prebuilt embedded via daily-js so we can listen for device and leave events. */
export const DailyStage = forwardRef<VideoStageHandle, VideoStageProps>(function DailyStage(
  { join, startMuted, isDark, onLeft, onDeviceError, onCameraStarted },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callFrameRef = useRef<DailyCall | null>(null);
  // Keep the latest callbacks without re-joining the call when they change.
  const handlers = useRef({ onLeft, onDeviceError, onCameraStarted });
  handlers.current = { onLeft, onDeviceError, onCameraStarted };

  useImperativeHandle(
    ref,
    () => ({
      setMicEnabled(enabled) {
        callFrameRef.current?.setLocalAudio(enabled);
      },
      leave() {
        void callFrameRef.current?.leave();
      },
      async retryCamera() {
        await prepareForDailyCall();
        void callFrameRef.current?.startCamera();
      },
    }),
    [],
  );

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    let callFrame: DailyCall | null = null;

    const query = new URLSearchParams({
      t: join.token,
      theme: isDark ? "dark" : "light",
      accent: ACCENT,
    });
    if (startMuted) query.set("startAudioOff", "true");
    const url = `https://${join.domain}/${join.roomName}?${query.toString()}`;

    const setup = async () => {
      const Daily = (await import("@daily-co/daily-js")).default;
      if (cancelled || !containerRef.current) return;

      // Device test holds the camera/mic on the Refocus origin; Daily needs
      // the physical devices inside its iframe.
      await prepareForDailyCall();

      const container = containerRef.current;
      container.replaceChildren();

      const iframe = document.createElement("iframe");
      iframe.title = "Refocus session";
      iframe.setAttribute(
        "allow",
        "camera; microphone; autoplay; display-capture; fullscreen; clipboard-read; clipboard-write",
      );
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "0";
      container.appendChild(iframe);

      callFrame = Daily.wrap(iframe, {
        showLeaveButton: false,
      });
      callFrameRef.current = callFrame;

      callFrame
        .on("camera-error", (event) => {
          if (event.error) {
            const err = event.error as VideoDeviceError;
            console.info("[Daily] camera-error", err.type, err.msg ?? "");
            handlers.current.onDeviceError(err);
          }
        })
        .on("started-camera", () => {
          handlers.current.onCameraStarted();
        })
        .on("left-meeting", () => {
          handlers.current.onLeft();
        });

      try {
        await callFrame.join({ url });
      } catch {
        // Daily surfaces device errors via camera-error; join failures are rare here.
      }
    };

    void setup();

    return () => {
      cancelled = true;
      if (callFrame) {
        void callFrame.destroy();
      }
      callFrameRef.current = null;
    };
  }, [join, isDark, startMuted]);

  return <div ref={containerRef} className="min-w-0 flex-1" aria-label="Video call" />;
});
