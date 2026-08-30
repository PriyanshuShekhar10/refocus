import { Db, ObjectId } from "mongodb";
import { areUsersBlocked } from "@/lib/blocking";
import { isEmailVerified } from "@/lib/emailVerification";
import { sendCommunityMentionEmail } from "@/lib/email/sendCommunityMentionEmail";
import type { CommunityMentionEmailKind } from "@/lib/email/communityMentionTemplates";
import { userDisplayName } from "@/lib/communityMentions";
import { getAppUrl } from "@/lib/site";

type Recipient = {
  id: string;
  email: string;
  greetingName?: string | null;
};

type MentionRecipientUser = {
  _id: ObjectId;
  email?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  name?: string | null;
  username?: string | null;
  emailVerified?: Date | string | null;
  preferences?: { emailCommunityMentions?: boolean } | null;
};

async function loadRecipients(
  db: Db,
  recipientIds: string[],
): Promise<Recipient[]> {
  const unique = [...new Set(recipientIds.filter(Boolean))];
  if (unique.length === 0) return [];

  const users = (await db
    .collection("users")
    .find(
      { _id: { $in: unique.map((id) => new ObjectId(id)) } },
      {
        projection: {
          email: 1,
          firstname: 1,
          lastname: 1,
          name: 1,
          username: 1,
          emailVerified: 1,
          preferences: 1,
        },
      },
    )
    .toArray()) as MentionRecipientUser[];

  const recipients: Recipient[] = [];
  for (const user of users) {
    if (user.preferences?.emailCommunityMentions === false) continue;
    const email = typeof user.email === "string" ? user.email.trim() : "";
    if (!email) continue;
    if (!isEmailVerified(user.emailVerified)) continue;
    recipients.push({
      id: String(user._id),
      email,
      greetingName: userDisplayName(user),
    });
  }
  return recipients;
}

/** Fire-and-forget safe: never throws to the request path. */
export async function notifyCommunityMentions(input: {
  db: Db;
  kind: CommunityMentionEmailKind;
  actorUserId: string;
  actorName: string;
  contentPreview: string;
  recipientIds: string[];
}): Promise<void> {
  try {
    const recipientIds = [...new Set(input.recipientIds)].filter(
      (id) => id && id !== input.actorUserId,
    );
    if (recipientIds.length === 0) return;

    const eligible: string[] = [];
    for (const recipientId of recipientIds) {
      if (await areUsersBlocked(input.actorUserId, recipientId)) continue;
      eligible.push(recipientId);
    }
    if (eligible.length === 0) return;

    const recipients = await loadRecipients(input.db, eligible);
    if (recipients.length === 0) return;

    const communityUrl = `${getAppUrl()}/dashboard?tab=community`;
    const settingsUrl = `${getAppUrl()}/dashboard?tab=settings`;
    await Promise.all(
      recipients.map((recipient) =>
        sendCommunityMentionEmail({
          email: recipient.email,
          firstName: recipient.greetingName,
          kind: input.kind,
          actorName: input.actorName,
          contentPreview: input.contentPreview,
          communityUrl,
          settingsUrl,
        }),
      ),
    );
  } catch (err) {
    console.error("[email] notifyCommunityMentions failed:", err);
  }
}
