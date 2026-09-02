"use client";

export type DailyDeviceError = {
  type: string;
  msg?: string;
  blockedBy?: "user" | "browser";
  blockedMedia?: Array<"video" | "audio">;
  missingMedia?: Array<"video" | "audio">;
};

type BrowserHint = "chrome" | "safari-mac" | "safari-ipad" | "generic";

function detectBrowserHint(): BrowserHint {
  if (typeof navigator === "undefined") return "generic";
  const ua = navigator.userAgent;
  const isIpad =
    /iPad/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|Edg\//.test(ua);

  if (isSafari && isIpad) return "safari-ipad";
  if (isSafari) return "safari-mac";
  if (/Chrome|CriOS|Edg\//.test(ua)) return "chrome";
  return "generic";
}

function errorTitle(error: DailyDeviceError): string {
  switch (error.type) {
    case "permissions":
      return "Camera or microphone blocked";
    case "cam-in-use":
    case "mic-in-use":
    case "cam-mic-in-use":
      return "Device already in use";
    case "not-found":
      return "No camera or microphone found";
    default:
      return "Device setup issue";
  }
}

function errorDescription(error: DailyDeviceError): string {
  switch (error.type) {
    case "permissions":
      return error.blockedBy === "browser"
        ? "Your browser blocked access. Update site permissions below, then try again."
        : "Camera or microphone access was denied. Allow access in your browser settings, then try again.";
    case "cam-in-use":
    case "mic-in-use":
    case "cam-mic-in-use":
      return "Another app or browser tab may be using your camera or microphone. Close Zoom, Teams, or the device test modal, then try again.";
    case "not-found":
      return "We couldn't find a camera or microphone. Check that your devices are connected, then reload and try again.";
    default:
      return error.msg ?? "Something went wrong while setting up your devices.";
  }
}

function permissionSteps(hint: BrowserHint): string[] {
  switch (hint) {
    case "chrome":
      return [
        "Click the lock or sliders icon to the left of the address bar.",
        "Set Camera and Microphone to Allow.",
        "Reload this page and join again.",
      ];
    case "safari-mac":
      return [
        "Open Safari → Settings → Websites.",
        "Select Camera and Microphone.",
        "Find this site and set it to Allow or Ask.",
        "Reload and join again.",
      ];
    case "safari-ipad":
      return [
        "Tap aA in the address bar (not the lock icon).",
        "Tap Website Settings.",
        "Set Camera and Microphone to Allow.",
        "Reload and join again.",
      ];
    default:
      return [
        "Open your browser's site settings for this page.",
        "Allow camera and microphone access.",
        "Reload and join again.",
      ];
  }
}

type Props = {
  error: DailyDeviceError;
  onTryAgain: () => void;
  onDismiss: () => void;
};

export default function MediaPermissionHelp({ error, onTryAgain, onDismiss }: Props) {
  const hint = detectBrowserHint();
  const showPermissionSteps = error.type === "permissions";

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-permission-help-title"
        className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 text-white shadow-2xl"
      >
        <h2 id="media-permission-help-title" className="text-lg font-semibold">
          {errorTitle(error)}
        </h2>
        <p className="mt-2 text-sm text-slate-300">{errorDescription(error)}</p>

        {showPermissionSteps ? (
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-200">
            {permissionSteps(hint).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <a
            href="https://help.daily.co/en/articles/2528184-unblock-camera-mic-access-on-a-computer"
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-lg border border-slate-600 px-3 py-2 text-center text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 sm:mr-auto"
          >
            More help
          </a>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={onTryAgain}
            className="rounded-lg bg-[#5D1C6A] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#CA5995]"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
