import { emailBrand, getEmailLogoUrl } from "@/lib/email/brand";
import type { SessionReminderItem } from "@/lib/sessionReminders";

function greeting(firstName?: string | null): string {
  const name = firstName?.trim();
  return name ? `Hi ${name},` : "Hi there,";
}

function emailShell(params: {
  eyebrow: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
}): { subject: string; html: string; text: string } {
  const logoSrc = getEmailLogoUrl();
  const c = emailBrand;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${params.subject}</title>
</head>
<body style="margin:0;padding:0;background:${c.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${c.ink};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${c.bg};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:${c.card};border-radius:16px;border:1px solid ${c.line};overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;background:${c.accentSoft};border-bottom:1px solid ${c.line};">
              <img src="${logoSrc}" alt="Refocus" width="96" height="96" border="0" style="display:block;margin:0 auto 16px;width:96px;height:96px;border:0;border-radius:16px;" />
              <p style="margin:0;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:${c.inkMute};font-weight:600;">${params.eyebrow}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${params.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:${c.bg};border-top:1px solid ${c.line};text-align:center;">
              <p style="margin:0;font-size:12px;color:${c.inkMute};">Finding you a buddy who matters.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject: params.subject, html, text: params.bodyText };
}

function sessionListHtml(
  sessions: SessionReminderItem[],
  timeZone: string,
): string {
  return sessions
    .map((s) => {
      const partner = s.partnerLabel
        ? `<span style="color:${emailBrand.inkMute};"> · with ${s.partnerLabel}</span>`
        : "";
      return `<tr>
        <td style="padding:12px 0;border-bottom:1px solid ${emailBrand.line};">
          <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:${emailBrand.ink};">${s.title}${partner}</p>
          <p style="margin:0 0 8px;font-size:13px;color:${emailBrand.inkSoft};">${formatSessionTime(s.startTime, timeZone)}</p>
          <a href="${s.joinUrl}" style="font-size:13px;font-weight:600;color:${emailBrand.accent};text-decoration:none;">View session &rarr;</a>
        </td>
      </tr>`;
    })
    .join("");
}

function sessionListText(
  sessions: SessionReminderItem[],
  timeZone: string,
): string {
  return sessions
    .map((s) => {
      const partner = s.partnerLabel ? ` with ${s.partnerLabel}` : "";
      return `- ${s.title}${partner}\n  ${formatSessionTime(s.startTime, timeZone)}\n  ${s.joinUrl}`;
    })
    .join("\n\n");
}

function formatSessionTime(date: Date, timeZone: string): string {
  return date.toLocaleString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone,
  });
}

