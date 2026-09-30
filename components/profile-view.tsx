"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Pencil, Check, X, Plus, Copy, MapPin, Globe, AtSign, Camera, Trash2 } from "lucide-react";
import {
  DButton,
  Field,
  DInput,
  DTextarea,
  designStyles,
} from "@/components/design";
import { ProfileStats } from "@/components/profile-stats";
import { AttendanceHighlight } from "@/components/attendance-highlight";
import {
  EmailVerificationBanner,
  EmailVerifiedBadge,
} from "@/components/email-verification-banner";
import { AvatarCropModal } from "@/components/avatar-crop-modal";
import { PageRefreshButton } from "@/components/page-refresh";

const ABOUT_ME_PROMPTS = [
  "My most important project today",
  "My goal for my next session is",
  "Where I am working",
  "Music I'm listening to",
  "My headline or tagline",
  "Book I'm currently reading",
  "Book I want to read next",
  "Book that's had the biggest impact on my life",
  "Influencers with biggest impact on my life",
  "Favorite podcast",
  "My most productive time of day is",
  "My least productive time of day is",
  "The task or type of work I dislike most",
  "Productivity app I couldn't live without",
  "Favorite method of procrastination",
  "My best sessions have this in common",
  "I love it when my Refocus partner does this",
  "My biggest pet peeve is when my Refocus partner does this",
  "Top 1-2 tasks I use Refocus for most often",
  "If I could add or change one thing about Refocus, it would be",
] as const;

type AboutMeKey = (typeof ABOUT_ME_PROMPTS)[number];

function emptyAboutMe(): Record<AboutMeKey, string> {
  return ABOUT_ME_PROMPTS.reduce(
    (acc, prompt) => {
      acc[prompt] = "";
      return acc;
    },
    {} as Record<AboutMeKey, string>,
  );
}

type UserInfo = {
  email?: string;
  emailVerified?: boolean;
  username?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  name?: string | null;
  about?: string | null;
  interests?: string[];
  location?: string | null;
  website?: string | null;
  aboutMe?: Partial<Record<AboutMeKey, string>> | null;
  avatarUrl?: string | null;
  attendance?: { percent: number; booked: number; attended: number } | null;
};

type EditableFields = {
  username: string;
  firstname: string;
  lastname: string;
  about: string;
  interests: string[];
  location: string;
  website: string;
  aboutMe: Record<AboutMeKey, string>;
};

type Props = {
  /** When true, omit the page-level Shell wrapper (used inside the dashboard
   *  which already controls its own background). */
  embedded?: boolean;
};

