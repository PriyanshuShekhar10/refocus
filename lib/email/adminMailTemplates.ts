import { emailBrand, getEmailLogoUrl } from "@/lib/email/brand";

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

function bodyToHtml(text: string): string {
  const escaped = escapeHtml(text);
  const linked = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    `<a href="$1" style="color:${emailBrand.accent};text-decoration:none;font-weight:600;">$1</a>`,
  );
  return linked.replace(/\n/g, "<br />");
}

export function buildAdminUserEmail(input: {
  firstName?: string | null;
  subject: string;
  body: string;
}): { subject: string; html: string; text: string } {
  const greet = greeting(input.firstName);
  const subject = input.subject.trim();
  const logoSrc = getEmailLogoUrl();
  const c = emailBrand;
  const bodyHtml = bodyToHtml(input.body);
  const text = `${greet}

${input.body.trim()}

— The Refocus team`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${c.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${c.ink};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${c.bg};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:${c.card};border-radius:16px;border:1px solid ${c.line};overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;background:${c.accentSoft};border-bottom:1px solid ${c.line};">
              <img src="${logoSrc}" alt="Refocus" width="96" height="96" border="0" style="display:block;margin:0 auto 16px;width:96px;height:96px;border:0;border-radius:16px;" />
              <p style="margin:0;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:${c.inkMute};font-weight:600;">A note from Refocus</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:17px;line-height:1.5;color:${c.ink};font-weight:500;">${escapeHtml(greet)}</p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:${c.inkSoft};">${bodyHtml}</p>
              <p style="margin:0;font-size:13px;line-height:1.55;color:${c.inkMute};">— The Refocus team</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:${c.bg};border-top:1px solid ${c.line};text-align:center;">
              <p style="margin:0;font-size:12px;color:${c.inkMute};">You received this because you have a Refocus account.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
