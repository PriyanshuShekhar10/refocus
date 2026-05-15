import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/mongodb";
import { MapPin, Globe, Calendar } from "lucide-react";
import type { Metadata } from "next";
import { Shell, MinimalNav, designStyles } from "@/components/design";
import { Logo } from "@/assets/exports";

type Props = { params: Promise<{ username: string }> };

async function getUser(username: string) {
  const db = await getDb();
  // Remove leading @ if present and decode URL encoded characters
  const cleanUsername = decodeURIComponent(username)
    .replace(/^@/, "")
    .toLowerCase();
  return db.collection("users").findOne(
    { username: cleanUsername },
    {
      projection: {
        username: 1,
        name: 1,
        firstname: 1,
        lastname: 1,
        about: 1,
        interests: 1,
        location: 1,
        website: 1,
        createdAt: 1,
        "preferences.publicProfile": 1,
      },
    }
  );
}

async function getPublicUser(username: string) {
  const user = await getUser(username);
  if (!user) return null;
  if (user.preferences?.publicProfile === false) return null;
  return user;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const user = await getPublicUser(username);
  if (!user) return { title: "User not found — Refocus" };
  const name = user.name || user.username || username;
  return {
    title: `${name} (@${user.username}) — Refocus`,
    description: user.about || `${name}'s profile on Refocus`,
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const user = await getPublicUser(username);
  if (!user) notFound();

  const firstname = user.firstname ?? "";
  const lastname = user.lastname ?? "";
  const displayName =
    [firstname, lastname].filter(Boolean).join(" ") ||
    user.name ||
    user.username;
  const initials = `${(firstname?.[0] || user.username?.[0] || "U").toUpperCase()}${(
    lastname?.[0] || ""
  ).toUpperCase()}`;
  const joinedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <Shell>
      <MinimalNav
        ctas={[
          { label: "Home", href: "/", variant: "quiet" },
          { label: "Start focusing", href: "/auth/sign-up", variant: "primary" },
        ]}
      />

      <main style={{ padding: "56px 0 80px", minHeight: "calc(100vh - 64px)" }}>
        <div className={designStyles.wrap} style={{ maxWidth: 720 }}>
          <header
            style={{ display: "flex", alignItems: "flex-start", gap: 20 }}
          >
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
              <p
                style={{
                  fontSize: 14,
                  color: "var(--ink-mute)",
                  marginTop: 6,
                }}
              >
                @{user.username}
              </p>
            </div>
          </header>

          {/* Meta row */}
          <div
            style={{
              marginTop: 18,
              display: "flex",
              flexWrap: "wrap",
              gap: "8px 18px",
              fontSize: 13,
              color: "var(--ink-soft)",
            }}
          >
            {user.location && (
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <MapPin size={13} />
                {user.location}
              </span>
            )}
            {user.website && (
              <a
                href={
                  user.website.startsWith("http")
                    ? user.website
                    : `https://${user.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className={designStyles.link}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Globe size={13} />
                {user.website.replace(/^https?:\/\//, "")}
              </a>
            )}
            {joinedDate && (
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Calendar size={13} />
                Joined {joinedDate}
              </span>
            )}
          </div>

          {/* About */}
          {user.about && (
            <section
              className={designStyles.card}
              style={{ marginTop: 28 }}
            >
              <h2
                className={designStyles.cardTitle}
                style={{ marginBottom: 12 }}
              >
                About
              </h2>
              <p
                style={{
                  fontSize: 15,
                  lineHeight: 1.65,
                  color: "var(--ink-soft)",
                  margin: 0,
                }}
              >
                {user.about}
              </p>
            </section>
          )}

          {/* Interests */}
          {user.interests && user.interests.length > 0 && (
            <section
              className={designStyles.card}
              style={{ marginTop: 14 }}
            >
              <h2
                className={designStyles.cardTitle}
                style={{ marginBottom: 12 }}
              >
                Interests
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {user.interests.map((interest: string) => (
                  <span
                    key={interest}
                    className={`${designStyles.tag} ${designStyles.tagAccent}`}
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <footer className={designStyles.footer}>
        <div className={`${designStyles.wrap} ${designStyles.footInner}`}>
          <Link href="/" className={designStyles.brand}>
            <Image
              src={Logo}
              alt="Refocus"
              className="h-7 w-auto dark:invert dark:brightness-0"
            />
          </Link>
          <div className={designStyles.footMeta}>made for deep work</div>
        </div>
      </footer>
    </Shell>
  );
}
