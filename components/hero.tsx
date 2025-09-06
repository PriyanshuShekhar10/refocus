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
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-normal dark:text-white mb-14 leading-tight">
            Let&apos;s make your{" "}
            <span className="inline-block min-w-[3ch] font-bold text-center text-[#E0FF88]">
              {theme === "dark" ? "night" : "day"}
            </span>{" "}
            a little more productive
          </h1>

          <button className="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700">Get early access</button>
        </div>
      </section>
    </div>
  );
}
