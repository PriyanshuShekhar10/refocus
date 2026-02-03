"use client";

import { useEffect, useState } from "react";
import Calendar from "./Calendar";
import { MobileCalendar } from "./Mobile";

export default function Dashboard() {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  if (isMobile) {
    return <MobileCalendar />;
  }

  return (
    <div>
      <Calendar />
    </div>
  );
}
