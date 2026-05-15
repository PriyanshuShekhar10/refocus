import type { Metadata } from "next";
import { Quicksand, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";
import { ChatDock } from "@/components/chat-dock";
// import Navbar from "@/components/navbar/navbar";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Refocus",
  description: "Finding you a buddy who matters.",
};

const quicksandSans = Quicksand({
  variable: "--font-quicksand",
  display: "swap",
  subsets: ["latin"],
  preload: true,
  weight: ["300", "400", "500", "600", "700"],
  style: "normal",
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
        className={`${quicksandSans.className} ${geistMono.variable} ${bricolage.variable} antialiased`}
      >
        <Providers>
          <Analytics />
          <SpeedInsights />
          {children}
          <ChatDock />
        </Providers>
      </body>
    </html>
  );
}
