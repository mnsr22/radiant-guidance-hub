import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

const recipientSchema = z.object({
  email: z.string().email(),
  name: z.string().max(120).optional(),
});

const sendSchema = z.object({
  recipients: z.array(recipientSchema).min(1).max(200),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  template: z.enum(["branded", "plain"]).default("branded"),
  heading: z.string().max(160).optional(),
  ctaLabel: z.string().max(60).optional(),
  ctaUrl: z.string().url().optional(),
  preheader: z.string().max(160).optional(),
});

export type SendEmailInput = z.infer<typeof sendSchema>;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphs(body: string, name?: string) {
  const personalised = body.replace(/\{\{\s*name\s*\}\}/g, name ?? "there");
  return personalised
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
}) {
  const content = paragraphs(input.body, input.name);
  if (input.template === "plain") {
    return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px;">${content}<p style="font-size:12px;color:#8b83a0;margin-top:24px;">Halal Connect</p></div>`;
  }

  const cta =
    input.ctaLabel && input.ctaUrl
      ? `<tr><td style="padding:8px 32px 32px;"><a href="${escapeHtml(
          input.ctaUrl,
        )}" style="display:inline-block;background:#6d28d9;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:10px;">${escapeHtml(
          input.ctaLabel,
        )}</a></td></tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(
    input.subject,
  )}</title></head>
<body style="margin:0;padding:0;background:#f6f4fb;">
<span style="display:none;font-size:1px;color:#f6f4fb;">${escapeHtml(input.preheader ?? input.subject)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4fb;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(83,44,150,0.08);font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <tr><td style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 55%,#ffffff 160%);padding:28px 32px;">
    <div style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.2px;">☾ Halal Connect</div>
    <div style="font-size:12px;color:#ede9fe;margin-top:4px;">Marriage-minded. Faith-first.</div>
  </td></tr>
  <tr><td style="padding:32px 32px 8px;">
    <h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:#2c2340;">${escapeHtml(
      input.heading ?? input.subject,
    )}</h1>
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

export const previewEmail = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => sendSchema.parse(data))
  .handler(async ({ data }) => ({
    html: renderEmailHtml({ ...data, name: data.recipients[0]?.name }),
  }));

export const sendAdminEmail = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => sendSchema.parse(data))
  .handler(async ({ data }) => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const resendKey = process.env["RESEND_API_KEY"];
    if (!lovableKey || !resendKey) {
      throw new Error("Email is not configured. Connect Resend in project settings.");
    }

    const results: { email: string; ok: boolean; error?: string }[] = [];

    for (const recipient of data.recipients) {
      const html = renderEmailHtml({ ...data, name: recipient.name });
      try {
        const response = await fetch(`${GATEWAY_URL}/emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": resendKey,
          },
          body: JSON.stringify({
            from: "Halal Connect <onboarding@resend.dev>",
            to: [recipient.email],
            subject: data.subject,
            html,
          }),
        });
        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`Resend send failed [${response.status}]: ${errorBody}`);
          results.push({ email: recipient.email, ok: false, error: `${response.status}: ${errorBody}` });
          continue;
        }
        results.push({ email: recipient.email, ok: true });
      } catch (error) {
        results.push({
          email: recipient.email,
          ok: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      sent: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok),
    };
  });
