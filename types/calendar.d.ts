import type {
  DurationMin,
  SessionType,
  SessionStatus,
} from "@/constants/calendar";

export type { DurationMin, SessionType, SessionStatus };

export type CalendarEvent = {
  id: string;
  title?: string;
  start: string; // ISO
  end: string; // ISO
  durationMin: DurationMin;
  sessionType: SessionType;
  name?: string | null;
  color?: string | null;
  partner?: { id: string; name: string; avatarUrl?: string } | null | "anyone";
  status: SessionStatus;
  owner_id?: string;
  owner?: {
    id: string;
    email?: string;
    firstname?: string;
    lastname?: string;
    username?: string;
    about?: string;
    avatar_url?: string;
  } | null;
  participants?: {
    user_id: string;
    joined_at: string;
    email?: string;
    firstname?: string;
    confirmVariant?: "danger" | "success";
    lastname?: string;
    username?: string;
    about?: string;
    quiet?: boolean;
    avatar_url?: string;
  }[];
};

// Shape of sessions returned from /api/sessions endpoint
export type FetchedSession = {
  id: string;
  start: string;
  end: string;
  durationMin: DurationMin;
  sessionType: SessionType;
  status: SessionStatus;
  name?: string | null;
  color?: string | null;
  owner_id?: string;
  owner?: {
    id: string;
    email?: string;
    firstname?: string;
    lastname?: string;
    username?: string;
    about?: string;
    avatar_url?: string;
  } | null;
  participants?: Array<{
    user_id: string;
    joined_at: string;
    email?: string;
    firstname?: string;
    lastname?: string;
    username?: string;
    about?: string;
    avatar_url?: string;
  }>;
};

export type PresenceDot = {
  id: string;
  time: string; // ISO
  columnDate: string; // YYYY-MM-DD
  avatarUrl: string;
  name?: string;
};

export type CalendarProps = {
  startHour?: number;
  endHour?: number;
  stepMinutes?: 15 | 30;
  visibleDays?: number;
  startDate?: Date;
  events?: CalendarEvent[];
  presence?: PresenceDot[];
  locale?: string;
  onEventsChange?: (next: CalendarEvent[]) => void;
  className?: string;
};
