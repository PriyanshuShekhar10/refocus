export type SessionParticipantDoc = {
  user_id: string;
  joined_at?: Date | string;
  quiet?: boolean;
  label?: string | null;
};

type SessionLabelSource = {
  name?: string | null;
  owner_id?: string;
  session_participants?: SessionParticipantDoc[] | null;
};

/** Personal session label for a viewer (null = use default title in UI). */
export function resolveSessionDisplayName(
  session: SessionLabelSource,
  viewerUserId: string | null | undefined,
): string | null {
  if (!viewerUserId) return null;

  const participant = (session.session_participants ?? []).find(
    (p) => String(p.user_id) === String(viewerUserId),
  );
  const personal = participant?.label?.trim();
  if (personal) return personal;

  // Legacy shared name: only show to the owner who set it before per-user labels.
  if (
    session.owner_id &&
    String(session.owner_id) === String(viewerUserId) &&
    session.name?.trim()
  ) {
    return session.name.trim();
  }

  return null;
}

export function normalizeSessionLabel(
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim().slice(0, 120);
  return trimmed || null;
}

export function applyParticipantLabel(
  participants: SessionParticipantDoc[],
  userId: string,
  label: string | null,
): SessionParticipantDoc[] {
  return participants.map((p) =>
    String(p.user_id) === String(userId) ? { ...p, label } : p,
  );
}
