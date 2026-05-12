import { notFound } from "next/navigation";
import { getDb } from "@/lib/mongodb";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Globe, Calendar } from "lucide-react";
import type { Metadata } from "next";

type Props = { params: Promise<{ username: string }> };

async function getUser(username: string) {
  const db = await getDb();
  // Remove leading @ if present and decode URL encoded characters
  const cleanUsername = decodeURIComponent(username).replace(/^@/, "").toLowerCase();
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
      },
    }
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const user = await getUser(username);
  if (!user) return { title: "User not found — Refocus" };
  const name = user.name || user.username || username;
  return {
    title: `${name} (@${user.username}) — Refocus`,
    description: user.about || `${name}'s profile on Refocus`,
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const user = await getUser(username);
  if (!user) notFound();

  const firstname = user.firstname ?? "";
  const lastname = user.lastname ?? "";
  const displayName =
    [firstname, lastname].filter(Boolean).join(" ") || user.name || user.username;
  const initials = `${(firstname?.[0] || user.username?.[0] || "U").toUpperCase()}${(lastname?.[0] || "").toUpperCase()}`;
  const joinedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-xl px-4 py-16">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg font-medium bg-muted">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold truncate">{displayName}</h1>
            <p className="text-sm text-muted-foreground">
              @{user.username}
            </p>
          </div>
        </div>

        {/* Meta row */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {user.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {user.location}
            </span>
          )}
          {user.website && (
            <a
              href={user.website.startsWith("http") ? user.website : `https://${user.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Globe className="h-3.5 w-3.5" />
              {user.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          {joinedDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Joined {joinedDate}
            </span>
          )}
        </div>

        {/* About */}
        {user.about && (
          <>
            <div className="border-t mt-6 mb-4" />
            <p className="text-sm leading-relaxed text-muted-foreground">{user.about}</p>
          </>
        )}

        {/* Interests */}
        {user.interests && user.interests.length > 0 && (
          <>
            <div className="border-t mt-6 mb-4" />
            <div className="flex flex-wrap gap-2">
              {user.interests.map((interest: string) => (
                <Badge key={interest} variant="secondary">
                  {interest}
                </Badge>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
