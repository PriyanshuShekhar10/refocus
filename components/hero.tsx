"use client";
import React, { useState } from "react";
import { useTheme } from "next-themes";

export function Hero() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex flex-col gap-16 items-center">
      <section className="w-screen h-screen bg-hero-gradient pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-screen-md mx-auto text-center mt-24">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-normal dark:text-white mb-14 leading-normal">
            Let&apos;s make your{" "}
            <span className="inline-block min-w-[3ch] font-bold text-center text-[#E0FF88]">
              {theme === "dark" ? "night" : "day"}
            </span>{" "}
            a little more productive
          </h1>
          <div className="flex flex-col items-center mt-6 space-y-3">
            {/* Button */}
            <button className="mb-64 text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700">
              Get early access
            </button>

            <div className="flex items-center space-x-3">
              <div className="flex -space-x-2">
                <img
                  className="w-10 h-10 rounded-full border-2 border-white"
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=d"
                  alt="Alice"
                />
                <img
                  className="w-10 h-10 rounded-full border-2 border-white"
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Bob"
                  alt="Bob"
                />
                <img
                  className="w-10 h-10 rounded-full border-2 border-white"
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie"
                  alt="Charlie"
                />
              </div>
              <span className="text-gray-800 dark:text-gray-200 font-medium">
                Join waitlist among{" "}
                <span className="font-bold">100+ others</span>
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
