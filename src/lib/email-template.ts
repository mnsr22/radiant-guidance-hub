// Branded Halal Connect email renderer.
// Personalisation is applied to every text field (subject, heading, preheader,
// body, CTA) so a `{{name}}` token can never leak into a delivered email.

/** Browser preview fallback; delivered emails override this with an inline attachment. */
export const EMAIL_LOGO_URL = "/halal-connect-logo.png";

/** Fallback used when a member has not set up their name yet. */
export const DEFAULT_GREETING_NAME = "there";

/** First name if we have a usable one, otherwise a warm generic greeting. */
export function greetingName(name?: string | null) {
  const clean = (name ?? "").trim().replace(/\s+/g, " ");
  if (!clean) return DEFAULT_GREETING_NAME;
  // Ignore placeholders/emails that some records carry instead of a real name.
  if (clean.includes("@") || /^(user|member|unknown|n\/?a)$/i.test(clean)) {
    return DEFAULT_GREETING_NAME;
  }
  return clean.split(" ")[0];
}

/** Replace every {{name}} / {{ name }} token with a safe display name. */
export function personalise(text: string, name?: string | null) {
  return text.replace(/\{\{\s*name\s*\}\}/gi, greetingName(name));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphs(body: string, name?: string | null) {
  return personalise(body, name)
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#3f3552;">${escapeHtml(
          p,
        ).replace(/\n/g, "<br/>")}</p>`,
    )
    .join("");
}

export function renderEmailHtml(input: {
  subject: string;
  body: string;
  template: "branded" | "plain";
  heading?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  preheader?: string;
  name?: string;
  logoUrl?: string;
}) {
  const name = input.name;
  const subject = personalise(input.subject, name);
  const heading = personalise(input.heading ?? input.subject, name);
  const preheader = personalise(input.preheader ?? input.subject, name);
  const ctaLabel = input.ctaLabel ? personalise(input.ctaLabel, name) : undefined;
  const content = paragraphs(input.body, name);
  const logoUrl = input.logoUrl ?? EMAIL_LOGO_URL;

  if (input.template === "plain") {
    return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px;">${content}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr>
<td style="padding-right:8px;"><img src="${logoUrl}" width="24" height="36" alt="Halal Connect" style="display:block;border:0;width:24px;height:36px;object-fit:contain;"/></td>
<td style="font-size:12px;color:#8b83a0;font-family:Arial,Helvetica,sans-serif;">Halal Connect</td>
</tr></table></div>`;
  }

  const cta =
    ctaLabel && input.ctaUrl
      ? `<tr><td style="padding:8px 32px 32px;"><a href="${escapeHtml(
          input.ctaUrl,
        )}" style="display:inline-block;background:#6d28d9;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:10px;">${escapeHtml(
          ctaLabel,
        )}</a></td></tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(
    subject,
  )}</title></head>
<body style="margin:0;padding:0;background:#f6f4fb;">
<span style="display:none;font-size:1px;color:#f6f4fb;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4fb;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(83,44,150,0.08);font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <tr><td style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 55%,#ffffff 160%);padding:24px 32px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:12px;vertical-align:middle;">
        <img src="${logoUrl}" width="48" height="72" alt="Halal Connect" style="display:block;border:0;width:48px;height:72px;object-fit:contain;background:transparent;"/>
      </td>
      <td style="vertical-align:middle;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
        <div style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.2px;">Halal Connect</div>
        <div style="font-size:12px;color:#ede9fe;margin-top:2px;">Marriage-minded. Faith-first.</div>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:32px 32px 8px;">
    <h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:#2c2340;">${escapeHtml(heading)}</h1>
    ${content}
  </td></tr>
  ${cta}
  <tr><td style="padding:20px 32px 28px;border-top:1px solid #efeaf9;">
    <p style="margin:0;font-size:12px;line-height:1.6;color:#8b83a0;">
      You are receiving this email because you have a Halal Connect account.<br/>
      © ${new Date().getFullYear()} Halal Connect. All rights reserved.
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}
