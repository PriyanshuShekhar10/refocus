"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
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

          {/* Play button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="relative"
          >
            <div
              className="
                rounded-2xl max-w-80 mx-auto my-10
                backdrop-blur-xl
                bg-white/20 dark:bg-slate-700/20
                border border-white/30 dark:border-slate-500/30
                shadow-md
              "
            >
              <div
                className="aspect-video rounded-xl flex items-center justify-center relative overflow-hidden group cursor-pointer"
                onClick={() => setIsOpen(true)}
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                />
                <div className="text-center relative z-10">
                  <motion.div
                    className="w-12 h-12 bg-[#ff875eb3] dark:bg-[#4674ffcf] rounded-full flex items-center justify-center mx-auto mb-4"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Play className="w-6 h-6 text-white ml-1" />
                  </motion.div>
                  <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">
                    Demo
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* CTA */}
          <div className="flex flex-col items-center mt-6 space-y-3">
            <button className="mb-64 text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700">
              Get early access
            </button>

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
