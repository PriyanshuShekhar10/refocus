"use client";

import useSWR from "swr";
import { Calendar, Globe, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VerifiedTag } from "@/components/verified-tag";
import { AttendanceHighlight } from "@/components/attendance-highlight";
import type { PublicAttendance } from "@/lib/sessionAttendanceStats";

type PublicProfile = {
  username: string;
  name: string | null;
  firstname: string | null;
  lastname: string | null;
  avatarUrl: string | null;
  about: string | null;
  aboutMe: Record<string, string>;
  interests: string[];
  location: string | null;
  website: string | null;
  createdAt: string | null;
  emailVerified: boolean;
  attendance: PublicAttendance | null;
};

class ProfileError extends Error {
  constructor(public status: number) {
    super(`Profile request failed (${status})`);
  }
}

const fetchProfile = async (url: string): Promise<PublicProfile> => {
  const res = await fetch(url);
  if (!res.ok) throw new ProfileError(res.status);
  const data = (await res.json()) as { user: PublicProfile };
  return data.user;
};

function displayName(p: PublicProfile) {
  return [p.firstname, p.lastname].filter(Boolean).join(" ").trim() || p.name || `@${p.username}`;
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[14px] border border-rf-line bg-rf-card p-5">
      {title ? <h2 className="mb-3 text-sm font-semibold text-rf-ink">{title}</h2> : null}
      {children}
    </section>
  );
}

/** Someone's public profile, shown inside the dashboard's section box. */
export default function PublicProfilePanel({ username }: { username: string }) {
  const { data, error, isLoading } = useSWR<PublicProfile, ProfileError>(
    username ? `/api/profile/${encodeURIComponent(username)}` : null,
    fetchProfile,
    { revalidateOnFocus: false },
  );

  if (isLoading || (!data && !error)) {
    return (
      <div className="flex flex-col gap-5" aria-busy="true">
        <div className="h-28 animate-pulse rounded-[14px] bg-rf-line-soft" />
        <div className="h-24 animate-pulse rounded-[14px] bg-rf-line-soft" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <p className="text-sm text-rf-ink-soft">
          {error?.status === 404
            ? "This profile doesn't exist or isn't public."
            : "Couldn't load this profile. Please try again."}
        </p>
      </Card>
    );
  }

  const name = displayName(data);
  const initials = name.replace(/^@/, "").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const aboutMe = Object.entries(data.aboutMe ?? {}).filter(([, v]) => typeof v === "string" && v.trim());
  const joined = data.createdAt
    ? new Date(data.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;
  const website = data.website?.trim() || null;

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-wrap items-start gap-5 rounded-[14px] border border-rf-line bg-rf-card p-6">
        <Avatar className="h-20 w-20 shrink-0">
          {data.avatarUrl ? <AvatarImage src={data.avatarUrl} alt={name} /> : null}
          <AvatarFallback className="bg-rf-tint-sky text-xl font-semibold text-rf-ink">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div>
            <h1 className="flex items-center gap-2 text-[clamp(22px,3vw,28px)] font-medium leading-tight tracking-[-0.03em] text-rf-ink">
              <span className="truncate">{name}</span>
              {data.emailVerified ? <VerifiedTag /> : null}
            </h1>
            <p className="text-sm text-rf-ink-mute">@{data.username}</p>
          </div>
          {data.attendance ? (
            <div className="max-w-[260px]">
              <AttendanceHighlight attendance={data.attendance} variant="app" />
            </div>
          ) : null}
          {data.location || website || joined ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-rf-ink-soft">
              {data.location ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={13} aria-hidden /> {data.location}
                </span>
              ) : null}
              {website ? (
                <a
                  href={website.startsWith("http") ? website : `https://${website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-rf-plum-ink hover:underline"
                >
                  <Globe size={13} aria-hidden /> {website.replace(/^https?:\/\//, "")}
                </a>
              ) : null}
              {joined ? (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={13} aria-hidden /> Joined {joined}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {data.about ? (
        <Card title="About">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-rf-ink-soft">{data.about}</p>
        </Card>
      ) : null}

      {data.interests?.length ? (
        <Card title="Interests">
          <div className="flex flex-wrap gap-2">
            {data.interests.map((interest) => (
              <span key={interest} className="rounded-full bg-rf-line-soft px-3 py-1 text-[13px] text-rf-ink-soft">
                {interest}
              </span>
            ))}
          </div>
        </Card>
      ) : null}

      {aboutMe.length ? (
        <Card title="About me">
          <dl className="flex flex-col gap-3">
            {aboutMe.map(([prompt, answer]) => (
              <div key={prompt}>
                <dt className="text-xs font-medium text-rf-ink-mute">{prompt}</dt>
                <dd className="mt-0.5 text-sm text-rf-ink">{answer}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : null}
    </div>
  );
}
