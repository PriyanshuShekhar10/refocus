"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Check, X, Plus, Copy, MapPin, Globe, AtSign } from "lucide-react";
import {
  DButton,
  Field,
  DInput,
  DTextarea,
  designStyles,
} from "@/components/design";
import { ProfileStats } from "@/components/profile-stats";

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
  username?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  name?: string | null;
  about?: string | null;
  interests?: string[];
  location?: string | null;
  website?: string | null;
  aboutMe?: Partial<Record<AboutMeKey, string>> | null;
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
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newInterest, setNewInterest] = useState("");
  const [copied, setCopied] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 32,
        width: "100%",
        maxWidth: 720,
        marginInline: embedded ? 0 : "auto",
      }}
    >
      {/* Header */}
      <header style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
        <div
          className={`${designStyles.avatar} ${designStyles.avatarLg}`}
          aria-hidden="true"
        >
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            className={designStyles.pageTitle}
            style={{ fontSize: "clamp(24px, 4vw, 32px)", marginTop: 0 }}
          >
            {displayName}
          </h1>
          {user?.username && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginTop: 6,
              }}
            >
              <Link
                href={`/u/${user.username}`}
                className={designStyles.linkMute}
                style={{ fontSize: 14 }}
              >
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
                  transition: "color .18s",
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          )}
          {user?.email && (
            <p
              style={{
                fontSize: 12,
                color: "var(--ink-mute)",
                marginTop: 4,
              }}
            >
              {user.email}
            </p>
          )}
        </div>
        <div>
          {!isEditing ? (
            <DButton
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Pencil size={14} /> Edit
            </DButton>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <DButton
                variant="quiet"
                size="sm"
                onClick={handleCancel}
                disabled={saving}
              >
                <X size={14} /> Cancel
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
            </div>
          )}
        </div>
      </header>

      {/* Session stats dashboard */}
      {!isEditing && <ProfileStats />}

      {/* Basic info */}
      <section className={designStyles.card}>
        <div className={designStyles.cardHead}>
          <div>
            <h2 className={designStyles.cardTitle}>Basic info</h2>
            <p className={designStyles.cardSub}>
              Name, handle, and how partners find you.
            </p>
          </div>
        </div>

        {isEditing ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
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
                  setEditFields((prev) => ({
                    ...prev,
                    firstname: e.target.value,
                  }))
                }
                placeholder="First name"
              />
            </Field>
            <Field label="Last name" htmlFor="lastname">
              <DInput
                id="lastname"
                value={editFields.lastname}
                onChange={(e) =>
                  setEditFields((prev) => ({
                    ...prev,
                    lastname: e.target.value,
                  }))
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
                  setEditFields((prev) => ({
                    ...prev,
                    location: e.target.value,
                  }))
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
                  setEditFields((prev) => ({
                    ...prev,
                    website: e.target.value,
                  }))
                }
                placeholder="yourwebsite.com"
              />
            </Field>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
            }}
          >
            <ReadField label="First name" value={firstname} />
            <ReadField label="Last name" value={lastname} />
            <ReadField
              label="Location"
              value={user?.location || ""}
              icon={<MapPin size={14} />}
            />
            <ReadField
              label="Website"
              value={user?.website || ""}
              icon={<Globe size={14} />}
              link={
                user?.website
                  ? user.website.startsWith("http")
                    ? user.website
                    : `https://${user.website}`
                  : undefined
              }
              display={user?.website?.replace(/^https?:\/\//, "")}
            />
          </div>
        )}
      </section>

      {/* About */}
      <section className={designStyles.card}>
        <div className={designStyles.cardHead}>
          <div>
            <h2 className={designStyles.cardTitle}>About</h2>
            <p className={designStyles.cardSub}>
              A short bio that shows on your public profile.
            </p>
          </div>
        </div>
        {isEditing ? (
          <DTextarea
            value={editFields.about}
            onChange={(e) =>
              setEditFields((prev) => ({ ...prev, about: e.target.value }))
            }
            placeholder="What do you do — and what's a session with you like?"
            rows={4}
          />
        ) : (
          <p
            style={{
              fontSize: 14,
              color: user?.about ? "var(--ink)" : "var(--ink-mute)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {user?.about || "No bio added yet."}
          </p>
        )}
      </section>

      {/* Interests */}
      <section className={designStyles.card}>
        <div className={designStyles.cardHead}>
          <div>
            <h2 className={designStyles.cardTitle}>Interests</h2>
            <p className={designStyles.cardSub}>
              Used by smart matching to find a partner on your wavelength.
            </p>
          </div>
        </div>
        {isEditing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(user?.interests?.length ?? 0) > 0 ? (
              user?.interests?.map((interest) => (
                <span
                  key={interest}
                  className={`${designStyles.tag} ${designStyles.tagAccent}`}
                >
                  {interest}
                </span>
              ))
            ) : (
              <p
                style={{
                  fontSize: 14,
                  color: "var(--ink-mute)",
                  margin: 0,
                }}
              >
                No interests added yet.
              </p>
            )}
          </div>
        )}
      </section>

      {/* About me prompts */}
      <section className={designStyles.card}>
        <div className={designStyles.cardHead}>
          <div>
            <h2 className={designStyles.cardTitle}>About me prompts</h2>
            <p className={designStyles.cardSub}>
              Optional details to help partners understand your style and context.
            </p>
          </div>
        </div>

        {isEditing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {ABOUT_ME_PROMPTS.map((prompt, idx) => (
              <Field key={prompt} label={prompt} htmlFor={`aboutme-${idx}`}>
                <DTextarea
                  id={`aboutme-${idx}`}
                  value={editFields.aboutMe[prompt]}
                  onChange={(e) =>
                    setEditFields((prev) => ({
                      ...prev,
                      aboutMe: {
                        ...prev.aboutMe,
                        [prompt]: e.target.value,
                      },
                    }))
                  }
                  rows={2}
                  placeholder="Optional"
                />
              </Field>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {ABOUT_ME_PROMPTS.filter((prompt) => (user?.aboutMe?.[prompt] || "").trim().length > 0)
              .map((prompt) => (
                <div key={prompt}>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--ink-mute)",
                      margin: 0,
                      letterSpacing: 0.005,
                    }}
                  >
                    {prompt}
                  </p>
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: "var(--ink)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {user?.aboutMe?.[prompt]}
                  </p>
                </div>
              ))}
            {!ABOUT_ME_PROMPTS.some(
              (prompt) => (user?.aboutMe?.[prompt] || "").trim().length > 0,
            ) && (
              <p
                style={{
                  fontSize: 14,
                  color: "var(--ink-mute)",
                  margin: 0,
                }}
              >
                No prompt answers added yet.
              </p>
            )}
          </div>
        )}
      </section>
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