export function ProfileView({ embedded = false }: Props) {
  const { update: updateSession } = useSession();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newInterest, setNewInterest] = useState("");
  const [addedPrompts, setAddedPrompts] = useState<AboutMeKey[]>([]);
  const [copied, setCopied] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [editFields, setEditFields] = useState<EditableFields>({
    username: "",
    firstname: "",
    lastname: "",
    about: "",
    interests: [],
    location: "",
    website: "",
    aboutMe: emptyAboutMe(),
  });

  const loadUser = useCallback(async () => {
    try {
      const res = await fetch("/api/users/me");
      if (!res.ok) return;
      const data = await res.json();
      setUser(data?.user || null);
      if (data?.user) {
        setEditFields({
          username: data.user.username || "",
          firstname: data.user.firstname || "",
          lastname: data.user.lastname || "",
          about: data.user.about || "",
          interests: data.user.interests || [],
          location: data.user.location || "",
          website: data.user.website || "",
          aboutMe: {
            ...emptyAboutMe(),
            ...(data.user.aboutMe || {}),
          },
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleSave = async () => {
    if (usernameStatus === "taken" || usernameStatus === "checking") return;
    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFields),
      });
      if (res.ok) {
        setUsernameStatus("idle");
        await loadUser();
        setIsEditing(false);
        setAddedPrompts([]);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setEditFields({
        username: user.username || "",
        firstname: user.firstname || "",
        lastname: user.lastname || "",
        about: user.about || "",
        interests: user.interests || [],
        location: user.location || "",
        website: user.website || "",
        aboutMe: {
          ...emptyAboutMe(),
          ...(user.aboutMe || {}),
        },
      });
    }
    setUsernameStatus("idle");
    setIsEditing(false);
    setAddedPrompts([]);
  };

  // Debounced username availability check
  useEffect(() => {
    if (!isEditing) return;
    const trimmed = editFields.username.trim().toLowerCase();
    if (!trimmed || trimmed === (user?.username || "")) {
      setUsernameStatus("idle");
      return;
    }
    if (!/^[a-z0-9_-]{3,20}$/.test(trimmed)) {
      setUsernameStatus("taken");
      return;
    }
    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/users/username?q=${encodeURIComponent(trimmed)}`
        );
        const data = await res.json();
        setUsernameStatus(data.available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [editFields.username, isEditing, user?.username]);

  const addInterest = () => {
    const trimmed = newInterest.trim();
    if (trimmed && !editFields.interests.includes(trimmed)) {
      setEditFields((prev) => ({
        ...prev,
        interests: [...prev.interests, trimmed],
      }));
      setNewInterest("");
    }
  };

  const removeInterest = (interest: string) => {
    setEditFields((prev) => ({
      ...prev,
      interests: prev.interests.filter((i) => i !== interest),
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addInterest();
    }
  };

  const copyProfileLink = () => {
    if (!user?.username) return;
    navigator.clipboard.writeText(
      `${window.location.origin}/u/${user.username}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleAvatarPick = () => {
    setAvatarError(null);
    avatarInputRef.current?.click();
  };

  const uploadAvatarFile = async (file: File) => {
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const res = await fetch("/api/users/me/avatar", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAvatarError(data.error || "Upload failed");
        return;
      }
      setUser((prev) =>
        prev ? { ...prev, avatarUrl: data.avatarUrl ?? prev.avatarUrl } : prev,
      );
      await updateSession({ image: data.avatarUrl ?? null });
    } catch {
      setAvatarError("Upload failed");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setAvatarError(null);
    const url = URL.createObjectURL(file);
    setCropImageUrl(url);
  };

  const closeCropModal = () => {
    if (cropImageUrl) URL.revokeObjectURL(cropImageUrl);
    setCropImageUrl(null);
  };

  const handleCropComplete = async (file: File) => {
    closeCropModal();
    await uploadAvatarFile(file);
  };

  const handleAvatarRemove = async () => {
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const res = await fetch("/api/users/me/avatar", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAvatarError(data.error || "Could not remove photo");
        return;
      }
      setUser((prev) =>
        prev ? { ...prev, avatarUrl: data.avatarUrl ?? null } : prev,
      );
      await updateSession({ image: data.avatarUrl ?? null });
    } catch {
      setAvatarError("Could not remove photo");
    } finally {
      setAvatarUploading(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%" }}
      >
        <div className={designStyles.shimmer} style={{ height: 84 }} />
        <div className={designStyles.shimmer} style={{ height: 180 }} />
        <div className={designStyles.shimmer} style={{ height: 120 }} />
      </div>
    );
  }

  const firstname = user?.firstname ?? "";
  const lastname = user?.lastname ?? "";
  const displayName =
    [firstname, lastname].filter(Boolean).join(" ") ||
    user?.name ||
    user?.email ||
    "User";
  const initials = `${(
    firstname?.[0] ||
    user?.name?.[0] ||
    user?.email?.[0] ||
    "U"
  ).toUpperCase()}${(lastname?.[0] || "").toUpperCase()}`;

  const usernameHint =
    usernameStatus === "checking"
      ? "Checking availability…"
      : undefined;
  const usernameError =
    usernameStatus === "taken"
      ? editFields.username.length < 3
        ? "Username must be at least 3 characters"
        : "Username is already taken"
      : undefined;
  const usernameOk =
    usernameStatus === "available" ? "Username is available" : undefined;
  const myAttendance =
    user?.attendance &&
    typeof user.attendance.percent === "number" &&
    user.attendance.booked > 0
      ? user.attendance
      : null;

  const answeredPrompts = ABOUT_ME_PROMPTS.filter(
    (prompt) => (user?.aboutMe?.[prompt] || "").trim().length > 0,
  );
  const draftPrompts = ABOUT_ME_PROMPTS.filter(
    (prompt) =>
      addedPrompts.includes(prompt) ||
      (editFields.aboutMe[prompt] || "").trim().length > 0,
  );
  const unansweredPrompts = ABOUT_ME_PROMPTS.filter(
    (prompt) => !draftPrompts.includes(prompt),
  );
  const websiteHref = user?.website
    ? user.website.startsWith("http")
      ? user.website
      : `https://${user.website}`
    : undefined;
  const websiteLabel = user?.website?.replace(/^https?:\/\//, "");
  const metaDot = (
    <span
      aria-hidden
      style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--ink-mute)" }}
    />
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        width: "100%",
        maxWidth: 980,
        marginInline: embedded ? 0 : "auto",
      }}
    >
      {user && user.emailVerified === false && (
        <EmailVerificationBanner email={user.email} />
      )}

      {/* Header */}
      <header
        className={designStyles.card}
        style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20 }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: "none" }}>
          <div style={{ position: "relative" }}>
            <div
              className={`${designStyles.avatar} ${designStyles.avatarLg}`}
              style={{
                overflow: "hidden",
                opacity: avatarUploading ? 0.65 : 1,
                transition: "opacity .2s",
              }}
              aria-hidden={!user?.avatarUrl}
            >
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                initials
              )}
            </div>
            <button
              type="button"
              onClick={handleAvatarPick}
              disabled={avatarUploading}
              aria-label="Change profile photo"
              title="Change photo"
              style={{
                position: "absolute",
                right: -4,
                bottom: -4,
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "2px solid var(--card)",
                background: "var(--rf-primary)",
                color: "var(--rf-on-primary)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: avatarUploading ? "wait" : "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,.12)",
              }}
            >
              <Camera size={14} />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarChange}
              style={{ display: "none" }}
              aria-hidden
              tabIndex={-1}
            />
          </div>
          {user?.avatarUrl && (
            <button
              type="button"
              onClick={handleAvatarRemove}
              disabled={avatarUploading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                color: "var(--ink-mute)",
                background: "transparent",
                border: "none",
                cursor: avatarUploading ? "wait" : "pointer",
                padding: 0,
              }}
            >
              <Trash2 size={12} /> Remove photo
            </button>
          )}
          {avatarError && (
            <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, maxWidth: 120, textAlign: "center" }}>
              {avatarError}
            </p>
          )}
        </div>

        <div style={{ flex: "1 1 280px", minWidth: 0 }}>
          <h1
            style={{
              fontSize: "clamp(24px, 4vw, 32px)",
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
              fontWeight: 500,
              margin: 0,
            }}
          >
            {displayName}
          </h1>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "6px 12px",
              marginTop: 8,
              fontSize: 13,
              color: "var(--ink-soft)",
            }}
          >
            {user?.username && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                <Link href={`/u/${user.username}`} style={{ color: "var(--ink-soft)", textDecoration: "none" }}>
                  @{user.username}
                </Link>
                <button
                  type="button"
                  onClick={copyProfileLink}
                  title="Copy profile link"
                  aria-label="Copy profile link"
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--ink-mute)",
                    display: "inline-flex",
                    padding: 4,
                    borderRadius: 6,
                  }}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </span>
            )}
            {user?.location ? (
              <>
                {user?.username ? metaDot : null}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                  <MapPin size={13} />
                  {user.location}
                </span>
              </>
            ) : null}
            {websiteHref ? (
              <>
                {user?.username || user?.location ? metaDot : null}
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={designStyles.link}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}
                >
                  <Globe size={13} />
                  {websiteLabel}
                </a>
              </>
            ) : null}
          </div>
          {user?.email && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 6,
              }}
            >
              <p style={{ fontSize: 12, color: "var(--ink-mute)", margin: 0 }}>
                {user.email}
              </p>
              {user.emailVerified ? (
                <EmailVerifiedBadge />
              ) : (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "var(--rf-amber-bg)",
                    color: "var(--rf-amber-ink)",
                  }}
                >
                  Unverified
                </span>
              )}
            </div>
          )}
          {!isEditing && myAttendance ? (
            <div style={{ marginTop: 14 }}>
              <AttendanceHighlight attendance={myAttendance} />
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
          {!isEditing ? (
            <DButton variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil size={14} /> Edit profile
            </DButton>
          ) : (
            <>
              <DButton variant="quiet" size="sm" onClick={handleCancel} disabled={saving}>
                Cancel
              </DButton>
              <DButton
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={
                  saving ||
                  usernameStatus === "taken" ||
                  usernameStatus === "checking"
                }
              >
                <Check size={14} /> {saving ? "Saving…" : "Save"}
              </DButton>
            </>
          )}
          <PageRefreshButton onRefresh={loadUser} />
        </div>
      </header>

      {!isEditing ? (
        <>
          <ProfileStats />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
              gap: 20,
              alignItems: "start",
            }}
          >
            <section className={designStyles.card} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <h2 className={designStyles.cardTitle}>About</h2>
                <p className={designStyles.cardSub}>
                  A short bio that shows on your public profile.
                </p>
                <p
                  style={{
                    marginTop: 14,
                    fontSize: 14.5,
                    lineHeight: 1.6,
                    color: user?.about ? "var(--ink)" : "var(--ink-mute)",
                    textWrap: "pretty",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {user?.about || "No bio added yet."}
                </p>
              </div>
              <div style={{ paddingTop: 18, borderTop: "1px solid var(--line)" }}>
                <h2 style={{ fontSize: 15, fontWeight: 500, letterSpacing: "-0.01em", margin: 0 }}>
                  Interests
                </h2>
                <p style={{ marginTop: 2, fontSize: 12.5, color: "var(--ink-soft)" }}>
                  Used by smart matching to find a partner on your wavelength.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  {(user?.interests?.length ?? 0) > 0 ? (
                    user?.interests?.map((interest) => (
                      <span key={interest} className={`${designStyles.tag} ${designStyles.tagAccent}`}>
                        {interest}
                      </span>
                    ))
                  ) : (
                    <p style={{ fontSize: 14, color: "var(--ink-mute)", margin: 0 }}>
                      No interests added yet.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className={designStyles.card}>
              <h2 className={designStyles.cardTitle}>Basic info</h2>
              <p className={designStyles.cardSub}>Name, handle, and how partners find you.</p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "18px 20px",
                  marginTop: 18,
                }}
              >
                <div style={{ gridColumn: "1 / -1" }}>
                  <ReadField label="Username" value={user?.username ? `@${user.username}` : ""} />
                </div>
                <ReadField label="First name" value={firstname} />
                <ReadField label="Last name" value={lastname} />
                <ReadField label="Location" value={user?.location || ""} />
                <ReadField
                  label="Website"
                  value={user?.website || ""}
                  link={websiteHref}
                  display={websiteLabel}
                />
              </div>
            </section>
          </div>

          <section className={designStyles.card}>
            <h2 className={designStyles.cardTitle}>About me prompts</h2>
            <p className={designStyles.cardSub}>
              Optional details to help partners understand your style and context.
            </p>
            {answeredPrompts.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
                  gap: 12,
                  marginTop: 18,
                }}
              >
                {answeredPrompts.map((prompt) => (
                  <div
                    key={prompt}
                    style={{
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: "var(--bg)",
                      border: "1px solid var(--line-soft)",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>{prompt}</div>
                    <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                      {user?.aboutMe?.[prompt]}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 14, color: "var(--ink-mute)", marginTop: 18 }}>
                No prompt answers added yet.
              </p>
            )}
          </section>
        </>
      ) : (
        <>
          <section className={designStyles.card}>
            <h2 className={designStyles.cardTitle}>Basic info</h2>
            <p className={designStyles.cardSub}>Name, handle, and how partners find you.</p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
                gap: 16,
                marginTop: 18,
              }}
            >
              <div style={{ gridColumn: "1 / -1" }}>
                <Field
                  label="Username"
                  htmlFor="username"
                  error={usernameError}
                  ok={usernameOk}
                  hint={usernameHint}
                >
                  <DInput
                    id="username"
                    leading={<AtSign size={14} />}
                    value={editFields.username}
                    onChange={(e) =>
                      setEditFields((prev) => ({
                        ...prev,
                        username: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_-]/g, ""),
                      }))
                    }
                    placeholder="yourname"
                    maxLength={20}
                  />
                </Field>
              </div>
              <Field label="First name" htmlFor="firstname">
                <DInput
                  id="firstname"
                  value={editFields.firstname}
                  onChange={(e) =>
                    setEditFields((prev) => ({ ...prev, firstname: e.target.value }))
                  }
                  placeholder="First name"
                />
              </Field>
              <Field label="Last name" htmlFor="lastname">
                <DInput
                  id="lastname"
                  value={editFields.lastname}
                  onChange={(e) =>
                    setEditFields((prev) => ({ ...prev, lastname: e.target.value }))
                  }
                  placeholder="Last name"
                />
              </Field>
              <Field label="Location" htmlFor="location">
                <DInput
                  id="location"
                  leading={<MapPin size={14} />}
                  value={editFields.location}
                  onChange={(e) =>
                    setEditFields((prev) => ({ ...prev, location: e.target.value }))
                  }
                  placeholder="City, Country"
                />
              </Field>
              <Field label="Website" htmlFor="website">
                <DInput
                  id="website"
                  leading={<Globe size={14} />}
                  value={editFields.website}
                  onChange={(e) =>
                    setEditFields((prev) => ({ ...prev, website: e.target.value }))
                  }
                  placeholder="yourwebsite.com"
                />
              </Field>
            </div>
          </section>

          <section className={designStyles.card} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <h2 className={designStyles.cardTitle}>About</h2>
              <p className={designStyles.cardSub}>A short bio that shows on your public profile.</p>
            </div>
            <DTextarea
              value={editFields.about}
              onChange={(e) =>
                setEditFields((prev) => ({ ...prev, about: e.target.value }))
              }
              placeholder="What do you do — and what's a session with you like?"
              rows={4}
            />
            <div style={{ paddingTop: 14, borderTop: "1px solid var(--line)" }}>
              <h2 style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>Interests</h2>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <DInput
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add an interest…"
              />
              <DButton
                type="button"
                variant="ghost"
                onClick={addInterest}
                disabled={!newInterest.trim()}
              >
                <Plus size={14} /> Add
              </DButton>
            </div>
            {editFields.interests.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {editFields.interests.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => removeInterest(interest)}
                    className={`${designStyles.tag} ${designStyles.tagRemovable}`}
                  >
                    {interest}
                    <X size={11} />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className={designStyles.card} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "flex-end",
                gap: 12,
              }}
            >
              <div>
                <h2 className={designStyles.cardTitle}>About me prompts</h2>
                <p className={designStyles.cardSub}>
                  Answer the ones you like; empty prompts stay hidden.
                </p>
              </div>
              {unansweredPrompts.length > 0 ? (
                <select
                  value=""
                  onChange={(e) => {
                    const prompt = e.target.value as AboutMeKey;
                    if (prompt) setAddedPrompts((prev) => [...prev, prompt]);
                  }}
                  aria-label="Add a prompt"
                  style={{
                    height: 36,
                    maxWidth: 320,
                    padding: "0 12px",
                    borderRadius: 999,
                    border: "1px solid var(--line)",
                    background: "var(--card)",
                    font: "inherit",
                    fontSize: 13,
                    color: "var(--ink)",
                  }}
                >
                  <option value="">+ Add a prompt</option>
                  {unansweredPrompts.map((prompt) => (
                    <option key={prompt} value={prompt}>
                      {prompt}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
            {draftPrompts.map((prompt) => {
              const idx = ABOUT_ME_PROMPTS.indexOf(prompt);
              return (
                <div key={prompt} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--ink-soft)",
                    }}
                  >
                    <label htmlFor={`aboutme-${idx}`}>{prompt}</label>
                    <button
                      type="button"
                      onClick={() => {
                        setAddedPrompts((prev) => prev.filter((p) => p !== prompt));
                        setEditFields((prev) => ({
                          ...prev,
                          aboutMe: { ...prev.aboutMe, [prompt]: "" },
                        }));
                      }}
                      style={{
                        border: 0,
                        background: "transparent",
                        font: "inherit",
                        fontSize: 12,
                        color: "var(--ink-mute)",
                        cursor: "pointer",
                        flex: "none",
                      }}
                    >
                      Remove
                    </button>
                  </span>
                  <DTextarea
                    id={`aboutme-${idx}`}
                    value={editFields.aboutMe[prompt]}
                    onChange={(e) =>
                      setEditFields((prev) => ({
                        ...prev,
                        aboutMe: { ...prev.aboutMe, [prompt]: e.target.value },
                      }))
                    }
                    rows={2}
                    placeholder="Optional"
                  />
                </div>
              );
            })}
          </section>
        </>
      )}

      {cropImageUrl && (
        <AvatarCropModal
          imageUrl={cropImageUrl}
          onCancel={closeCropModal}
          onComplete={handleCropComplete}
        />
      )}
    </div>
  );
}

function ReadField({
  label,
  value,
  icon,
  link,
  display,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  link?: string;
  display?: string;
}) {
  return (
    <div>
      <p
        style={{
          fontSize: 12,
          color: "var(--ink-mute)",
          margin: 0,
          letterSpacing: 0.005,
        }}
      >
        {label}
      </p>
      {value ? (
        link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className={designStyles.link}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 4,
              fontSize: 14,
            }}
          >
            {icon}
            {display || value}
          </a>
        ) : (
          <p
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 4,
              fontSize: 14,
              color: "var(--ink)",
            }}
          >
            {icon}
            {value}
          </p>
        )
      ) : (
        <p
          style={{
            fontSize: 14,
            color: "var(--ink-mute)",
            marginTop: 4,
          }}
        >
          —
        </p>
      )}
    </div>
  );
}
