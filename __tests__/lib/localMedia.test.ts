import { describe, expect, it, vi } from "vitest";
import {
  hasActiveLocalMediaStreams,
  registerLocalMediaStream,
  releaseAllLocalMediaStreams,
  unregisterLocalMediaStream,
} from "@/lib/localMedia";

describe("localMedia", () => {
  it("tracks and releases registered streams", () => {
    const track = { stop: vi.fn(), readyState: "live" } as unknown as MediaStreamTrack;
    const stream = {
      getTracks: () => [track],
    } as unknown as MediaStream;

    registerLocalMediaStream(stream);
    expect(hasActiveLocalMediaStreams()).toBe(true);

    releaseAllLocalMediaStreams();
    expect(track.stop).toHaveBeenCalled();
    expect(hasActiveLocalMediaStreams()).toBe(false);
  });

  it("unregister removes stream without stopping tracks", () => {
    const track = { stop: vi.fn(), readyState: "live" } as unknown as MediaStreamTrack;
    const stream = {
      getTracks: () => [track],
    } as unknown as MediaStream;

    registerLocalMediaStream(stream);
    unregisterLocalMediaStream(stream);
    expect(hasActiveLocalMediaStreams()).toBe(false);
    expect(track.stop).not.toHaveBeenCalled();
  });
});
