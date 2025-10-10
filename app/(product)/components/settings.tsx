"use client";
import React from "react";
import { signOut } from "next-auth/react";

export default function Settings() {
  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/" });
    } catch {
      // no-op
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-lg font-semibold">Settings</h2>
      <div className="rounded-md border p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Logout</div>
            <div className="text-xs text-gray-500">Sign out and return to the homepage</div>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
