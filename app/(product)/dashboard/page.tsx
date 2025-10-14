// app/(product)/dashboard/page.tsx
"use client";

import React, { useState } from "react";
import SideBar from "../components/Sidebar/sidebar";
import Profile from "../components/profile";
import Settings from "../components/settings";
import Friends from "../components/friends";
import Dashboard from "../components/dashboard";
import GlobalChat from "../components/globalchat";


type TabKey = "profile" | "dashboard" | "settings" | "friends" | "chat";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");

  return (
    <div className="flex">
      <SideBar activeTab={activeTab} onSelect={setActiveTab} />
      <main className="ml-16 flex-1 p-6">
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "profile" && <Profile />}
        {activeTab === "settings" && <Settings />}
        {activeTab === "friends" && <Friends />}
        {activeTab === "chat" && <GlobalChat />}
      </main>
    </div>
  );
}
