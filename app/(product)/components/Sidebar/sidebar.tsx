// app/(product)/components/Sidebar/sidebar.tsx
"use client";

import React, { FC, ReactNode, useEffect, useState } from "react";
import { BsPlus, BsFillLightningFill, BsGearFill } from "react-icons/bs";
import { FaFire, FaPoo } from "react-icons/fa";
import { HiSun, HiMoon } from "react-icons/hi";
import { useTheme } from "next-themes";

const SideBar: FC = () => {
  return (
    <div
      className="fixed top-0 left-0 h-screen w-16 flex flex-col
                 bg-white dark:bg-gray-900 shadow-sm z-40"
    >
      <SideBarIcon icon={<FaFire size={20} />} text="Fire" />
      <Divider />
      <SideBarIcon icon={<BsPlus size={20} />} text="Add" />
      <SideBarIcon icon={<BsFillLightningFill size={18} />} text="Lightning" />
      <SideBarIcon icon={<FaPoo size={18} />} text="Poo" />
      <Divider />
      <SideBarIcon icon={<BsGearFill size={18} />} text="Settings" />

      {/* push the theme toggle to the bottom */}
      <div className="mt-auto mb-4">
        <ThemeToggle />
      </div>
    </div>
  );
};

interface SideBarIconProps {
  icon: ReactNode;
  text?: string;
}

const SideBarIcon: FC<SideBarIconProps> = ({ icon, text = "tooltip 💡" }) => (
  <div
    className="group relative flex items-center justify-center
               h-12 w-12 mt-3 mb-3 mx-auto
               bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700
               text-gray-600 dark:text-green-400
               hover:bg-green-600 hover:text-white
               rounded-3xl hover:rounded-xl
               transition-all duration-200 ease-linear
               cursor-pointer shadow-sm dark:shadow-md"
    role="button"
    tabIndex={0}
    aria-label={text}
  >
    {icon}
    <span
      className="absolute left-16 top-1/2 -translate-y-1/2
                 whitespace-nowrap px-2 py-1 rounded-md shadow-md
                 text-xs font-semibold
                 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900
                 transform -translate-x-1 opacity-0
                 group-hover:translate-x-0 group-hover:opacity-100
                 transition-transform transition-opacity duration-150 ease-out"
    >
      {text}
    </span>
  </div>
);

const Divider: FC = () => (
  <hr className="w-10 mx-auto my-1 bg-gray-200 dark:bg-gray-800 h-[1px] rounded-full" />
);

/* ThemeToggle component using next-themes */
const ThemeToggle: FC = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className="group relative flex items-center justify-center
                   h-12 w-12 mt-2 mx-auto
                   bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700
                   rounded-3xl shadow-sm"
        aria-hidden
      >
        <HiSun size={18} />
      </div>
    );
  }

  const current = resolvedTheme || "light";
  const next = current === "dark" ? "light" : "dark";

  return (
    <button
      onClick={() => setTheme(next)}
      className="group relative flex items-center justify-center
                 h-12 w-12 mt-2 mx-auto
                 bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700
                 text-gray-600 dark:text-green-300
                 hover:bg-green-600 hover:text-white
                 rounded-3xl hover:rounded-xl
                 transition-all duration-200 ease-linear
                 cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-300"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {current === "dark" ? <HiSun size={18} /> : <HiMoon size={18} />}

      <span
        className="absolute left-16 top-1/2 -translate-y-1/2
                   whitespace-nowrap px-2 py-1 rounded-md shadow-md
                   text-xs font-semibold
                   bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900
                   transform -translate-x-1 opacity-0
                   group-hover:translate-x-0 group-hover:opacity-100
                   transition-transform transition-opacity duration-150 ease-out"
      >
        {current === "dark" ? "Light mode" : "Dark mode"}
      </span>
    </button>
  );
};

export default SideBar;
