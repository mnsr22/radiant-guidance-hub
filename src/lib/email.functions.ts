import { z } from "zod";
import { api } from "@/lib/api";

const Campaign = z.object({
  recipients: z
    .array(
      z.object({
        email: z.string().email().max(254),
        name: z.string().max(120).optional(),
      }),
    )
    .min(1)
    .max(200),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  template: z.enum(["branded", "plain"]).default("branded"),
  heading: z.string().max(160).optional(),
  ctaLabel: z.string().max(60).optional(),
  ctaUrl: z.string().url().optional(),
  preheader: z.string().max(160).optional(),
});

const Result = z.object({
  sent: z.number().int().nonnegative(),
  failed: z.array(
    z.object({
      email: z.string().email(),
      error: z.string(),
    }),
  ),
});

/// Sends dashboard email via the authenticated backend; Resend credentials
/// remain server-side and the dashboard is deployed as a static SPA.
export async function sendAdminEmails(input: z.input<typeof Campaign>) {
  const campaign = Campaign.parse(input);
  return Result.parse(
    await api<unknown>("/admin/email-campaigns", {
      method: "POST",
      body: campaign,
    }),
  );
}
