"use client";

import { forwardRef } from "react";
import { DailyStage } from "./DailyStage";
import { StreamStage } from "./StreamStage";
import type { VideoStageHandle, VideoStageProps } from "./types";

/**
 * Renders the call for whichever provider the server issued the join for.
 * Adding a provider = one new *Stage component implementing VideoStageHandle.
 */
export const VideoStage = forwardRef<VideoStageHandle, VideoStageProps>(function VideoStage(props, ref) {
  switch (props.join.provider) {
    case "daily":
      return <DailyStage ref={ref} {...props} />;
    case "stream":
      return <StreamStage ref={ref} {...props} />;
  }
});

export type { VideoJoin, VideoStageHandle, VideoDeviceError } from "./types";
