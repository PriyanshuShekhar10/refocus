import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { notFound } from "next/navigation";
import Link from "next/link";
import ClientCall from "./ClientCall";
import SessionCountdown from "./SessionCountdown";

export default async function SessionJoinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!currentUserId) return notFound();

  const db = await getDb();
  const s = (await db.collection("sessions").findOne(
    { _id: new ObjectId(id) },
    {
      projection: {
        start_time: 1,
        end_time: 1,
        session_type: 1,
        duration_min: 1,
        name: 1,
        owner_id: 1,
        session_participants: 1,
      },
    }
  )) as null | {
    start_time: Date;
    end_time: Date;
    session_type: string;
    duration_min: number;
    name?: string | null;
    owner_id: string;
    session_participants?: Array<{ user_id: string; joined_at: Date | string }>;
  };
  if (!s) return notFound();

  // Visibility: if booked (>=2 participants), allow only participants or owner
  const participants = s.session_participants ?? [];
  const isBooked = participants.length >= 2;
  const isOwner = s.owner_id === currentUserId;
  const isParticipant = participants.some((p) => p.user_id === currentUserId);
  if (isBooked && !(isOwner || isParticipant)) return notFound();

  // Check if session is joinable (within 1 hour of start or in progress)
  const now = new Date();
  const startTime = new Date(s.start_time);
  const endTime = new Date(s.end_time);
  const oneHourBefore = new Date(startTime.getTime() - 60 * 60 * 1000);
  const canJoinNow = now >= oneHourBefore && now <= endTime;
  const hasEnded = now > endTime;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Session</h1>
        <Link
          href="/dashboard"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Back to dashboard
        </Link>
      </div>
      <div className="mt-4 space-y-2">
        <div className="text-sm text-gray-700 dark:text-gray-300">ID: {id}</div>
        {s.name && <div className="text-sm text-gray-700 dark:text-gray-300">Name: {s.name}</div>}
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Type: {s.session_type} • {s.duration_min} min
        </div>
        <div className="text-sm text-gray-700 dark:text-gray-300">
          When (IST):{" "}
          {new Date(s.start_time).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })}
        </div>
      </div>

      {hasEnded ? (
        <div className="mt-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-gray-500 dark:text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Session Ended</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            This session has already ended.
          </p>
        </div>
      ) : canJoinNow ? (
        <ClientCall sessionId={id} />
      ) : (
        <SessionCountdown
          startTime={s.start_time.toISOString()}
          sessionId={id}
        />
      )}
    </div>
  );
}
