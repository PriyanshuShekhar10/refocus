import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { notFound } from "next/navigation";
import Link from "next/link";
import ClientCall from "./ClientCall";
import SessionCountdown from "./SessionCountdown";
import { CALL_JOIN_GRACE_MINUTES, isWithinCallWindow } from "@/lib/sessionAccess";

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

  // Look up the session partner's profile
  type PartnerInfo = { name?: string; firstname?: string; lastname?: string; username?: string };
  const partnerId = participants.find((p) => p.user_id !== currentUserId)?.user_id;
  const partner: PartnerInfo | null = partnerId
    ? (await db.collection("users").findOne(
        { _id: new ObjectId(partnerId) },
        { projection: { name: 1, firstname: 1, lastname: 1, username: 1 } }
      ) as PartnerInfo | null)
    : null;
  const partnerName = partner
    ? [partner.firstname, partner.lastname].filter(Boolean).join(" ") || partner.name || "Partner"
    : null;

  // Join window: from 5 minutes before start until 5 minutes after end.
  const now = new Date();
  const startTime = new Date(s.start_time);
  const endTime = new Date(s.end_time);
  const canJoinNow = isWithinCallWindow(startTime, endTime, now, CALL_JOIN_GRACE_MINUTES);
  const hasEnded = now > new Date(endTime.getTime() + CALL_JOIN_GRACE_MINUTES * 60 * 1000);

  if (canJoinNow) {
    return <ClientCall sessionId={id} fullScreen />;
  }

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
      <div className="mt-4 space-y-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/60">
        <div className="truncate text-sm text-gray-700 dark:text-gray-300">ID: {id}</div>
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

      {/* Session Partner */}
      {partnerName && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-medium text-white">
            {partnerName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {partnerName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Session partner</p>
          </div>
          {partner?.username && (
            <Link
              href={`/u/${partner.username}`}
              className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              View Profile
            </Link>
          )}
        </div>
      )}

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
      ) : (
        <SessionCountdown
          startTime={s.start_time.toISOString()}
          sessionId={id}
        />
      )}
    </div>
  );
}
