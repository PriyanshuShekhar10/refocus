import { emailBrand, getEmailLogoDataUri } from "@/lib/email/brand";

export type WelcomeEmailParams = {
  firstName?: string | null;
  verifyUrl: string;
  signInUrl: string;
};

function greeting(firstName?: string | null): string {
  const name = firstName?.trim();
  return name ? `Hi ${name},` : "Hi there,";
}

export function buildWelcomeVerifyEmail(params: WelcomeEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { verifyUrl, signInUrl } = params;
  const greet = greeting(params.firstName);
  const logoSrc = getEmailLogoDataUri();
  const c = emailBrand;

  const subject = "Welcome to Refocus — verify your email";

  const text = `${greet}

Welcome to Refocus. Your account is ready — you can sign in and use the dashboard anytime.

Verify your email (optional but recommended):
${verifyUrl}

Sign in: ${signInUrl}

You don't need to verify to access your dashboard. Verification helps secure your account and unlocks profile trust signals.

— The Refocus team`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:${c.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${c.ink};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${c.bg};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:${c.card};border-radius:16px;border:1px solid ${c.line};overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;background:${c.accentSoft};border-bottom:1px solid ${c.line};">
              <img src="${logoSrc}" alt="Refocus" width="96" height="96" style="display:block;margin:0 auto 16px;width:96px;height:96px;border-radius:16px;" />
              <p style="margin:0;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:${c.inkMute};font-weight:600;">Welcome aboard</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:17px;line-height:1.5;color:${c.ink};font-weight:500;">${greet}</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${c.inkSoft};">
                Thanks for signing up for <strong style="color:${c.ink};">Refocus</strong>. Your account is active — jump into your dashboard and find a focus buddy whenever you&rsquo;re ready.
              </p>
              <p style="margin:0 0 28px;font-size:14px;line-height:1.65;color:${c.inkMute};">
                Verifying your email is <strong style="color:${c.inkSoft};">optional</strong> and won&rsquo;t block access. It helps secure your account and shows a verified badge on your profile.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                <tr>
                  <td style="border-radius:10px;background:${c.ink};">
                    <a href="${verifyUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:${c.accentInk};text-decoration:none;">Verify email</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 6px;font-size:14px;color:${c.inkMute};">Already signed up?</p>
              <p style="margin:0 0 28px;">
                <a href="${signInUrl}" style="font-size:15px;font-weight:600;color:${c.accent};text-decoration:none;">Sign in to Refocus &rarr;</a>
              </p>
              <p style="margin:0;font-size:12px;line-height:1.55;color:${c.inkMute};">
                Link expires in 48 hours. If you didn&rsquo;t create this account, you can ignore this email.
              </p>
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

  return { subject, html, text };
}
