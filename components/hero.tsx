"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { VideoModal } from "./video-modal";

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

  return (
    <div className="flex flex-col gap-16 items-center">
      <section className="w-screen h-screen bg-hero-gradient pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-screen-lg mx-auto text-center mt-24">
          {/* Heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold dark:text-white mb-14 leading-normal">
            Let&apos;s make your{" "}
            <span className="inline-block min-w-[3ch] font-bold text-center text-[#E0FF88]">
              {mounted && theme === "dark" ? "night" : "day"}
            </span>{" "}
            a little more productive
          </h1>
          <p className="text-xl sm:text-2xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Refocus allows you to regain focus, virtual coworking made easy.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col items-center mt-10 space-y-3">
            <div className="flex space-x-3">
              <button className="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700">
                Get early access
              </button>

              <button
                onClick={() => setIsOpen(true)}
                className="text-white bg-[#4674ffcf] hover:bg-[#355ed4] focus:ring-4 focus:ring-blue-200 font-medium rounded-lg text-sm px-5 py-2.5"
              >
                Watch demo
              </button>
            </div>

            {/* Waitlist stays in place */}
            <div className="flex items-center space-x-3 absolute bottom-10 right-5">
              <div className="flex -space-x-2">
                <Avatar>
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarImage src="https://github.com/evilrabbit.png" />
                  <AvatarFallback>ER</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarImage src="https://github.com/leerob.png" />
                  <AvatarFallback>LR</AvatarFallback>
                </Avatar>
              </div>
              <span className="text-gray-800 dark:text-gray-200 font-medium">
                Join waitlist among{" "}
                <span className="font-bold">100+ others</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Video Modal */}
      <VideoModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
