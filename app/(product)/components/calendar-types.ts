export type CalendarEvent = {
  id: string;
  title?: string;
  start: string; // ISO
  end: string; // ISO
  durationMin: 25 | 50 | 75;
  sessionType: "focus" | "deep-work" | "learning";
  name?: string | null;
  color?: string | null;
  partner?: { id: string; name: string; avatarUrl?: string } | null | "anyone";
  status: "available" | "booked" | "in-progress" | "completed";
  owner_id?: string;
  owner?: {
    id: string;
    email?: string;
    firstname?: string;
    lastname?: string;
  } | null;
  participants?: {
    user_id: string;
    joined_at: string;
    email?: string;
    firstname?: string;
    confirmVariant?: "danger" | "success";
    lastname?: string;
    quiet?: boolean;
    avatar_url?: string;
  }[];
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
