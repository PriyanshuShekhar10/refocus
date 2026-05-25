"use client";

import { useCallback, useEffect, useState } from "react";
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
} from "lucide-react";
import { EmailVerificationBanner } from "@/components/email-verification-banner";
import {
  DButton,
  Field,
  DPasswordInput,
  designStyles,
  Shell,
} from "@/components/design";
import { validatePassword } from "@/lib/validatePassword";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";

type Prefs = {
  defaultSessionLength: 25 | 50 | 75;
  focusModeDefault: boolean;
  publicProfile: boolean;
  allowFriendRequests: boolean;
  showInGlobalChat: boolean;
  emailSessionReminders: boolean;
  emailFriendRequests: boolean;
  emailWeeklyDigest: boolean;
};

const DEFAULT_PREFS: Prefs = {
  defaultSessionLength: 50,
  focusModeDefault: true,
  publicProfile: true,
  allowFriendRequests: true,
  showInGlobalChat: true,
  emailSessionReminders: true,
  emailFriendRequests: true,
  emailWeeklyDigest: false,
};

export default function Settings() {
  return (
    <Shell>
      <div style={{ padding: "8px 4px", maxWidth: 720, margin: "0 auto" }}>
        <header style={{ marginBottom: 32 }}>
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
        </header>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <EmailVerificationSection />
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/users/me");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setEmail(data?.user?.email ?? null);
        setVerified(data?.user?.emailVerified ?? false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
   Focus preferences
   ───────────────────────────────────────────────────── */
function FocusPreferences() {
  const { prefs, setPref, saving } = usePrefs();
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
          label="Start in focus mode"
          hint="Mute mic and camera at session start."
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
      subtitle="Saved delivery preferences (email sending controls are not active yet)."
    >
      <RowGroup>
        <Row
          label="Session reminders"
          hint="Saved preference for future reminder emails."
        >
          <Toggle
            checked={prefs.emailSessionReminders}
            onChange={(v) => setPref("emailSessionReminders", v)}
            disabled={saving}
          />
        </Row>
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
        <Row
          label="Appear in global chat"
          hint="Your handle shows up in the global lounge between sessions."
        >
          <Toggle
            checked={prefs.showInGlobalChat}
            onChange={(v) => setPref("showInGlobalChat", v)}
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
  useEffect(() => setMounted(true), []);
  const active = mounted ? theme ?? resolvedTheme ?? "system" : "system";

  return (
    <SectionCard
      icon={<Monitor size={16} />}
      title="Appearance"
      subtitle="Theme for the dashboard. The marketing pages stay light."
    >
      <RowGroup>
        <Row label="Theme">
          <div className={designStyles.segmented}>
            {[
              { value: "light", label: "Light", icon: <Sun size={13} /> },
              { value: "dark", label: "Dark", icon: <Moon size={13} /> },
              { value: "system", label: "System", icon: <Monitor size={13} /> },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={`${designStyles.segmentedBtn} ${
                  active === opt.value ? designStyles.segmentedBtnActive : ""
                }`}
                style={{ display: "inline-flex", gap: 6, alignItems: "center" }}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/users/preferences");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.preferences) {
          setPrefs({ ...DEFAULT_PREFS, ...data.preferences });
        }
      } catch {
        // keep defaults on failure
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
