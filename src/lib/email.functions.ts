import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { personalise, renderEmailHtml } from "./email-template";
import { EMAIL_LOGO_BASE64 } from "./email-logo";

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
            from: "Halal Connect <team@halalconnect.space>",
            to: [recipient.email],
            subject: personalise(data.subject, recipient.name),
            html,
            attachments: [
              {
                filename: "halal-connect-logo.png",
                content: EMAIL_LOGO_BASE64,
                content_id: "halal-connect-logo",
              },
            ],
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
