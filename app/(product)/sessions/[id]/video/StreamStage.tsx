"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { LayoutGrid, MonitorPlay } from "lucide-react";
import type { Call, StreamVideoClient } from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import "./stream-grid-fix.css";
import { prepareForDailyCall } from "@/lib/localMedia";
import { StreamChatPanel, StreamChatSheet } from "./StreamChatPanel";
import { useStreamChat } from "./useStreamChat";
import type { VideoDeviceError, VideoStageHandle, VideoStageProps } from "./types";

// Mirrors the server-side cap in lib/providers/video/stream/index.ts; this is
// a belt-and-suspenders client-side preference for the one remote participant.
const TARGET_RESOLUTION = { width: 640, height: 480 };

type StreamSdk = typeof import("@stream-io/video-react-sdk");

type DeviceFailure = { media: "video" | "audio"; name?: string; message?: string };

function toFailure(media: "video" | "audio", err: unknown): DeviceFailure {
  if (err instanceof DOMException) return { media, name: err.name, message: err.message };
  if (err instanceof Error) return { media, message: err.message };
  return { media };
}

function classify(name?: string): "permissions" | "in-use" | "not-found" | "other" {
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return "permissions";
    case "NotReadableError":
    case "TrackStartError":
      return "in-use";
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return "not-found";
    default:
      return "other";
  }
}

/** Maps getUserMedia failures onto the same shape DailyStage's camera-error event uses. */
function mapDeviceError(failures: DeviceFailure[]): VideoDeviceError {
  const blockedMedia = failures.map((f) => f.media);
  const classes = failures.map((f) => classify(f.name));

  if (classes.every((c) => c === "not-found")) return { type: "not-found", blockedMedia };
  if (classes.some((c) => c === "permissions")) {
    return { type: "permissions", blockedBy: "user", blockedMedia };
  }
  if (classes.some((c) => c === "in-use")) {
    const type =
      blockedMedia.includes("video") && blockedMedia.includes("audio")
        ? "cam-mic-in-use"
        : blockedMedia.includes("video")
          ? "cam-in-use"
          : "mic-in-use";
    return { type, blockedMedia };
  }
  return {
    type: "other",
    msg: failures.map((f) => f.message).filter(Boolean).join("; ") || undefined,
    blockedMedia,
  };
}

type VideoLayout = "grid" | "speaker";

