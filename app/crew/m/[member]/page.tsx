import type { Metadata } from "next";
import {
  CREW_ALL_TIME_DAYS,
  CREW_DEFAULT_DAYS,
  decodeCrewMemberParam,
  parseCrewRangeMode,
} from "../../crewShared";
import CrewMemberClient from "./CrewMemberClient";

export const metadata: Metadata = {
  title: "Crew member",
  robots: { index: false, follow: false },
};

export default async function CrewMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ member: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const { member } = await params;
  const sp = await searchParams;
  const email = decodeCrewMemberParam(member);
  const range = parseCrewRangeMode(sp.days);
  const initialDays =
    range === "all" ? CREW_ALL_TIME_DAYS : CREW_DEFAULT_DAYS;

  return <CrewMemberClient email={email} initialDays={initialDays} />;
}
