import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Raleway } from "next/font/google";
import { Quicksand } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
// import Navbar from "@/components/navbar/navbar";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Refocus",
  description: "Finding you a buddy who matters.",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

const ralewaySans = Raleway({
  variable: "--font-raleway",
  display: "swap",
  subsets: ["latin"],
  preload: true,
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  style: "normal",
});

const quicksandSans = Quicksand({
  variable: "--font-quicksand",
  display: "swap",
  subsets: ["latin"],
  preload: true,
  weight: ["300", "400", "500", "600", "700"],
  style: "normal",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${quicksandSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
