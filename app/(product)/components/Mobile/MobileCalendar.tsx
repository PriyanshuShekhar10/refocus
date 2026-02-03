"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { useCalendarSessions } from "@/hooks/useCalendarSessions";
import { startOfDay, addDays, ymd, formatHour } from "@/lib/utils";
import { DEFAULT_DURATION, type DurationMin } from "@/constants/calendar";
import { MobileBottomSheet } from "./MobileBottomSheet";
import { MobileBottomNav, type MobileTab } from "./MobileBottomNav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const HOUR_HEIGHT = 60; // pixels per hour

export default function MobileCalendar() {
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));
  const [activeTab, setActiveTab] = useState<MobileTab>("home");
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [duration, setDuration] = useState<DurationMin>(DEFAULT_DURATION);
  const [taskType, setTaskType] = useState<"desk" | "moving" | "anything">("anything");
  const [quietMode, setQuietMode] = useState(false);
  const [now, setNow] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const currentHour = now.getHours();
      const scrollPos = Math.max(0, (currentHour - 1) * HOUR_HEIGHT);
      scrollRef.current.scrollTop = scrollPos;
    }
  }, []);

  const days = useMemo(() => [currentDate], [currentDate]);

  const { events, currentUserId, createSession } = useCalendarSessions({
    days,
    onEventsChange: undefined,
    eventsProp: undefined,
  });

  // Filter events for current day
  const dayEvents = useMemo(() => {
    return events.filter((ev) => ymd(new Date(ev.start)) === ymd(currentDate));
  }, [events, currentDate]);

  const goToday = useCallback(() => setCurrentDate(startOfDay(new Date())), []);
  const goNext = useCallback(() => setCurrentDate((d) => addDays(d, 1)), []);
  const goPrev = useCallback(() => setCurrentDate((d) => addDays(d, -1)), []);

  const handleBookSession = async () => {
    // Find next available slot
    const nowMs = Date.now();
    const startHour = new Date(nowMs).getHours();
    const nextSlot = new Date(currentDate);
    nextSlot.setHours(startHour + 1, 0, 0, 0);

    if (nextSlot.getTime() < nowMs) {
      nextSlot.setHours(nextSlot.getHours() + 1);
    }

    try {
      await createSession(nextSlot, duration, quietMode);
      setSheetExpanded(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuickBook = async () => {
    // Quick book the nearest available slot
    handleBookSession();
  };

  // Format date for header
  const formatDate = (date: Date) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return {
      month: `${months[date.getMonth()]} ${date.getFullYear()}`,
      day: `${days[date.getDay()]} ${date.getDate()}`,
    };
  };

  const dateInfo = formatDate(currentDate);
  const isToday = ymd(currentDate) === ymd(new Date());

  // Calculate now line position
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowLineTop = (nowMinutes / 60) * HOUR_HEIGHT;
  const showNowLine = isToday;

  // Format time for now line
  const formatNowTime = () => {
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? "p" : "a";
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minutes.toString().padStart(2, "0")}${ampm}`;
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <button className="flex items-center gap-1 text-lg font-semibold">
            {dateInfo.month}
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={goPrev} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goToday}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isToday
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                  : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
              }`}
            >
              Today
            </button>
            <button onClick={goNext} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Day indicator */}
      <div className="shrink-0 px-4 py-2 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">IST</span>
          <span className={`text-sm font-medium ${isToday ? "text-indigo-600 dark:text-indigo-400" : ""}`}>
            {dateInfo.day}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto pb-32"
        style={{ scrollBehavior: "smooth" }}
      >
        <div className="relative" style={{ height: 24 * HOUR_HEIGHT }}>
          {/* Time labels and grid lines */}
          {Array.from({ length: 24 }).map((_, hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-800"
              style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            >
              <span className="absolute left-3 -top-2.5 text-xs text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 px-1">
                {formatHour(hour)}
              </span>
              {/* Quarter hour lines */}
              <div className="absolute left-16 right-0 top-1/4 border-t border-dashed border-gray-100 dark:border-gray-800" />
              <div className="absolute left-16 right-0 top-1/2 border-t border-dashed border-gray-100 dark:border-gray-800" />
              <div className="absolute left-16 right-0 top-3/4 border-t border-dashed border-gray-100 dark:border-gray-800" />
            </div>
          ))}

          {/* Now line */}
          {showNowLine && (
            <div
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{ top: nowLineTop }}
            >
              <div className="flex items-center">
                <span className="text-xs font-medium text-red-500 bg-white dark:bg-gray-900 px-1 -ml-1">
                  {formatNowTime()}
                </span>
                <div className="flex-1 h-0.5 bg-red-500" />
              </div>
            </div>
          )}

          {/* Events */}
          {dayEvents.map((event) => {
            const startDate = new Date(event.start);
            const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
            const top = (startMinutes / 60) * HOUR_HEIGHT;
            const height = (event.durationMin / 60) * HOUR_HEIGHT;

            const isBooked = (event.participants?.length ?? 0) >= 2;
            const isOwner = event.owner_id === currentUserId;
            const isMySession = isBooked || isOwner;

            // Get other participant info
            const otherParticipant = event.participants?.find(
              (p) => p.user_id !== currentUserId
            );
            const otherName = otherParticipant
              ? [otherParticipant.firstname, otherParticipant.lastname]
                  .filter(Boolean)
                  .join(" ") || otherParticipant.email?.split("@")[0]
              : null;
            const otherInitial = otherName?.[0]?.toUpperCase() || "?";

            if (!isMySession) return null;

            return (
              <div
                key={event.id}
                className={`absolute left-16 right-3 rounded-lg p-2 ${
                  isBooked
                    ? "bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700"
                    : "bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-700"
                }`}
                style={{ top, height: Math.max(height, 40) }}
              >
                {isBooked && otherParticipant && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-green-200 dark:bg-green-800">
                        {otherInitial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{otherName}</p>
                      <p className="text-[10px] text-gray-500">{event.durationMin}m</p>
                    </div>
                  </div>
                )}
                {!isBooked && (
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center">
                      <span className="text-xs">⏳</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">Waiting for match</p>
                      <p className="text-[10px] text-gray-500">{event.durationMin}m</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Sheet */}
      <MobileBottomSheet
        isExpanded={sheetExpanded}
        onToggle={() => setSheetExpanded(!sheetExpanded)}
        duration={duration}
        onDurationChange={setDuration}
        taskType={taskType}
        onTaskTypeChange={setTaskType}
        quietMode={quietMode}
        onQuietModeChange={setQuietMode}
        onBookSession={handleBookSession}
        onQuickBook={handleQuickBook}
      />

      {/* Bottom Navigation */}
      <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
