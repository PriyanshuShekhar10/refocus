import type { Metadata } from "next";
import { decodeCrewMemberParam } from "../../crewShared";
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
  const daysRaw = Number(sp.days ?? 14);
  const initialDays = Number.isFinite(daysRaw) ? daysRaw : 14;

  return <CrewMemberClient email={email} initialDays={initialDays} />;
}
