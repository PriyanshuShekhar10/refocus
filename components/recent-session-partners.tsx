"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Ban,
  Flag,
  Loader2,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { designStyles } from "@/components/design";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ReportDialog from "@/app/(product)/components/ReportDialog";
import { useEmailVerified } from "@/hooks/useEmailVerified";
import type { ReportTargetType } from "@/lib/reportConstants";

type Partner = {
  userId: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  lastSessionId: string;
  lastSessionAt: string;
  isFriend: boolean;
  friendRequestPending: "none" | "outgoing" | "incoming";
  isBlockedByMe: boolean;
  reportable: boolean;
};

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function RecentSessionPartners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendBusy, setFriendBusy] = useState<string | null>(null);
  const [blockBusy, setBlockBusy] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{
    partner: Partner;
    targetType: ReportTargetType;
    targetId: string;
  } | null>(null);
  const [confirmBlock, setConfirmBlock] = useState<Partner | null>(null);
  const { canInteract } = useEmailVerified();

  const loadPartners = useCallback(async () => {
    try {
      const res = await fetch("/api/users/me/recent-partners?limit=5");
      if (!res.ok) return;
      const data = await res.json();
      setPartners(data.partners ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPartners();
  }, [loadPartners]);

  const sendFriendRequest = async (partner: Partner) => {
    if (!canInteract || partner.isFriend || partner.friendRequestPending !== "none") {
      return;
    }
    setFriendBusy(partner.userId);
    try {
      const res = await fetch("/api/friends/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_user_id: partner.userId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send request");
      }
      setPartners((prev) =>
        prev.map((p) =>
          p.userId === partner.userId
            ? { ...p, friendRequestPending: "outgoing" as const }
            : p,
        ),
      );
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setFriendBusy(null);
    }
  };

  const blockUser = async (partner: Partner) => {
    setBlockBusy(partner.userId);
    try {
      const res = await fetch("/api/users/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked_user_id: partner.userId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to block user");
      }
      setPartners((prev) =>
        prev.map((p) =>
          p.userId === partner.userId ? { ...p, isBlockedByMe: true } : p,
        ),
      );
      setConfirmBlock(null);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBlockBusy(null);
    }
  };

  const unblockUser = async (partner: Partner) => {
    setBlockBusy(partner.userId);
    try {
      const res = await fetch(`/api/users/blocks/${partner.userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to unblock user");
      }
      setPartners((prev) =>
        prev.map((p) =>
          p.userId === partner.userId ? { ...p, isBlockedByMe: false } : p,
        ),
      );
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBlockBusy(null);
    }
  };

  if (loading) {
    return (
      <section className={designStyles.card}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px 0",
            color: "var(--ink-mute)",
          }}
        >
          <Loader2 size={20} className="animate-spin" />
        </div>
      </section>
    );
  }

  if (partners.length === 0) {
    return (
      <section className={designStyles.card}>
        <div className={designStyles.cardHead}>
          <div>
            <h2 className={designStyles.cardTitle}>Recent session partners</h2>
            <p className={designStyles.cardSub}>
              People you&apos;ve focused with recently.
            </p>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: "var(--ink-mute)" }}>
          No session partners yet — book a focus session to connect with
          someone.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className={designStyles.card}>
        <div className={designStyles.cardHead}>
          <div>
            <h2 className={designStyles.cardTitle}>Recent session partners</h2>
            <p className={designStyles.cardSub}>
              Add friends, report issues, or block someone from future matching.
            </p>
          </div>
        </div>

        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {partners.map((partner) => {
            const displayName = partner.name || partner.username || "Partner";
            const initials = displayName.slice(0, 2).toUpperCase();
            const profileHref = partner.username
              ? `/u/${partner.username}`
              : null;

            return (
              <li
                key={partner.userId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid var(--line-soft)",
                  background: "var(--card)",
                  flexWrap: "wrap",
                }}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  {partner.avatarUrl ? (
                    <AvatarImage src={partner.avatarUrl} alt={displayName} />
                  ) : null}
                  <AvatarFallback className="text-xs bg-[#FFF1D3] text-[#5D1C6A] dark:bg-[#5D1C6A]/40 dark:text-[#FFB090]">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div style={{ flex: 1, minWidth: 140 }}>
                  {profileHref ? (
                    <Link
                      href={profileHref}
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--ink)",
                        textDecoration: "none",
                      }}
                    >
                      {displayName}
                    </Link>
                  ) : (
                    <span
                      style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}
                    >
                      {displayName}
                    </span>
                  )}
                  {partner.username ? (
                    <div
                      style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 2 }}
                    >
                      @{partner.username}
                    </div>
                  ) : null}
                  <div
                    style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 2 }}
                  >
                    Last session: {formatRelativeTime(partner.lastSessionAt)}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  {partner.isBlockedByMe ? (
                    <button
                      type="button"
                      onClick={() => unblockUser(partner)}
                      disabled={blockBusy === partner.userId}
                      style={actionBtnStyle("muted")}
                    >
                      {blockBusy === partner.userId ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Ban size={13} />
                      )}
                      Unblock
                    </button>
                  ) : (
                    <>
                      {partner.isFriend ? (
                        <span style={statusPillStyle}>
                          <UserCheck size={13} />
                          Friends
                        </span>
                      ) : partner.friendRequestPending === "outgoing" ? (
                        <span style={statusPillStyle}>Request sent</span>
                      ) : partner.friendRequestPending === "incoming" ? (
                        <span style={statusPillStyle}>Wants to connect</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => sendFriendRequest(partner)}
                          disabled={
                            !canInteract || friendBusy === partner.userId
                          }
                          style={actionBtnStyle("primary")}
                        >
                          {friendBusy === partner.userId ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <UserPlus size={13} />
                          )}
                          Add friend
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setReportTarget({
                            partner,
                            targetType: partner.reportable
                              ? "session_call"
                              : "user",
                            targetId: partner.reportable
                              ? partner.lastSessionId
                              : partner.userId,
                          })
                        }
                        style={actionBtnStyle("muted")}
                      >
                        <Flag size={13} />
                        Report
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmBlock(partner)}
                        disabled={blockBusy === partner.userId}
                        style={actionBtnStyle("danger")}
                      >
                        <Ban size={13} />
                        Block
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {reportTarget ? (
        <ReportDialog
          open
          onClose={() => setReportTarget(null)}
          targetType={reportTarget.targetType}
          targetId={reportTarget.targetId}
          reportedUserId={reportTarget.partner.userId}
          reportedLabel={
            reportTarget.partner.name ||
            reportTarget.partner.username ||
            undefined
          }
          contentPreview={`Session partner — last session ${formatRelativeTime(reportTarget.partner.lastSessionAt)}`}
        />
      ) : null}

      {confirmBlock ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-900"
            role="dialog"
            aria-labelledby="block-dialog-title"
          >
            <h3
              id="block-dialog-title"
              className="text-base font-semibold text-gray-900 dark:text-gray-100"
            >
              Block {confirmBlock.name || confirmBlock.username || "this user"}?
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              They won&apos;t appear in your calendar matching or AI match
              results. You can unblock them later from your profile.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmBlock(null)}
                disabled={blockBusy === confirmBlock.userId}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => blockUser(confirmBlock)}
                disabled={blockBusy === confirmBlock.userId}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {blockBusy === confirmBlock.userId ? "Blocking…" : "Block"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

const statusPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 12,
  fontWeight: 500,
  color: "var(--ink-mute)",
  padding: "6px 10px",
  borderRadius: 8,
  background: "var(--line-soft)",
};

function actionBtnStyle(
  variant: "primary" | "muted" | "danger",
): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: 12,
    fontWeight: 500,
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid var(--line-soft)",
    cursor: "pointer",
    background: "transparent",
  };
  if (variant === "primary") {
    return {
      ...base,
      color: "#5D1C6A",
      borderColor: "#CA5995",
      background: "rgba(202, 89, 149, 0.08)",
    };
  }
  if (variant === "danger") {
    return {
      ...base,
      color: "#b91c1c",
      borderColor: "rgba(185, 28, 28, 0.3)",
    };
  }
  return { ...base, color: "var(--ink-mute)" };
}
