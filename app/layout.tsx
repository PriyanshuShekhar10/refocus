import type { Metadata, Viewport } from "next";
import { Quicksand, Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";
import { ChatDock } from "@/components/chat-dock";
// import Navbar from "@/components/navbar/navbar";
import { GoogleAnalytics } from "@/components/google-analytics";
import { getSiteUrl } from "@/lib/site";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Refocus",
  description: "Finding you an accountability partner.",
};

// The app shell (fixed-height panes, bottom nav) is sized to the initial
// viewport; pinch-zooming out on mobile leaves those panes their original
// screen size while the now-larger visible area shows blank page behind
// them. Locking the zoom level avoids that instead of making every
// fixed-height pane re-measure against the live visual viewport.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const quicksandSans = Quicksand({
  variable: "--font-quicksand",
  display: "swap",
  subsets: ["latin"],
  preload: true,
  weight: ["300", "400", "500", "600", "700"],
  style: "normal",
});

const geistSans = Geist({
  variable: "--font-geist",
  display: "swap",
  subsets: ["latin"],
  preload: true,
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  display: "swap",
  subsets: ["latin"],
  preload: true,
  weight: ["400", "500"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  display: "swap",
  subsets: ["latin"],
  preload: true,
  weight: ["300", "400", "500", "600", "700"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${quicksandSans.className} ${geistSans.variable} ${geistMono.variable} ${bricolage.variable} antialiased`}
      >
        {/* beforeInteractive scripts must live in the root layout */}
        <GoogleAnalytics />
        <Providers>
          {children}
          <ChatDock />
        </Providers>
      </body>
    </html>
  );
}
