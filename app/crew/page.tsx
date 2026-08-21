import type { Metadata } from "next";
import CrewListClient from "./CrewListClient";

export const metadata: Metadata = {
  title: "Crew",
  robots: { index: false, follow: false },
};

export default function CrewDashboardPage() {
  return <CrewListClient />;
}
