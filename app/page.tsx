import type { Metadata } from "next";
import Faq from "@/components/faq";
import { Hero } from "@/components/hero";
import { Features } from "@/components/features";
import { WhyItWorks } from "@/components/why-it-works";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Navbar from "@/components/navbar/navbar";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  title: "Refocus — Virtual coworking to stay focused",
  description:
    "Refocus helps you stay focused with virtual coworking, session scheduling, and accountability. Book sessions, meet partners, and get more done.",
  keywords: [
    "virtual coworking",
    "focus sessions",
    "accountability partner",
    "productivity",
    "deep work",
    "body doubling",
    "study with me",
    "work sessions",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Refocus — Virtual coworking to stay focused",
    description:
      "Virtual coworking that helps you stay focused. Book sessions, meet partners, and build momentum.",
    url: defaultUrl,
    siteName: "Refocus",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Refocus — Virtual coworking to stay focused",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Refocus — Virtual coworking to stay focused",
    description:
      "Virtual coworking that helps you stay focused. Book sessions, meet partners, and build momentum.",
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
    url: defaultUrl,
    description:
      "Virtual coworking to stay focused with session scheduling and accountability partners.",
  };

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Refocus",
    url: defaultUrl,
    logo: `${defaultUrl}/icon1.png`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <Navbar />
      <main className="min-h-screen flex flex-col items-center">
        <div className="flex-1 w-full flex flex-col gap-20 items-center">
          <div className="flex-1 flex flex-col gap-20 max-w-5x">
            <Hero />
            <WhyItWorks />
            <Features />
            <Faq />
          </div>

          <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
            <p>Powered by Refocus</p>
            <ThemeSwitcher />
          </footer>
        </div>
      </main>
    </>
  );
}
