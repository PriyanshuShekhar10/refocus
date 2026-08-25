import { ObjectId, type Db } from "mongodb";
import { sendSessionCancelledEmail } from "@/lib/email/sendSessionCancelledEmail";
import { formatSessionTimeIST } from "@/lib/sessionReminders";
import { getAppUrl } from "@/lib/site";
import { resolveSessionDisplayName } from "@/lib/sessionPersonalization";

type Participant = { user_id: string; joined_at?: Date | string; quiet?: boolean };

type SessionLike = {
  _id: ObjectId | string;
  owner_id: string;
  start_time: Date | string;
  duration_min?: number;
  session_type?: string;
  name?: string | null;
  session_participants?: Participant[];
};

type UserRow = {
  _id: ObjectId;
  email?: string | null;
  firstname?: string | null;
  name?: string | null;
  preferences?: { timezone?: string };
};

function displayName(user: UserRow | null | undefined): string | null {
  if (!user) return null;
  return user.firstname?.trim() || user.name?.trim() || null;
}

function sessionTitleFor(session: SessionLike, userId: string): string {
  const personal = resolveSessionDisplayName(
    {
      name: session.name,
      owner_id: session.owner_id,
      session_participants: session.session_participants,
    },
    userId,
  );
  if (personal) return personal;
  const type = (session.session_type ?? "focus").replace("-", " ");
  return `${type} · ${session.duration_min ?? 50} min`;
}

/**
 * Email the remaining partner a personal note when someone deletes or leaves
 * a booked session. No-op without a partner, email, or message.
 */
export async function notifySessionCancelled(
  db: Db,
  input: {
    session: SessionLike;
    actorUserId: string;
    message: string;
    kind: "delete" | "leave";
  },
): Promise<void> {
  try {
    const actorId = String(input.actorUserId);
    const partnerId = (input.session.session_participants ?? [])
      .map((p) => String(p.user_id))
      .find((id) => id !== actorId);
    if (!partnerId || !ObjectId.isValid(partnerId) || !ObjectId.isValid(actorId)) {
      return;
    }

    const users = (await db
      .collection<UserRow>("users")
      .find({ _id: { $in: [new ObjectId(partnerId), new ObjectId(actorId)] } })
      .project({ email: 1, firstname: 1, name: 1, preferences: 1 })
      .toArray()) as UserRow[];

    const byId = new Map(users.map((u) => [String(u._id), u]));
    const partner = byId.get(partnerId);
    const actor = byId.get(actorId);
    const email = partner?.email?.trim();
    if (!email) return;

    const tz =
      partner?.preferences?.timezone && partner.preferences.timezone !== "auto"
        ? partner.preferences.timezone
        : "Asia/Kolkata";

    await sendSessionCancelledEmail({
      email,
      firstName: displayName(partner),
      fromName: displayName(actor) || "Your partner",
      fromEmail: actor?.email?.trim() || null,
      message: input.message,
      sessionTitle: sessionTitleFor(input.session, partnerId),
      startsAtLabel: formatSessionTimeIST(new Date(input.session.start_time), tz),
      calendarUrl: `${getAppUrl()}/sessions`,
      kind: input.kind,
    });
  } catch (err) {
    console.error("[email] notifySessionCancelled failed:", err);
  }
}
