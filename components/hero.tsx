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
        <div className="max-w-7xl mx-auto text-center mt-24">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-light text-white mb-6 leading-tight">
            Let&apos;s make your{" "}
            <span className="inline-block min-w-[4ch] font-bold text-center">
              {theme === "dark" ? "night" : "day"}
            </span>{" "}
            a little more productive
          </h1>
        </div>
      </section>
    </div>
  );
}
