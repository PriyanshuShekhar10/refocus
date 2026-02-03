"use client";

import { ChevronUp, ChevronDown, Info, Zap } from "lucide-react";
import type { DurationMin } from "@/constants/calendar";

interface MobileBottomSheetProps {
  isExpanded: boolean;
  onToggle: () => void;
  duration: DurationMin;
  onDurationChange: (d: DurationMin) => void;
  taskType: "desk" | "moving" | "anything";
  onTaskTypeChange: (t: "desk" | "moving" | "anything") => void;
  quietMode: boolean;
  onQuietModeChange: (q: boolean) => void;
  onBookSession: () => void;
  onQuickBook: () => void;
  isBooking?: boolean;
}

export function MobileBottomSheet({
  isExpanded,
  onToggle,
  duration,
  onDurationChange,
  taskType,
  onTaskTypeChange,
  quietMode,
  onQuietModeChange,
  onBookSession,
  onQuickBook,
  isBooking = false,
}: MobileBottomSheetProps) {
  return (
    <div
      className={`fixed bottom-16 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 rounded-t-3xl shadow-2xl transition-all duration-300 z-40 ${
        isExpanded ? "h-auto" : "h-16"
      }`}
    >
      {/* Collapsed View */}
      {!isExpanded && (
        <div className="flex items-center justify-between h-full px-4">
          <button
            onClick={onToggle}
            className="flex-1 flex items-center gap-3 py-2"
          >
            <span className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium">
              {duration}m
            </span>
            <span className="text-gray-400">
              {taskType === "desk" && "📝"}
              {taskType === "moving" && "🏃"}
              {taskType === "anything" && "🔀"}
            </span>
          </button>
          <button
            onClick={onToggle}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronUp className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Session Settings</h3>
              <button className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <Info className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <button
              onClick={onToggle}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ChevronDown className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Duration
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([25, 50, 75] as DurationMin[]).map((d) => (
                <button
                  key={d}
                  onClick={() => onDurationChange(d)}
                  className={`py-3 rounded-lg text-center transition-all ${
                    duration === d
                      ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  <span className="text-lg font-medium">{d}</span>
                  <span className="text-xs ml-0.5">min</span>
                </button>
              ))}
            </div>
          </div>

          {/* Task Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
              My Task
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onTaskTypeChange("desk")}
                className={`py-3 rounded-lg text-center flex flex-col items-center gap-1 transition-all ${
                  taskType === "desk"
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                <span className="text-lg">📝</span>
                <span className="text-xs font-medium">Desk</span>
              </button>
              <button
                onClick={() => onTaskTypeChange("moving")}
                className={`py-3 rounded-lg text-center flex flex-col items-center gap-1 transition-all ${
                  taskType === "moving"
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                <span className="text-lg">🏃</span>
                <span className="text-xs font-medium">Moving</span>
              </button>
              <button
                onClick={() => onTaskTypeChange("anything")}
                className={`py-3 rounded-lg text-center flex flex-col items-center gap-1 transition-all ${
                  taskType === "anything"
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                <span className="text-lg">🔀</span>
                <span className="text-xs font-medium">Anything</span>
              </button>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium">Quiet Mode</span>
              <button
                onClick={() => onQuietModeChange(!quietMode)}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  quietMode ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    quietMode ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Book Button */}
          <div className="flex gap-2">
            <button
              onClick={onBookSession}
              disabled={isBooking}
              className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-xl transition-colors"
            >
              {isBooking ? "Booking..." : "Book session"}
            </button>
            <button
              onClick={onQuickBook}
              disabled={isBooking}
              className="p-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl transition-colors"
            >
              <Zap className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