export function buildMorningSessionDigestEmail(params: {
  firstName?: string | null;
  dayKey: string;
  sessions: SessionReminderItem[];
  timeZone?: string;
}): { subject: string; html: string; text: string } {
  const greet = greeting(params.firstName);
  const count = params.sessions.length;
  const timeZone = params.timeZone || "Asia/Kolkata";
  const subject =
    count === 1
      ? "Today's focus session on Refocus"
      : `Today's ${count} focus sessions on Refocus`;

  const bodyText = `${greet}

Here's your session summary for ${params.dayKey}:

${sessionListText(params.sessions, timeZone)}

Open Refocus to review details or join when your session window opens.

— The Refocus team`;

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:17px;line-height:1.5;color:${emailBrand.ink};font-weight:500;">${greet}</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:${emailBrand.inkSoft};">
      You have <strong style="color:${emailBrand.ink};">${count}</strong> focus session${count === 1 ? "" : "s"} scheduled for today.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      ${sessionListHtml(params.sessions, timeZone)}
    </table>`;

  return emailShell({
    eyebrow: "Today's sessions",
    subject,
    bodyHtml,
    bodyText,
  });
}

export function buildTimedSessionReminderEmail(params: {
  firstName?: string | null;
  timing: "1h" | "10m";
  session: SessionReminderItem;
  startsAtLabel: string;
  joinNote: string;
}): { subject: string; html: string; text: string } {
  const { session, startsAtLabel, joinNote, timing } = params;
  const greet = greeting(params.firstName);
  const partner = session.partnerLabel
    ? ` with ${session.partnerLabel}`
    : "";
  const subject =
    timing === "10m"
      ? `Starting soon: ${session.title}`
      : `In 1 hour: ${session.title}`;

  const intro =
    timing === "10m"
      ? `Your session starts in about 10 minutes. Tap below to open Refocus and join when the call window opens.`
      : `Your session starts in about an hour. You can open the session page now — ${joinNote.toLowerCase()}`;

  const buttonLabel = timing === "10m" ? "Open session & join" : "View session";
  const buttonBg = timing === "10m" ? emailBrand.ink : emailBrand.line;
  const buttonFg = timing === "10m" ? emailBrand.accentInk : emailBrand.ink;

  const bodyText = `${greet}

${intro}

${session.title}${partner}
${startsAtLabel}

${session.joinUrl}

${joinNote}

— The Refocus team`;

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:17px;line-height:1.5;color:${emailBrand.ink};font-weight:500;">${greet}</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:${emailBrand.inkSoft};">${intro}</p>
    <div style="margin:0 0 24px;padding:16px;border-radius:12px;border:1px solid ${emailBrand.line};background:${emailBrand.bg};">
      <p style="margin:0 0 6px;font-size:16px;font-weight:600;color:${emailBrand.ink};">${session.title}${partner ? `<span style="font-weight:500;color:${emailBrand.inkSoft};">${partner}</span>` : ""}</p>
      <p style="margin:0;font-size:14px;color:${emailBrand.inkSoft};">${startsAtLabel}</p>
    </div>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
      <tr>
        <td style="border-radius:10px;background:${buttonBg};">
          <a href="${session.joinUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:${buttonFg};text-decoration:none;">${buttonLabel}</a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:12px;line-height:1.55;color:${emailBrand.inkMute};">${joinNote}</p>`;

  const eyebrow = timing === "10m" ? "Starting soon" : "Upcoming session";

  return emailShell({ eyebrow, subject, bodyHtml, bodyText });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildMatchedSessionEmail(params: {
  firstName?: string | null;
  partnerLabel: string | null;
  sessionTitle: string;
  startsAtLabel: string;
  joinUrl: string;
  isFirstMatch: boolean;
  /** Host of a calendar slot that someone else just joined. */
  isHost?: boolean;
}): { subject: string; html: string; text: string } {
  const greet = greeting(params.firstName);
  const partner = params.partnerLabel?.trim() || "a focus partner";
  const partnerHtml = escapeHtml(partner);
  const titleHtml = escapeHtml(params.sessionTitle);
  const startsHtml = escapeHtml(params.startsAtLabel);

  const isHost = Boolean(params.isHost);
  const subject = isHost
    ? partner === "a focus partner"
      ? "Someone joined your session"
      : `${partner} joined your session`
    : params.isFirstMatch
      ? "You're matched — your first Refocus session awaits"
      : `You're matched with ${partner}`;

  const intro = isHost
    ? `<strong style="color:${emailBrand.ink};">${partnerHtml}</strong> just joined the session on your calendar. You're booked.`
    : params.isFirstMatch
      ? `Congratulations — you've been matched with <strong style="color:${emailBrand.ink};">${partnerHtml}</strong>. We can't wait for you to have your first focus session together.`
      : `You're matched with <strong style="color:${emailBrand.ink};">${partnerHtml}</strong> for an upcoming focus session. Quiet company, shared timer — you've got this.`;

  const introText = isHost
    ? `${partner} just joined the session on your calendar. You're booked.`
    : params.isFirstMatch
      ? `Congratulations — you've been matched with ${partner}. We can't wait for you to have your first focus session together.`
      : `You're matched with ${partner} for an upcoming focus session. Quiet company, shared timer — you've got this.`;

  const bodyText = `${greet}

${introText}

${params.sessionTitle}
${params.startsAtLabel}

${params.joinUrl}

You'll also get a reminder before it starts if you have session emails enabled.

— The Refocus team`;

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:17px;line-height:1.5;color:${emailBrand.ink};font-weight:500;">${greet}</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:${emailBrand.inkSoft};">${intro}</p>
    <div style="margin:0 0 24px;padding:16px;border-radius:12px;border:1px solid ${emailBrand.line};background:${emailBrand.bg};">
      <p style="margin:0 0 6px;font-size:16px;font-weight:600;color:${emailBrand.ink};">${titleHtml}</p>
      <p style="margin:0;font-size:14px;color:${emailBrand.inkSoft};">${startsHtml}</p>
    </div>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
      <tr>
        <td style="border-radius:10px;background:${emailBrand.ink};">
          <a href="${params.joinUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:${emailBrand.accentInk};text-decoration:none;">View session</a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:12px;line-height:1.55;color:${emailBrand.inkMute};">You'll also get a reminder before it starts if you have session emails enabled.</p>`;

  return emailShell({
    eyebrow: isHost ? "Session booked" : "You're matched",
    subject,
    bodyHtml,
    bodyText,
  });
}
