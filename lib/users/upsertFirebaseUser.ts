import type { DecodedIdToken } from "firebase-admin/auth";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { resolveAvatarUrl } from "@/lib/userAvatar";
import { generateUsername } from "@/lib/users/generateUsername";
import {
  DISPOSABLE_EMAIL_ERROR,
  isDisposableEmail,
} from "@/lib/disposableEmail";

export type AuthProviderKey = "google";

export type UpsertFirebaseUserResult = {
  id: string;
  email: string;
  name?: string;
  image?: string;
  isNewUser: boolean;
};

type UserDoc = {
  _id: ObjectId;
  email: string;
  username?: string;
  name?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  hashedPassword?: string;
  avatar_url?: string | null;
  image?: string | null;
  emailVerified?: Date | null;
  firebaseUid?: string;
  authProviders?: Partial<Record<AuthProviderKey, string>>;
};

function parseProvider(
  firebase: DecodedIdToken["firebase"],
): AuthProviderKey | null {
  if (firebase?.sign_in_provider === "google.com") return "google";
  return null;
}

function resolveEmailVerified(
  decoded: DecodedIdToken,
  provider: AuthProviderKey | null,
): Date | null {
  if (provider === "google") return new Date();
  if (decoded.email_verified === true) return new Date();
  return null;
}

function splitDisplayName(displayName?: string | null): {
  firstname: string | null;
  lastname: string | null;
  fullName: string | null;
} {
  const trimmed = displayName?.trim();
  if (!trimmed) {
    return { firstname: null, lastname: null, fullName: null };
  }
  const parts = trimmed.split(/\s+/);
  const firstname = parts[0] ?? null;
  const lastname = parts.length > 1 ? parts.slice(1).join(" ") : null;
  return {
    firstname,
    lastname,
    fullName: trimmed,
  };
}

export async function upsertFirebaseUser(
  decoded: DecodedIdToken,
  displayName?: string | null,
): Promise<UpsertFirebaseUserResult> {
  const email = decoded.email?.trim().toLowerCase();
  if (!email) {
    throw new Error(
      "No email returned from the sign-in provider. Try another method or contact support.",
    );
  }

  const provider = parseProvider(decoded.firebase);
  const uid = decoded.uid;
  const picture =
    typeof decoded.picture === "string" && decoded.picture.trim()
      ? decoded.picture.trim()
      : null;
  const tokenName =
    typeof decoded.name === "string" && decoded.name.trim()
      ? decoded.name.trim()
      : null;
  const resolvedName = displayName?.trim() || tokenName;
  const { firstname, lastname, fullName } = splitDisplayName(resolvedName);
  const emailVerified = resolveEmailVerified(decoded, provider);

  const db = await getDb();
  const usersCol = db.collection<UserDoc>("users");

  const existing = await usersCol.findOne({ email });

  if (existing) {
    const providerPatch: Partial<Record<AuthProviderKey, string>> = {
      ...(existing.authProviders ?? {}),
    };
    if (provider) {
      providerPatch[provider] = uid;
    }

    const $set: Record<string, unknown> = {
      updatedAt: new Date(),
      firebaseUid: uid,
      authProviders: providerPatch,
    };

    if (!existing.firstname && firstname) $set.firstname = firstname;
    if (!existing.lastname && lastname) $set.lastname = lastname;
    if (!existing.name && fullName) $set.name = fullName;
    if (!existing.avatar_url && !existing.image && picture) {
      $set.image = picture;
    }
    if (emailVerified && !existing.emailVerified) {
      $set.emailVerified = emailVerified;
    }

    await usersCol.updateOne({ _id: existing._id }, { $set });

    const image = resolveAvatarUrl({
      avatar_url: existing.avatar_url,
      image: (picture && !existing.avatar_url && !existing.image
        ? picture
        : existing.image) ?? null,
    });

    return {
      id: String(existing._id),
      email: existing.email,
      name: existing.name ?? fullName ?? undefined,
      image: image ?? undefined,
      isNewUser: false,
    };
  }

  if (isDisposableEmail(email)) {
    throw new Error(DISPOSABLE_EMAIL_ERROR);
  }

  const username = await generateUsername(usersCol, email);
  const now = new Date();
  const authProviders: Partial<Record<AuthProviderKey, string>> = {};
  if (provider) {
    authProviders[provider] = uid;
  }

  const doc = {
    email,
    username,
    name: fullName,
    firstname,
    lastname,
    image: picture,
    firebaseUid: uid,
    authProviders,
    emailVerified,
    createdAt: now,
    updatedAt: now,
  };

  const res = await usersCol.insertOne(doc as never);
  const userId = String(res.insertedId);

  try {
    const { createWelcomeAnnouncement } = await import(
      "@/lib/welcomeAnnouncements"
    );
    await createWelcomeAnnouncement({
      userId,
      username,
      displayName: fullName || firstname || username,
      avatarUrl: picture,
      createdAt: now,
    });
  } catch (err) {
    console.error("[upsertFirebaseUser] Welcome announcement failed:", err);
  }

  return {
    id: userId,
    email,
    name: fullName ?? undefined,
    image: picture ?? undefined,
    isNewUser: true,
  };
}
