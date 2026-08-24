"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import {
  Bell,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  ShieldAlert,
  Sparkles,
  Sun,
  Moon,
  Monitor,
  ImageIcon,
  AtSign,
  User,
} from "lucide-react";
import { EmailVerificationBanner } from "@/components/email-verification-banner";
import {
  DButton,
  Field,
  DInput,
  DPasswordInput,
  designStyles,
  Shell,
} from "@/components/design";
import { validatePassword } from "@/lib/validatePassword";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";

import {
  DEFAULT_SESSION_REMINDER_TIMING,
  type SessionReminderTiming,
} from "@/lib/sessionReminderPrefs";
import { getBrowserTimeZone } from "@/lib/localTime";
import { listTimeZones } from "@/lib/zonedTime";
import { TIMEZONE_PREF_EVENT } from "@/components/user-timezone-provider";
import { notifyWallpaperPref } from "@/hooks/useDashboardWallpaper";
import { useWallpaperActive } from "@/components/wallpaper-context";
import { PageRefreshButton, useOnPageRefreshEvent, dispatchPageRefreshEvent, PAGE_REFRESH_EVENTS } from "@/components/page-refresh";

type Prefs = {
  defaultSessionLength: 25 | 50 | 75;
  focusModeDefault: boolean;
  publicProfile: boolean;
  allowFriendRequests: boolean;
  showInGlobalChat: boolean;
  emailSessionReminders: boolean;
  sessionReminderTiming: SessionReminderTiming;
  emailFriendRequests: boolean;
  emailWeeklyDigest: boolean;
  timezone: string;
};

const DEFAULT_PREFS: Prefs = {
  defaultSessionLength: 50,
  focusModeDefault: true,
  publicProfile: true,
  allowFriendRequests: true,
  showInGlobalChat: true,
  emailSessionReminders: true,
  sessionReminderTiming: DEFAULT_SESSION_REMINDER_TIMING,
  emailFriendRequests: false,
  emailWeeklyDigest: false,
  timezone: "auto",
};

