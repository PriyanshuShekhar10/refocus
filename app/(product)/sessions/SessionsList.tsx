"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Participant {
  userId: string;
  email?: string;
  name?: string;
  firstname?: string;
  lastname?: string;
  quiet?: boolean;
}

interface Session {
  id: string;
  start: string;
  end: string;
  durationMin: number;
  sessionType: string;
  name: string | null;
  status: string;
  ownerId: string;
  isOwner: boolean;
  participants: Participant[];
  ownerInfo?: {
    email?: string;
    name?: string;
    firstname?: string;
    lastname?: string;
  };
}

interface SessionsListProps {
  sessions: Session[];
  currentUserId: string;
}

function isJoinable(startTime: string, endTime: string): boolean {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  const oneHourBefore = new Date(start.getTime() - 60 * 60 * 1000);
  return now >= oneHourBefore && now <= end;
}

function getTimeUntil(startTime: string): string {
  const now = new Date();
  const start = new Date(startTime);
  const diff = start.getTime() - now.getTime();
  
  if (diff <= 0) return "Now";
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `in ${days} day${days > 1 ? "s" : ""}`;
  }
  if (hours > 0) {
    return `in ${hours}h ${minutes}m`;
  }
  return `in ${minutes}m`;
}

function formatDateTime(dateStr: string): { date: string; time: string } {
  const date = new Date(dateStr);
  return {
    date: date.toLocaleDateString("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "Asia/Kolkata",
    }),
    time: date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }),
  };
}

function getParticipantName(p: Participant): string {
  if (p.firstname || p.lastname) {
    return [p.firstname, p.lastname].filter(Boolean).join(" ");
  }
  if (p.name) return p.name;
  if (p.email) return p.email.split("@")[0];
  return "Unknown";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

export function SessionsList({ sessions, currentUserId }: SessionsListProps) {
  const [, setTick] = useState(0);

  // Update every minute to refresh "time until" and joinability
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  if (sessions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No upcoming sessions</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Book a session from the calendar to get started
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
        >
          Go to Calendar
        </Link>
      </div>
    );
  }

  // Group sessions by date
  const groupedSessions: { [key: string]: Session[] } = {};
  sessions.forEach((s) => {
    const dateKey = new Date(s.start).toLocaleDateString("en-IN", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
    if (!groupedSessions[dateKey]) {
      groupedSessions[dateKey] = [];
    }
    groupedSessions[dateKey].push(s);
  });

  return (
    <div className="space-y-8">
      {Object.entries(groupedSessions).map(([dateKey, daySessions]) => (
        <div key={dateKey}>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {dateKey}
          </h2>
          <div className="space-y-3">
            {daySessions.map((session) => {
              const { time } = formatDateTime(session.start);
              const joinable = isJoinable(session.start, session.end);
              const timeUntil = getTimeUntil(session.start);
              const isBooked = session.participants.length >= 2;
              
              // Find partner (the other participant)
              const partner = session.participants.find(
                (p) => p.userId !== currentUserId
              );
              const partnerName = partner ? getParticipantName(partner) : null;

              return (
                <div
                  key={session.id}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {/* Time */}
                      <div className="text-center min-w-[60px]">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {time}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {session.durationMin} min
                        </p>
                      </div>

                      {/* Details */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {session.name || `${session.sessionType} session`}
                          </h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            isBooked
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                          }`}>
                            {isBooked ? "Booked" : "Waiting for partner"}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {session.isOwner ? "You're hosting" : "You're joining"} • {session.sessionType}
                        </p>

                        {/* Partner info */}
                        {isBooked && partner && (
                          <div className="mt-2 flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
                                {getInitials(partnerName!)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              with <span className="font-medium">{partnerName}</span>
                              {partner.quiet && (
                                <span className="ml-1 text-gray-400">(quiet mode)</span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {!joinable && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {timeUntil}
                        </span>
                      )}
                      
                      {joinable && isBooked ? (
                        <Link
                          href={`/sessions/${session.id}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                          </svg>
                          Join Now
                        </Link>
                      ) : (
                        <Link
                          href={`/sessions/${session.id}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          View Details
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
