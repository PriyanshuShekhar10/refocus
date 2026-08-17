import { emailBrand, getEmailLogoUrl } from "@/lib/email/brand";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function opsShell(params: {
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
              <p style="margin:0;font-size:12px;color:${c.inkMute};">Ops ping — not sent to the user.</p>
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

function personLine(name?: string | null, email?: string | null): string {
  const label = name?.trim();
  const addr = email?.trim();
  if (label && addr) return `${label} (${addr})`;
  return addr || label || "unknown";
}

export function buildOpsSignupEmail(input: {
  email: string;
  firstName?: string | null;
  method: "email" | "google";
  userId: string;
}): { subject: string; html: string; text: string } {
  const who = personLine(input.firstName, input.email);
  const method = input.method === "google" ? "Google" : "email";
  const subject = `New signup: ${who}`;

  return opsShell({
    eyebrow: "New signup",
    subject,
    bodyText: `New Refocus account

${who}
Method: ${method}
User id: ${input.userId}
`,
    bodyHtml: `
              <p style="margin:0 0 16px;font-size:17px;line-height:1.5;color:${emailBrand.ink};font-weight:500;">Someone just signed up</p>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.65;color:${emailBrand.inkSoft};"><strong style="color:${emailBrand.ink};">${escapeHtml(who)}</strong></p>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.65;color:${emailBrand.inkMute};">Method: ${escapeHtml(method)}</p>
              <p style="margin:0;font-size:13px;line-height:1.65;color:${emailBrand.inkMute};">User id: ${escapeHtml(input.userId)}</p>
`,
  });
}

export function buildOpsSessionMatchedEmail(input: {
  sessionTitle: string;
  startsAtLabel: string;
  host: { name?: string | null; email?: string | null };
  joiner: { name?: string | null; email?: string | null };
  joinUrl: string;
}): { subject: string; html: string; text: string } {
  const host = personLine(input.host.name, input.host.email);
  const joiner = personLine(input.joiner.name, input.joiner.email);
  const subject = `Session booked: ${joiner} + ${host}`;

  return opsShell({
    eyebrow: "Session booked",
    subject,
    bodyText: `A session just got a match

${input.sessionTitle}
${input.startsAtLabel}

Host: ${host}
Joined: ${joiner}

${input.joinUrl}
`,
    bodyHtml: `
              <p style="margin:0 0 16px;font-size:17px;line-height:1.5;color:${emailBrand.ink};font-weight:500;">A session just got a match</p>
              <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:${emailBrand.ink};">${escapeHtml(input.sessionTitle)}</p>
              <p style="margin:0 0 16px;font-size:14px;color:${emailBrand.inkSoft};">${escapeHtml(input.startsAtLabel)}</p>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.65;color:${emailBrand.inkMute};">Host: <strong style="color:${emailBrand.ink};">${escapeHtml(host)}</strong></p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.65;color:${emailBrand.inkMute};">Joined: <strong style="color:${emailBrand.ink};">${escapeHtml(joiner)}</strong></p>
              <p style="margin:0;">
                <a href="${escapeHtml(input.joinUrl)}" style="font-size:15px;font-weight:600;color:${emailBrand.accent};text-decoration:none;">Open session &rarr;</a>
              </p>
`,
  });
}
