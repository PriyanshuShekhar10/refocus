"use client";
import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VideoModal } from "./video-modal";
import Image from "next/image";
import { DarkDashboard, DarkModal, DarkScheduler, LightDashboard, LightModal, LightScheduler } from "@/assets/exports";

export function Hero() {
  const { theme } = useTheme();
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

  const sendEmail = () => {
    const email = "hello@refocus.co.in";
    window.location.href = `mailto:${email}`;
  };

  return (
    <div className="flex flex-col gap-16 items-center">
      <section className="relative w-screen min-h-screen bg-hero-gradient pt-16 xs:pt-20 sm:pt-24 md:pt-32 px-3 xs:px-4 sm:px-6 lg:px-8 overflow-hidden pb-40">
        <div className="max-w-screen-lg mx-auto text-center mt-10 xs:mt-12 sm:mt-16 md:mt-24">
          {/* Heading */}
          <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold dark:text-white mb-6 xs:mb-8 sm:mb-10 md:mb-14 leading-tight sm:leading-normal px-1 xs:px-2">
            Let&apos;s make your{" "}
            <span className="inline-block min-w-[3ch] font-bold text-center text-[#E0FF88]">
              {mounted && theme === "dark" ? "night" : "day"}
            </span>{" "}
            a little more productive
          </h1>

          {/* Subtitle */}
          <p className="text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed px-2 xs:px-4">
            Refocus allows you to regain focus, virtual coworking made easy.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col items-center mt-6 xs:mt-8 sm:mt-10 space-y-3 xs:space-y-4 sm:space-y-5">
            <div className="flex flex-col sm:flex-row gap-2.5 xs:gap-3 w-full sm:w-auto px-3 xs:px-4 sm:px-0 max-w-md sm:max-w-none">
              {/* <button onClick={sendEmail} className="w-full sm:w-auto text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-xs xs:text-sm px-4 xs:px-5 py-2 xs:py-2.5 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700 transition-colors">
                Get early access
              </button> */}

              {/* <button
                onClick={() => setIsOpen(true)}
                className="w-full sm:w-auto text-white bg-[#4674ffcf] hover:bg-[#355ed4] focus:ring-4 focus:ring-blue-200 font-medium rounded-lg text-xs xs:text-sm px-4 xs:px-5 py-2 xs:py-2.5 transition-colors"
              >
                Watch demo
              </button> */}
            </div>

            {/* Waitlist - Responsive positioning */}
            {/* <div className="flex flex-col sm:flex-row items-center justify-center gap-2 xs:gap-3 mt-6 xs:mt-8 sm:mt-12 md:absolute md:bottom-10 md:left-1/2 md:-translate-x-1/2 px-3 xs:px-4">
              <div className="flex -space-x-1.5 xs:-space-x-2">
                <Avatar className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 border-2 border-white dark:border-gray-800">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <Avatar className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 border-2 border-white dark:border-gray-800">
                  <AvatarImage src="https://github.com/evilrabbit.png" />
                  <AvatarFallback>ER</AvatarFallback>
                </Avatar>
                <Avatar className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 border-2 border-white dark:border-gray-800">
                  <AvatarImage src="https://github.com/leerob.png" />
                  <AvatarFallback>LR</AvatarFallback>
                </Avatar>
              </div>
              <span className="text-xs xs:text-sm sm:text-base text-gray-800 dark:text-gray-200 font-medium text-center leading-snug">
                Join waitlist among{" "}
                <span className="font-bold">100+ others</span>
              </span>
            </div> */}
          </div>
        </div>
        {mounted &&
          <div className="absolute inset-x-0 bottom-6 h-[520px] sm:h-[580px] md:h-[680px] pointer-events-none">
            <div className="relative w-full h-full flex justify-center items-end">
              <Image
                alt="AI Scheduler"
                src={theme === "dark" ? DarkScheduler : LightScheduler}
                className="
                  absolute
                  left-1/2
                  -translate-x-[135%]
                  bottom-0
                  w-[340px] sm:w-[420px] md:w-[480px]
                  rounded-xl
                  shadow-2xl
                  scale-95
                  translate-y-24
                  z-10
                  opacity-90
                "
              />
              <Image
                alt="Dashboard"
                src={theme === "dark" ? DarkDashboard : LightDashboard}
                className="
                  relative
                  w-[380px] sm:w-[460px] md:w-[540px]
                  rounded-2xl
                  shadow-2xl
                  z-20
                  translate-y-12
                "
              />
              <Image
                alt="Modal"
                src={theme === "dark" ? DarkModal : LightModal}
                className="
                  absolute
                  left-1/2
                  translate-x-[35%]
                  bottom-0
                  w-[340px] sm:w-[420px] md:w-[480px]
                  rounded-xl
                  shadow-2xl
                  scale-95
                  translate-y-24
                  z-10
                  opacity-90
                "
              />
            </div>
          </div>
        }
      </section>

      {/* Video Modal */}
      <VideoModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
