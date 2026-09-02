const activeStreams = new Set<MediaStream>();

/** Track getUserMedia streams created on the Refocus origin (e.g. device test). */
export function registerLocalMediaStream(stream: MediaStream) {
  activeStreams.add(stream);
}

export function unregisterLocalMediaStream(stream: MediaStream) {
  activeStreams.delete(stream);
}

/** Stop tracks on any video/audio elements Refocus may still hold in the DOM. */
export function releaseMediaFromDom(root: ParentNode = document) {
  root.querySelectorAll("video, audio").forEach((node) => {
    const el = node as HTMLMediaElement;
    const src = el.srcObject;
    if (src instanceof MediaStream) {
      src.getTracks().forEach((track) => track.stop());
      el.srcObject = null;
    }
  });
}

/** Stop all Refocus-origin streams so Daily can access the physical devices. */
export function releaseAllLocalMediaStreams() {
  for (const stream of activeStreams) {
    stream.getTracks().forEach((track) => track.stop());
  }
  activeStreams.clear();
  if (typeof document !== "undefined") {
    releaseMediaFromDom();
  }
}

export function hasActiveLocalMediaStreams() {
  for (const stream of activeStreams) {
    if (stream.getTracks().some((track) => track.readyState === "live")) {
      return true;
    }
  }
  if (typeof document !== "undefined") {
    for (const node of document.querySelectorAll("video, audio")) {
      const src = (node as HTMLMediaElement).srcObject;
      if (
        src instanceof MediaStream &&
        src.getTracks().some((track) => track.readyState === "live")
      ) {
        return true;
      }
    }
  }
  return false;
}

/** Release Refocus-held devices and brief wait so the OS can hand off to Daily. */
export async function prepareForDailyCall() {
  releaseAllLocalMediaStreams();
  await new Promise((resolve) => window.setTimeout(resolve, 250));
  releaseAllLocalMediaStreams();
}
