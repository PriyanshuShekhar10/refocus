import type { Metadata } from "next";
import { SoftRedirectToMarketing } from "@/components/soft-redirect-to-marketing";

/**
 * Dashboard host `/` must return HTML (with GA) so Google Tag verification
 * can see G-QLK6MHDM07. Browsers are then soft-redirected to the Astro
 * marketing site on the apex.
 */
export const metadata: Metadata = {
  title: "Refocus",
  description: "Finding you an accountability partner.",
  robots: { index: false, follow: false },
  alternates: {
    canonical: "https://refocus.co.in/",
  },
};

export default function Home() {
  return <SoftRedirectToMarketing />;
}
