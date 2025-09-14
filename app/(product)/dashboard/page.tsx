import React from "react";
import SideBar from "../components/Sidebar/sidebar";

export default function DashboardPage() {
  return (
    <>
      <SideBar />
      <div className="ml-16">
        <main className="p-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome to your dashboard! 🎉</p>
        </main>
      </div>
    </>
  );
}
