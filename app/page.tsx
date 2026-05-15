import type { Metadata } from "next";
import { Homepage } from "@/components/homepage";
import { LandingLightLock } from "@/components/landing-light-lock";
import { getSiteUrl } from "@/lib/site";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: "Refocus — Focus, together. Quietly.",
  description:
    "Refocus is a virtual co-working room for deep work. Pick a 25, 50, or 75 minute session and get the thing done — alone, with a friend, or with someone new.",
  keywords: [
    "virtual coworking",
    "focus sessions",
    "accountability partner",
    "productivity",
    "deep work",
    "body doubling",
    "study with me",
    "work sessions",
    "pomodoro",
    "AI matchmaking",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Refocus — Focus, together. Quietly.",
    description:
      "A virtual co-working room for deep work. 25, 50, or 75 minute sessions. Focus mode mutes both mics so you're present, not performing.",
    url: siteUrl,
    siteName: "Refocus",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Refocus — Focus, together. Quietly.",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Refocus — Focus, together. Quietly.",
    description:
      "A virtual co-working room for deep work. 25, 50, or 75 minute sessions.",
    images: ["/twitter-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Refocus",
    url: siteUrl,
    description:
      "Virtual co-working room for deep work with synced timers, focus mode, friends, and global chat.",
  };

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Refocus",
    url: siteUrl,
    logo: `${siteUrl}/icon1.png`,
  };

  return (
    <LandingLightLock>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <Homepage />
    </LandingLightLock>
  );
}
