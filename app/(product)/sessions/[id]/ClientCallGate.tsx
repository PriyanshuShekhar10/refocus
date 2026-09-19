"use client";

import dynamic from "next/dynamic";
import { PreparingSessionShell } from "./PreparingSessionShell";

const ClientCall = dynamic(() => import("./ClientCall"), {
  loading: () => <PreparingSessionShell />,
  ssr: false,
});

type PrejoinInfo = {
  partnerName: string | null;
  partnerInitial: string | null;
  partnerAvatarUrl?: string | null;
  partnerUserId?: string | null;
  durationMin: number;
  sessionType: string;
  sessionName: string | null;
  startIso: string;
  endIso: string;
};

export default function ClientCallGate({
  sessionId,
  currentUserId,
  prejoin,
}: {
  sessionId: string;
  currentUserId: string;
  prejoin: PrejoinInfo;
}) {
  return (
    <ClientCall
      sessionId={sessionId}
      currentUserId={currentUserId}
      prejoin={prejoin}
    />
  );
}
