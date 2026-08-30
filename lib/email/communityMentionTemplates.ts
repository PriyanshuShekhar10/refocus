import { emailBrand, getEmailLogoUrl } from "@/lib/email/brand";

export type CommunityMentionEmailKind = "mention" | "thread_reply";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function greeting(firstName?: string | null): string {
  const name = firstName?.trim();
  return name ? `Hi ${name},` : "Hi there,";
}

function emailShell(params: {
  eyebrow: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  settingsUrl: string;
}): { subject: string; html: string; text: string } {
  const logoSrc = getEmailLogoUrl();
  const c = emailBrand;
  const settingsHintText =
    "Don't want these emails? Open Settings → Notifications and turn off Community @mentions.";
  const settingsHintHtml = `Don't want these emails? Open <a href="${escapeHtml(params.settingsUrl)}" style="color:${c.accent};text-decoration:none;font-weight:600;">Settings</a> → Notifications and turn off <strong style="color:${c.ink};">Community @mentions</strong>.`;

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
              <p style="margin:0;font-size:12px;line-height:1.65;color:${c.inkMute};">${settingsHintHtml}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject: params.subject, html, text: `${params.bodyText}\n\n${settingsHintText}\n${params.settingsUrl}\n` };
}

export function buildCommunityMentionEmail(input: {
  kind: CommunityMentionEmailKind;
  firstName?: string | null;
  actorName: string;
  contentPreview: string;
  communityUrl: string;
  settingsUrl: string;
}): { subject: string; html: string; text: string } {
  const preview =
    input.contentPreview.length > 280
      ? `${input.contentPreview.slice(0, 280)}…`
      : input.contentPreview;
  const actor = input.actorName.trim() || "Someone";
  const isReply = input.kind === "thread_reply";
  const subject = isReply
    ? `${actor} replied in a Community thread you're in`
    : `${actor} mentioned you in Community`;
  const lead = isReply
    ? `<strong style="color:${emailBrand.ink};">${escapeHtml(actor)}</strong> replied in a Community thread where you were tagged.`
    : `<strong style="color:${emailBrand.ink};">${escapeHtml(actor)}</strong> tagged you in Community.`;

  return emailShell({
    eyebrow: isReply ? "Thread reply" : "You were tagged",
    subject,
    settingsUrl: input.settingsUrl,
    bodyText: `${greeting(input.firstName)}

${isReply ? `${actor} replied in a Community thread where you were tagged.` : `${actor} tagged you in Community.`}

"${preview}"

Open Community: ${input.communityUrl}
`,
    bodyHtml: `
              <p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:${emailBrand.ink};">${greeting(input.firstName)}</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${emailBrand.inkSoft};">${lead}</p>
              <p style="margin:0 0 24px;padding:14px 16px;border-radius:12px;background:${emailBrand.bg};border:1px solid ${emailBrand.line};font-size:14px;line-height:1.65;color:${emailBrand.ink};white-space:pre-wrap;">${escapeHtml(preview)}</p>
              <p style="margin:0;">
                <a href="${escapeHtml(input.communityUrl)}" style="font-size:15px;font-weight:600;color:${emailBrand.accent};text-decoration:none;">Open Community &rarr;</a>
              </p>
`,
  });
}