export default function Settings() {
  const wallpaperActive = useWallpaperActive();

  return (
    <Shell transparent={wallpaperActive}>
      <div style={{ padding: "8px 4px", maxWidth: 720, margin: "0 auto" }}>
        <header
          style={{
            marginBottom: 32,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <span className={designStyles.eyebrow}>Account</span>
            <h1
              className={designStyles.pageTitle}
              style={{ fontSize: "clamp(24px, 4vw, 32px)" }}
            >
              Settings
            </h1>
            <p
              className={designStyles.pageSub}
              style={{ fontSize: 14, marginTop: 10 }}
            >
              Tune Refocus to your rhythm. Changes save instantly where indicated.
            </p>
          </div>
          <PageRefreshButton
            onRefresh={() =>
              dispatchPageRefreshEvent(PAGE_REFRESH_EVENTS.settings)
            }
          />
        </header>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <EmailVerificationSection />
          <UsernameSection />
          <FocusPreferences />
          <NotificationsSection />
          <PrivacySection />
          <AppearanceSection />
          <ChangePasswordSection />
          <SessionSection />
          <DangerZone />
        </div>
      </div>
    </Shell>
  );
}

/* ─────────────────────────────────────────────────────
   Email verification
   ───────────────────────────────────────────────────── */
function EmailVerificationSection() {
  const [email, setEmail] = useState<string | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const loadEmail = useCallback(async () => {
    try {
      const res = await fetch("/api/users/me");
      if (!res.ok) return;
      const data = await res.json();
      setEmail(data?.user?.email ?? null);
      setVerified(data?.user?.emailVerified ?? false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEmail();
  }, [loadEmail]);

  useOnPageRefreshEvent(PAGE_REFRESH_EVENTS.settings, loadEmail);

  if (loading || verified) return null;

  return (
    <SectionCard
      icon={<Mail size={16} />}
      title="Email verification"
      subtitle="Optional — does not affect dashboard access."
    >
      <EmailVerificationBanner email={email} compact />
    </SectionCard>
  );
}

/* ─────────────────────────────────────────────────────
   Username
   ───────────────────────────────────────────────────── */
function UsernameSection() {
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "taken">(
    "idle",
  );

  const loadUsername = useCallback(async () => {
    try {
      const res = await fetch("/api/users/me");
      if (!res.ok) return;
      const data = await res.json();
      const value = data?.user?.username ?? "";
      setCurrentUsername(value || null);
      setUsername(value);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsername();
  }, [loadUsername]);

  useOnPageRefreshEvent(PAGE_REFRESH_EVENTS.settings, loadUsername);

  useEffect(() => {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed || trimmed === (currentUsername || "")) {
      setStatus("idle");
      return;
    }
    if (!/^[a-z0-9_-]{3,20}$/.test(trimmed)) {
      setStatus("taken");
      return;
    }
    setStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/users/username?q=${encodeURIComponent(trimmed)}`,
        );
        const data = await res.json();
        setStatus(data.available ? "available" : "taken");
      } catch {
        setStatus("idle");
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [username, currentUsername]);

  const trimmed = username.trim().toLowerCase();
  const unchanged = trimmed === (currentUsername || "");
  const canSave =
    !loading &&
    !saving &&
    !unchanged &&
    status !== "checking" &&
    status !== "taken" &&
    /^[a-z0-9_-]{3,20}$/.test(trimmed);

  const usernameHint =
    status === "checking" ? "Checking availability…" : undefined;
  const usernameError =
    status === "taken"
      ? trimmed.length < 3
        ? "Username must be at least 3 characters"
        : "Username is already taken"
      : error ?? undefined;
  const usernameOk =
    status === "available" ? "Username is available" : undefined;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not update username");
        return;
      }
      setCurrentUsername(trimmed);
      setUsername(trimmed);
      setStatus("idle");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Could not update username");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      icon={<User size={16} />}
      title="Username"
      subtitle="Your public handle at refocus.app/u/yourname."
    >
      {loading ? (
        <div className={designStyles.shimmer} style={{ height: 44 }} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field
            label="Username"
            htmlFor="settings-username"
            error={usernameError}
            ok={usernameOk}
            hint={usernameHint}
          >
            <DInput
              id="settings-username"
              leading={<AtSign size={14} />}
              value={username}
              onChange={(e) => {
                setSaved(false);
                setError(null);
                setUsername(
                  e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                );
              }}
              placeholder="yourname"
              maxLength={20}
            />
          </Field>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <DButton
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={!canSave}
            >
              {saving ? "Saving…" : "Save username"}
            </DButton>
            {saved && (
              <span style={{ fontSize: 13, color: "var(--ink-mute)" }}>
                Saved
              </span>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

/* ─────────────────────────────────────────────────────
   Focus preferences
   ───────────────────────────────────────────────────── */
function FocusPreferences() {
  const { prefs, setPref, saving } = usePrefs();
  const [deviceTz, setDeviceTz] = useState("UTC");
  const [zones, setZones] = useState<string[]>([]);

  useEffect(() => {
    setDeviceTz(getBrowserTimeZone());
    setZones(listTimeZones());
  }, []);

  const setTimezone = async (value: string) => {
    await setPref("timezone", value);
    try {
      window.dispatchEvent(
        new CustomEvent(TIMEZONE_PREF_EVENT, {
          detail: { timezone: value },
        }),
      );
    } catch {
      // ignore
    }
  };

  return (
    <SectionCard
      icon={<Sparkles size={16} />}
      title="Focus defaults"
      subtitle="What loads when you start a fresh session."
    >
      <RowGroup>
        <Row label="Default session length">
          <div className={designStyles.segmented}>
            {([25, 50, 75] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPref("defaultSessionLength", n)}
                className={`${designStyles.segmentedBtn} ${
                  prefs.defaultSessionLength === n
                    ? designStyles.segmentedBtnActive
                    : ""
                }`}
              >
                {n}m
              </button>
            ))}
          </div>
        </Row>
        <Row
          label="Timezone"
          hint="Calendar, sessions, and reminders use this timezone."
        >
          <select
            value={prefs.timezone || "auto"}
            disabled={saving}
            onChange={(e) => setTimezone(e.target.value)}
            className="max-w-[min(100%,280px)] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="auto">Device timezone ({deviceTz.replace(/_/g, " ")})</option>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </Row>
        <Row
          label="Start in focus mode"
          hint="Mute mic at session start. Camera stays on."
        >
          <Toggle
            checked={prefs.focusModeDefault}
            onChange={(v) => setPref("focusModeDefault", v)}
            disabled={saving}
          />
        </Row>
      </RowGroup>
    </SectionCard>
  );
}

/* ─────────────────────────────────────────────────────
   Notifications
   ───────────────────────────────────────────────────── */
function NotificationsSection() {
  const { prefs, setPref, saving } = usePrefs();
  return (
    <SectionCard
      icon={<Bell size={16} />}
      title="Notifications"
      subtitle="Email reminders for your booked focus sessions."
    >
      <RowGroup>
        <Row
          label="Session reminders"
          hint="Default is an email 1 hour before a booked session. You'll still be emailed when you match with a partner."
        >
          <Toggle
            checked={prefs.emailSessionReminders}
            onChange={(v) => setPref("emailSessionReminders", v)}
            disabled={saving}
          />
        </Row>
        {prefs.emailSessionReminders && (
          <Row
            label="Reminder timing"
            hint="1 hour is the default. Morning and 10 min are optional. Join links work from 10 minutes before start."
          >
            <div className={designStyles.segmented}>
              {(
                [
                  { value: "morning", label: "Morning" },
                  { value: "1h", label: "1 hour" },
                  { value: "10m", label: "10 min" },
                ] as const
              ).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPref("sessionReminderTiming", value)}
                  className={`${designStyles.segmentedBtn} ${
                    prefs.sessionReminderTiming === value
                      ? designStyles.segmentedBtnActive
                      : ""
                  }`}
                  disabled={saving}
                >
                  {label}
                </button>
              ))}
            </div>
          </Row>
        )}
        <Row
          label="Friend & session requests"
          hint="Saved preference for future request emails."
        >
          <Toggle
            checked={prefs.emailFriendRequests}
            onChange={(v) => setPref("emailFriendRequests", v)}
            disabled={saving}
          />
        </Row>
        <Row
          label="Weekly digest"
          hint="Saved preference for future weekly summary emails."
        >
          <Toggle
            checked={prefs.emailWeeklyDigest}
            onChange={(v) => setPref("emailWeeklyDigest", v)}
            disabled={saving}
          />
        </Row>
      </RowGroup>
    </SectionCard>
  );
}

/* ─────────────────────────────────────────────────────
   Privacy
   ───────────────────────────────────────────────────── */
function PrivacySection() {
  const { prefs, setPref, saving } = usePrefs();
  return (
    <SectionCard
      icon={<Lock size={16} />}
      title="Privacy"
      subtitle="Who can find you and reach out."
    >
      <RowGroup>
        <Row
          label="Public profile"
          hint="Anyone with your @handle can view your profile."
        >
          <Toggle
            checked={prefs.publicProfile}
            onChange={(v) => setPref("publicProfile", v)}
            disabled={saving}
          />
        </Row>
        <Row
          label="Allow friend requests"
          hint="Others can send you friend requests via your handle."
        >
          <Toggle
            checked={prefs.allowFriendRequests}
            onChange={(v) => setPref("allowFriendRequests", v)}
            disabled={saving}
          />
        </Row>
      </RowGroup>
    </SectionCard>
  );
}

/* ─────────────────────────────────────────────────────
   Appearance (theme)
   ───────────────────────────────────────────────────── */
function AppearanceSection() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
  const [wallpaperBusy, setWallpaperBusy] = useState(false);
  const [wallpaperError, setWallpaperError] = useState<string | null>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  const loadWallpaper = useCallback(async () => {
    try {
      const res = await fetch("/api/users/preferences");
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      const url = data?.preferences?.dashboardWallpaperUrl;
      setWallpaperUrl(typeof url === "string" && url.trim() ? url.trim() : null);
    } catch {
      // keep default
    }
  }, []);

  useEffect(() => {
    void loadWallpaper();
  }, [loadWallpaper]);

  useOnPageRefreshEvent(PAGE_REFRESH_EVENTS.settings, loadWallpaper);

  const active = mounted ? theme ?? resolvedTheme ?? "system" : "system";

  const handleWallpaperPick = () => {
    setWallpaperError(null);
    wallpaperInputRef.current?.click();
  };

  const handleWallpaperChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setWallpaperBusy(true);
    setWallpaperError(null);
    try {
      const form = new FormData();
      form.append("wallpaper", file);
      const res = await fetch("/api/users/me/wallpaper", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setWallpaperError(data.error || "Upload failed");
        return;
      }
      const url = data.wallpaperUrl ?? null;
      setWallpaperUrl(url);
      notifyWallpaperPref(url);
    } catch {
      setWallpaperError("Upload failed");
    } finally {
      setWallpaperBusy(false);
    }
  };

  const handleWallpaperRemove = async () => {
    setWallpaperBusy(true);
    setWallpaperError(null);
    try {
      const res = await fetch("/api/users/me/wallpaper", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setWallpaperError(data.error || "Could not remove wallpaper");
        return;
      }
      setWallpaperUrl(null);
      notifyWallpaperPref(null);
    } catch {
      setWallpaperError("Could not remove wallpaper");
    } finally {
      setWallpaperBusy(false);
    }
  };

  return (
    <SectionCard
      icon={<Monitor size={16} />}
      title="Appearance"
      subtitle="Theme and dashboard background. Marketing pages stay light."
    >
      <RowGroup>
        <Row label="Theme">
          <div className={designStyles.segmented}>
            {[
              { value: "light", label: "Light", icon: <Sun size={13} /> },
              { value: "dark", label: "Dark", icon: <Moon size={13} /> },
              { value: "system", label: "System", icon: <Monitor size={13} /> },
            ].map((opt) => {
              const isDisabled = wallpaperUrl === "/wallpaper.webp" && opt.value !== "dark";
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  disabled={isDisabled}
                  title={isDisabled ? "Preset wallpaper requires dark mode" : ""}
                  className={`${designStyles.segmentedBtn} ${
                    active === opt.value ? designStyles.segmentedBtnActive : ""
                  }`}
                  style={{ 
                    display: "inline-flex", 
                    gap: 6, 
                    alignItems: "center",
                    opacity: isDisabled ? 0.5 : 1,
                    cursor: isDisabled ? "not-allowed" : "pointer"
                  }}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Row>
        <Row
          label="Dashboard wallpaper"
          hint="Shown across the dashboard (Home, Friends, Community, Profile, Sessions, Settings, and more). JPEG, PNG, WebP, or GIF up to 10 MB."
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <button
                  type="button"
                  onClick={async () => {
                    setWallpaperBusy(true);
                    setWallpaperError(null);
                    try {
                      const res = await fetch("/api/users/me/wallpaper-url", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ url: "/wallpaper.webp" })
                      });
                      if (!res.ok) throw new Error("Failed to save wallpaper");
                      setWallpaperUrl("/wallpaper.webp");
                      notifyWallpaperPref("/wallpaper.webp");
                      setTheme("dark");
                    } catch (err) {
                      setWallpaperError("Failed to save wallpaper");
                    } finally {
                      setWallpaperBusy(false);
                    }
                  }}
                  disabled={wallpaperBusy}
                  style={{
                    width: 60, height: 36, borderRadius: 6,
                    border: wallpaperUrl === "/wallpaper.webp" ? "2px solid var(--accent)" : "1px solid var(--line)",
                    background: `url(/wallpaper.webp) center/cover no-repeat`,
                    cursor: "pointer"
                  }}
                  title="Preset Wallpaper"
                />
                <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>Preset</span>
              </div>
              <div
                style={{
                  width: 120,
                  height: 72,
                  borderRadius: 10,
                  border: (wallpaperUrl && wallpaperUrl !== "/wallpaper.webp") ? "2px solid var(--accent)" : "1px solid var(--line)",
                  overflow: "hidden",
                  background: (wallpaperUrl && wallpaperUrl !== "/wallpaper.webp")
                    ? `url(${wallpaperUrl}) center/cover no-repeat`
                    : "hsl(var(--muted))",
                  position: "relative",
                }}
                aria-hidden
              >
                {(!wallpaperUrl || wallpaperUrl === "/wallpaper.webp") && (
                  <div
                    className="bg-dotted-grid"
                    style={{ width: "100%", height: "100%" }}
                  />
                )}
              </div>
            </div>
            <input
              ref={wallpaperInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={handleWallpaperChange}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <DButton
                type="button"
                variant="quiet"
                onClick={handleWallpaperPick}
                disabled={wallpaperBusy}
                style={{ display: "inline-flex", gap: 6, alignItems: "center" }}
              >
                <ImageIcon size={14} />
                {wallpaperBusy ? "Uploading…" : (wallpaperUrl && wallpaperUrl !== "/wallpaper.webp") ? "Replace" : "Upload"}
              </DButton>
              {wallpaperUrl ? (
                <DButton
                  type="button"
                  variant="quiet"
                  onClick={handleWallpaperRemove}
                  disabled={wallpaperBusy}
                >
                  Remove
                </DButton>
              ) : null}
            </div>
            {wallpaperError ? (
              <p style={{ fontSize: 12, color: "var(--danger)", margin: 0 }}>
                {wallpaperError}
              </p>
            ) : null}
          </div>
        </Row>
      </RowGroup>
    </SectionCard>
  );
}

/* ─────────────────────────────────────────────────────
   Change password
   ───────────────────────────────────────────────────── */
function ChangePasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [validation, setValidation] = useState<
    ReturnType<typeof validatePassword>
  >(validatePassword(""));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setValidation(validatePassword(next)), 200);
    return () => clearTimeout(t);
  }, [next]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);
    if (next !== confirm) {
      setErr("New passwords do not match");
      return;
    }
    if (validation.strength === "weak") {
      setErr("New password is too weak");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: current,
          newPassword: next,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "Could not update password");
      } else {
        setOk("Password updated.");
        setCurrent("");
        setNext("");
        setConfirm("");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      icon={<KeyRound size={16} />}
      title="Password"
      subtitle="Update the password you use to sign in."
    >
      <form
        onSubmit={submit}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <Field label="Current password" htmlFor="current-pw">
          <DPasswordInput
            id="current-pw"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </Field>
        <Field label="New password" htmlFor="new-pw">
          <DPasswordInput
            id="new-pw"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
          />
          {next.length > 0 && (
            <PasswordStrengthMeter validation={validation} />
          )}
        </Field>
        <Field label="Confirm new password" htmlFor="confirm-pw">
          <DPasswordInput
            id="confirm-pw"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </Field>

        {err && (
          <div className={`${designStyles.alert} ${designStyles.alertError}`}>
            {err}
          </div>
        )}
        {ok && (
          <div className={`${designStyles.alert} ${designStyles.alertSuccess}`}>
            {ok}
          </div>
        )}

        <div>
          <DButton
            type="submit"
            variant="primary"
            disabled={
              busy ||
              !current ||
              !next ||
              !confirm ||
              validation.strength === "weak"
            }
          >
            {busy ? "Updating…" : "Update password"}
          </DButton>
        </div>
      </form>
    </SectionCard>
  );
}

/* ─────────────────────────────────────────────────────
   Session (logout)
   ───────────────────────────────────────────────────── */
function SessionSection() {
  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/" });
    } catch {
      // no-op
    }
  };
  return (
    <SectionCard
      icon={<LogOut size={16} />}
      title="Session"
      subtitle="Signs you out on this browser only."
    >
      <RowGroup>
        <Row
          label="Sign out"
          hint="Return to the homepage and end this session."
        >
          <DButton variant="ghost" onClick={handleLogout}>
            <LogOut size={14} /> Sign out
          </DButton>
        </Row>
      </RowGroup>
    </SectionCard>
  );
}

/* ─────────────────────────────────────────────────────
   Danger zone
   ───────────────────────────────────────────────────── */
function DangerZone() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText !== "DELETE") {
      setErr("Type DELETE to confirm");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/users/me/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmText,
          currentPassword: password || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "Could not delete account");
      } else {
        await signOut({ redirect: false });
        router.push("/");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      icon={<ShieldAlert size={16} />}
      title="Danger zone"
      subtitle="Irreversible actions. Read carefully."
      tone="danger"
    >
      {!open ? (
        <RowGroup>
          <Row
            label="Delete account"
            hint="Permanently removes your profile, friends, and session history."
          >
            <DButton variant="danger" onClick={() => setOpen(true)}>
              Delete account
            </DButton>
          </Row>
        </RowGroup>
      ) : (
        <form
          onSubmit={submit}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div
            className={`${designStyles.alert} ${designStyles.alertError}`}
            style={{ lineHeight: 1.55 }}
          >
            This will permanently delete your account, profile, friendships and
            outstanding session requests. You won&apos;t be able to recover any
            of it. Type <strong>DELETE</strong> to confirm.
          </div>
          <Field label="Type DELETE" htmlFor="confirm-del">
            <input
              id="confirm-del"
              className={designStyles.input}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
            />
          </Field>
          <Field
            label="Current password"
            hint="Required if your account has a password."
            htmlFor="del-pw"
          >
            <DPasswordInput
              id="del-pw"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {err && (
            <div className={`${designStyles.alert} ${designStyles.alertError}`}>
              {err}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <DButton
              type="button"
              variant="quiet"
              onClick={() => {
                setOpen(false);
                setConfirmText("");
                setPassword("");
                setErr(null);
              }}
              disabled={busy}
            >
              Cancel
            </DButton>
            <DButton
              type="submit"
              variant="danger"
              disabled={busy || confirmText !== "DELETE"}
            >
              {busy ? "Deleting…" : "Delete account permanently"}
            </DButton>
          </div>
        </form>
      )}
    </SectionCard>
  );
}

/* ─────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────── */

function SectionCard({
  icon,
  title,
  subtitle,
  children,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  tone?: "danger";
}) {
  return (
    <section
      className={designStyles.card}
      style={
        tone === "danger"
          ? {
              borderColor: "color-mix(in oklab, var(--danger) 30%, var(--line))",
            }
          : undefined
      }
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 8,
            background:
              tone === "danger" ? "var(--danger-soft)" : "var(--accent-soft)",
            color:
              tone === "danger"
                ? "var(--danger)"
                : "color-mix(in oklab, var(--accent) 70%, var(--ink))",
          }}
        >
          {icon}
        </span>
        <h2 className={designStyles.cardTitle}>{title}</h2>
      </div>
      <p className={designStyles.cardSub} style={{ marginBottom: 20 }}>
        {subtitle}
      </p>
      {children}
    </section>
  );
}

function RowGroup({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        borderTop: "1px solid var(--line-soft)",
      }}
    >
      {children}
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "16px 0",
        borderBottom: "1px solid var(--line-soft)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>
          {label}
        </div>
        {hint && (
          <div
            style={{
              fontSize: 12,
              color: "var(--ink-mute)",
              marginTop: 4,
              lineHeight: 1.5,
            }}
          >
            {hint}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={designStyles.switch}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className={designStyles.switchTrack} />
      <span className={designStyles.switchKnob} />
    </label>
  );
}

/**
 * Loads preferences on mount, syncs changes back to the server with a small
 * debounce, and exposes optimistic updates. Failures revert the optimistic
 * value silently — the user can retry by toggling again.
 */
function usePrefs() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);

  const loadPrefs = useCallback(async () => {
    try {
      const res = await fetch("/api/users/preferences");
      if (!res.ok) return;
      const data = await res.json();
      if (data?.preferences) {
        setPrefs({ ...DEFAULT_PREFS, ...data.preferences });
      }
    } catch {
      // keep defaults on failure
    }
  }, []);

  useEffect(() => {
    void loadPrefs();
  }, [loadPrefs]);

  useOnPageRefreshEvent(PAGE_REFRESH_EVENTS.settings, loadPrefs);

  const setPref = useCallback(
    async <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
      const previous = prefs[key];
      setPrefs((p) => ({ ...p, [key]: value }));
      setSaving(true);
      try {
        const res = await fetch("/api/users/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: value }),
        });
        if (!res.ok) throw new Error("save failed");
      } catch {
        setPrefs((p) => ({ ...p, [key]: previous }));
      } finally {
        setSaving(false);
      }
    },
    [prefs]
  );

  return { prefs, setPref, saving };
}