/** Grid/Speaker layout switcher — the same choice Zoom/Meet/Daily expose, placed the same way (a small floating control in the corner of the video area). */
function LayoutSwitcher({
  layout,
  onChange,
}: {
  layout: VideoLayout;
  onChange: (layout: VideoLayout) => void;
}) {
  return (
    <div className="absolute right-3 top-3 z-10 flex gap-1 rounded-full bg-black/50 p-1 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => onChange("grid")}
        aria-pressed={layout === "grid"}
        aria-label="Grid view"
        title="Grid view"
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          layout === "grid" ? "bg-white/20 text-white" : "text-white/60 hover:text-white"
        }`}
      >
        <LayoutGrid className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onChange("speaker")}
        aria-pressed={layout === "speaker"}
        aria-label="Speaker view"
        title="Speaker view"
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          layout === "speaker" ? "bg-white/20 text-white" : "text-white/60 hover:text-white"
        }`}
      >
        <MonitorPlay className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Stream Video's own built-in components, unmodified — PaginatedGridLayout
 * and SpeakerLayout (switchable via LayoutSwitcher, the Grid/Speaker choice
 * most video-calling apps expose) + CallControls. stream-grid-fix.css
 * patches one real CSS bug in PaginatedGridLayout (see that file) so tiles
 * actually fill the available space instead of staying small. The only
 * additions beyond Stream's own components are the layout switcher and a
 * chat panel (desktop side panel / mobile bottom sheet, toggled from
 * ClientCall's header, since CallControls has no chat button of its own).
 */
export const StreamStage = forwardRef<VideoStageHandle, VideoStageProps>(function StreamStage(
  { join, userId, chatOpen, onCloseChat, onLeft, onDeviceError, onCameraStarted },
  ref,
) {
  const [sdk, setSdk] = useState<StreamSdk | null>(null);
  const [ready, setReady] = useState(false);
  const [layout, setLayout] = useState<VideoLayout>("grid");
  const callRef = useRef<Call | null>(null);
  const clientRef = useRef<StreamVideoClient | null>(null);
  const callingStateSubRef = useRef<{ unsubscribe(): void } | null>(null);
  const handlers = useRef({ onLeft, onDeviceError, onCameraStarted });
  handlers.current = { onLeft, onDeviceError, onCameraStarted };

  useImperativeHandle(
    ref,
    () => ({
      setMicEnabled(enabled) {
        const call = callRef.current;
        if (!call) return;
        const action = enabled ? call.microphone.enable() : call.microphone.disable();
        action.catch((err) => {
          handlers.current.onDeviceError(mapDeviceError([toFailure("audio", err)]));
        });
      },
      leave() {
        void callRef.current?.leave().catch(() => {});
      },
      async retryCamera() {
        const call = callRef.current;
        if (!call) return;
        await prepareForDailyCall();
        try {
          await call.camera.enable();
          handlers.current.onCameraStarted();
        } catch (err) {
          handlers.current.onDeviceError(mapDeviceError([toFailure("video", err)]));
        }
      },
    }),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    import("@stream-io/video-react-sdk").then((mod) => {
      if (!cancelled) setSdk(mod);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sdk) return;

    let cancelled = false;
    const { StreamVideoClient: StreamVideoClientCtor } = sdk;

    const setup = async () => {
      const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
      if (!apiKey) {
        console.error("[Stream] NEXT_PUBLIC_STREAM_API_KEY is not set");
        return;
      }

      // Device test (or a previous stage) may still hold the camera/mic.
      await prepareForDailyCall();
      if (cancelled) return;

      const client = new StreamVideoClientCtor({
        apiKey,
        user: { id: userId },
        token: join.token,
      });

      const call = client.call(join.domain, join.roomName);

      try {
        await call.join({ create: true });
      } catch {
        // Join failures are rare; device errors (below) cover the common case.
      }
      if (cancelled) {
        void call.leave().catch(() => {});
        void client.disconnectUser().catch(() => {});
        return;
      }

      callRef.current = call;
      clientRef.current = client;
      setReady(true);

      callingStateSubRef.current = call.state.callingState$.subscribe((state) => {
        if (state === sdk.CallingState.LEFT) handlers.current.onLeft();
      });

      call.setPreferredIncomingVideoResolution(TARGET_RESOLUTION);
      // Camera/mic start off (see SETTINGS_OVERRIDE server-side) — the user
      // turns them on explicitly via CallControls. No auto-enable here.
    };

    void setup();

    return () => {
      cancelled = true;
      const call = callRef.current;
      const client = clientRef.current;
      callingStateSubRef.current?.unsubscribe();
      callingStateSubRef.current = null;
      callRef.current = null;
      clientRef.current = null;
      setReady(false);
      if (call) void call.leave().catch(() => {});
      if (client) void client.disconnectUser().catch(() => {});
    };
  }, [sdk, join, userId]);

  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
  const chat = useStreamChat({
    apiKey,
    userId,
    token: join.token,
    channelType: join.chat?.channelType,
    channelId: join.chat?.channelId,
  });

  if (!ready || !sdk || !callRef.current || !clientRef.current) {
    return <div className="min-w-0 flex-1" aria-label="Video call" />;
  }

  const { StreamVideo, StreamCall, StreamTheme, PaginatedGridLayout, SpeakerLayout, CallControls } = sdk;

  return (
    <div className="relative flex min-w-0 flex-1" aria-label="Video call">
      <div className="flex min-w-0 flex-1 flex-col">
        <StreamVideo client={clientRef.current}>
          <StreamCall call={callRef.current}>
            {/* The call screen (ClientCall) is always a fixed dark background,
                regardless of site theme — pin Stream's theme to match.
                Stream's own CSS never sets a color on participant name
                labels, so without an explicit color they inherit from
                `body`'s text-foreground, which can be dark on a light site
                theme and invisible on this dark tile — force white. */}
            <StreamTheme className="str-video__theme-dark flex h-full w-full flex-col text-white">
              {/* `flex` (not just flex-1) is required here: PaginatedGridLayout's
                  (and SpeakerLayout's) root div relies on CSS `flex-grow: 1`
                  to get a height, which only resolves if ITS parent is a
                  flex container — without it, the layout's height stays
                  content-based/auto and every height:100%/max-height:100%
                  rule downstream (including the fixes in
                  stream-grid-fix.css) silently does nothing. */}
              <div className="relative flex min-h-0 flex-1">
                {layout === "grid" ? (
                  <PaginatedGridLayout pageArrowsVisible={false} />
                ) : (
                  <SpeakerLayout participantsBarPosition="bottom" />
                )}
                <LayoutSwitcher layout={layout} onChange={setLayout} />
              </div>
              <CallControls />
            </StreamTheme>
          </StreamCall>
        </StreamVideo>
      </div>
      {chatOpen && join.chat && apiKey && chat.client && chat.channel ? (
        <>
          <StreamChatPanel client={chat.client} channel={chat.channel} onClose={onCloseChat} />
          <StreamChatSheet client={chat.client} channel={chat.channel} onClose={onCloseChat} />
        </>
      ) : null}
    </div>
  );
});
