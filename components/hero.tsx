"use client";
import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { VideoModal } from "./video-modal";
import Image from "next/image";
import { DarkDashboard, DarkModal, DarkScheduler, LightDashboard, LightModal, LightScheduler } from "@/assets/exports";

type HeroProps = {
  /** Homepage: always use light visuals; stored theme unchanged elsewhere */
  marketingHome?: boolean;
};

export function Hero({ marketingHome = false }: HeroProps) {
  const { theme } = useTheme();
  const visualTheme = marketingHome ? "light" : theme;
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close modal on ESC
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setIsOpen(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  return (
    <div className="flex flex-col items-center">
      {/* Hero Text Section */}
      <section className="relative w-screen bg-hero-gradient pt-16 xs:pt-20 sm:pt-24 md:pt-32 px-3 xs:px-4 sm:px-6 lg:px-8">
        <div className="max-w-screen-lg mx-auto text-center mt-10 xs:mt-12 sm:mt-16 md:mt-24 pb-16 xs:pb-20 sm:pb-24 md:pb-32">
          {/* Heading */}
          <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold dark:text-white mb-6 xs:mb-8 sm:mb-10 md:mb-14 leading-tight sm:leading-normal px-1 xs:px-2">
            Let&apos;s make your{" "}
            <span className="inline-block min-w-[3ch] font-bold text-center text-[#E0FF88]">
              {mounted && visualTheme === "dark" ? "night" : "day"}
            </span>{" "}
            a little more productive
          </h1>

          {/* Subtitle */}
          <p className="text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed px-2 xs:px-4">
            Refocus allows you to regain focus, virtual coworking made easy.
          </p>
        </div>
      </section>

      {/* Product Images Section */}
      {mounted && (
        <section className="relative w-screen bg-neutral-950 overflow-hidden px-3 xs:px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24 md:pb-32 pt-10 sm:pt-14 md:pt-16">
          <div className="relative w-full flex justify-center items-end h-[300px] sm:h-[380px] md:h-[460px]">
            <div className="absolute left-1/2 -translate-x-[135%] bottom-0 w-[340px] sm:w-[420px] md:w-[480px] translate-y-16 z-10">
              <Image
                alt="AI Scheduler"
                src={visualTheme === "dark" ? DarkScheduler : LightScheduler}
                className="w-full rounded-xl shadow-2xl scale-95 opacity-90"
              />
            </div>

            <div className="relative w-[380px] sm:w-[460px] md:w-[540px] z-20">
              <Image
                alt="Dashboard"
                src={visualTheme === "dark" ? DarkDashboard : LightDashboard}
                className="w-full rounded-2xl shadow-2xl"
              />
            </div>

            <div className="absolute left-1/2 translate-x-[35%] bottom-0 w-[340px] sm:w-[420px] md:w-[480px] translate-y-16 z-10">
              <Image
                alt="Modal"
                src={visualTheme === "dark" ? DarkModal : LightModal}
                className="w-full rounded-xl shadow-2xl scale-95 opacity-90"
              />
            </div>
          </div>
        </section>
      )}

      {/* Video Modal */}
      <VideoModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
