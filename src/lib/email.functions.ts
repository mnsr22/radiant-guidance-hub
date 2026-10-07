import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { renderEmailHtml } from "@/lib/email-template";

const API_BASE = "https://admin.halalconnect.space/api";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM = "Halal Connect <team@halalconnect.space>";

const Message = z.object({
  to: z.string().email(),
  name: z.string().max(200).optional(),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(20000),
  heading: z.string().max(300).optional(),
  ctaLabel: z.string().max(100).optional(),
  ctaUrl: z.string().url().optional(),
  template: z.enum(["branded", "plain"]).default("branded"),
});

const Input = z.object({
  adminToken: z.string().min(10),
  messages: z.array(Message).min(1).max(200),
});

async function loadLogoBase64(): Promise<string | null> {
  try {
    const origin = new URL(getRequest().url).origin;
    const res = await fetch(`${origin}/halal-connect-logo.png`);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  } catch {
    return null;
  }
}

/// Sends one email per recipient through Resend. Only signed-in admins can
/// call it: the admin token is checked against the Halal Connect server.
export const sendAdminEmails = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const me = await fetch(`${API_BASE}/admin/me`, {
      headers: { Authorization: `Bearer ${data.adminToken}` },
    }).catch(() => null);
    if (!me || !me.ok) throw new Error("Not authorised to send email — sign in again.");

    const lovableKey = process.env["LOVABLE_API_KEY"];
    const resendKey = process.env["RESEND_API_KEY"];
    if (!lovableKey || !resendKey) throw new Error("Email sending is not configured.");

    const logo = await loadLogoBase64();
    const logoUrl = logo ? "cid:halal-connect-logo" : undefined;

    let sent = 0;
    const failed: { email: string; error: string }[] = [];
    for (const m of data.messages) {
      const html = renderEmailHtml({ ...m, logoUrl });
      const subject = m.subject.replace(/\{\{\s*name\s*\}\}/gi, m.name?.split(" ")[0] || "there");
      const res = await fetch(`${GATEWAY_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": resendKey,
        },
        body: JSON.stringify({
          from: FROM,
          to: [m.to],
          subject,
          html,
          ...(logo
            ? { attachments: [{ filename: "halal-connect-logo.png", content: logo, content_id: "halal-connect-logo" }] }
            : {}),
        }),
      });
      if (res.ok) sent++;
      else {
        const txt = await res.text();
        console.error(`Resend failed [${res.status}] for ${m.to}: ${txt}`);
        failed.push({ email: m.to, error: `${res.status} ${txt.slice(0, 200)}` });
      }
    }
    return { sent, failed };
  });
