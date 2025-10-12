"use client";

import { useEffect, useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import Link from "next/link";

interface DesktopOnlyWrapperProps {
  children: React.ReactNode;
  minWidth?: number;
}

export default function DesktopOnlyWrapper({
  children,
  minWidth = 1024,
}: DesktopOnlyWrapperProps) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check initial screen size
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= minWidth);
    };

    checkScreenSize();

    // Add event listener for window resize
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, [minWidth]);

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse text-gray-400 dark:text-gray-600">
          Loading...
        </div>
      </div>
    );
  }

  // Show desktop content if screen is large enough
  if (isDesktop) {
    return <>{children}</>;
  }

  // Show mobile/tablet message
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center space-y-6 border border-gray-200 dark:border-gray-700">
        {/* Icon */}
        <div className="flex justify-center items-center gap-4">
          <div className="relative">
            <Smartphone className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">✕</span>
            </div>
          </div>
          <div className="text-2xl text-gray-400 dark:text-gray-500">→</div>
          <div className="relative">
            <Monitor className="w-12 h-12 text-green-500 dark:text-green-400" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Desktop Required
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Minimum screen width: {minWidth}px
          </p>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
            The dashboard is best experienced on a desktop browser. Please
            switch to a larger screen for optimal use.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              💡 <span className="font-medium">Tip:</span> For the best
              experience, use a device with a screen width of at least{" "}
              <span className="font-semibold">{minWidth}px</span>.
            </p>
          </div>
        </div>

        {/* Features List */}
        <div className="text-left space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Available on desktop:
          </p>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Full calendar and session management</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Real-time video sessions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Advanced productivity features</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Complete dashboard analytics</span>
            </li>
          </ul>
        </div>

        {/* Button */}
        <div className="pt-4">
          <Link
            href="/"
            className="inline-block w-full px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Back to Home
          </Link>
        </div>

        {/* Current Screen Size (for debugging) */}
        <div className="pt-2 text-xs text-gray-400 dark:text-gray-600">
          Current screen: {mounted ? `${window.innerWidth}px` : "..."}
        </div>
      </div>
    </div>
  );
}