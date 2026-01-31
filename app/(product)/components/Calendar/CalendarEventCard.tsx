import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { CalendarEvent } from "@/types/calendar";

interface CalendarEventCardProps {
  event: CalendarEvent;
  isBooked: boolean;
  isOwner: boolean;
  otherQuiet: boolean;
  tooltip: { label: string; email?: string } | null;
  top: number;
  height: number;
  onBook: (e: React.MouseEvent) => void;
  onDetails: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  /** When provided and user is participant (booked, not owner), shows Leave button */
  onLeave?: () => void;
}

export function CalendarEventCard({
  event,
  isBooked,
  isOwner,
  otherQuiet,
  tooltip,
  top,
  height,
  onBook,
  onDetails,
  onDelete,
  onLeave,
}: CalendarEventCardProps) {
  const s = new Date(event.start);

  return (
    <div className="absolute inset-x-2 z-20" style={{ top }}>
      <div
        style={{
          height,
          backgroundColor:
            event.color ||
            (isBooked
              ? typeof window !== "undefined" &&
                window.matchMedia &&
                window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "#374151"
                : "#d1d5db"
              : typeof window !== "undefined" &&
                  window.matchMedia &&
                  window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "#312e81"
                : "#e0e7ff"),
        }}
        className={`relative rounded-lg p-2 flex flex-col justify-between shadow-sm overflow-hidden ${
          isBooked
            ? "border border-gray-300 dark:border-gray-600"
            : "border border-indigo-200 hover:border-indigo-400 cursor-pointer dark:border-indigo-900"
        }`}
        title={
          tooltip
            ? `${tooltip.label}${tooltip.email ? `\n${tooltip.email}` : ""}`
            : undefined
        }
        onClick={(evt) => {
          evt.stopPropagation();
          if (!isBooked && !isOwner) onBook(evt);
          else onDetails(evt);
        }}
      >
        {/* Action button - top right corner */}
        {isOwner ? (
          <button
            className="absolute top-1 right-1 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e);
            }}
            title="Delete session"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        ) : !isBooked ? (
          <button
            className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onBook(e);
            }}
          >
            Book
          </button>
        ) : onLeave ? (
          <button
            className="absolute top-1 right-1 p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onLeave();
            }}
            title="Leave session"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        ) : null}

        <div className="pr-8">
          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 leading-tight">
            {s.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
              timeZone: "Asia/Kolkata",
            })}
          </p>
          <p
            className={`text-xs font-semibold leading-tight ${
              isBooked
                ? "text-gray-900 dark:text-white"
                : "text-gray-800 dark:text-white"
            }`}
          >
            {event.durationMin} min • {event.sessionType}
          </p>
        </div>

        <div className="flex items-center justify-between mt-1">
          <span
            className={`text-xs font-medium ${
              isBooked
                ? "text-gray-800 dark:text-indigo-200"
                : "text-indigo-700 dark:text-indigo-300"
            }`}
          >
            {event.name
              ? event.name
              : isOwner
                ? "Your session"
                : isBooked
                  ? "Booked"
                  : "Partner needed"}
          </span>
          {event.participants && event.participants.length > 0 && (
            <div className="flex -space-x-1 ml-1">
              {event.participants.slice(0, 2).map((participant, idx) => {
                const displayName =
                  [participant.firstname, participant.lastname]
                    .filter(Boolean)
                    .join(" ") ||
                  participant.email ||
                  participant.user_id ||
                  "User";
                const initials = displayName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <Avatar
                    key={participant.user_id || idx}
                    className="h-4 w-4 border border-white"
                  >
                    {participant.avatar_url ? (
                      <AvatarImage
                        src={participant.avatar_url}
                        alt={displayName}
                      />
                    ) : null}
                    <AvatarFallback className="text-[8px] font-medium bg-indigo-100 text-indigo-600">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                );
              })}
              {event.participants.length > 2 && (
                <div className="h-4 w-4 rounded-full bg-gray-200 border border-white flex items-center justify-center">
                  <span className="text-[6px] font-medium text-gray-600">
                    +{event.participants.length - 2}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        {isBooked && otherQuiet && (
          <span className="inline-flex items-center rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-100 mt-1">
            🔇 Quiet
          </span>
        )}
      </div>
    </div>
  );
}
