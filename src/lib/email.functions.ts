import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { BASE_URL } from "@/lib/api";

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

const Input = z.object({
  adminToken: z.string().min(10),
  ...Campaign.shape,
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

/// Sends dashboard email through the backend's Resend transport. The backend
/// validates the admin token and keeps the Resend credential server-side.
export const sendAdminEmails = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const { adminToken, ...campaign } = data;
    const response = await fetch(`${BASE_URL}/admin/email-campaigns`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(campaign),
    });

    const result: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const details =
        typeof result === "object" && result !== null && "message" in result
          ? result.message
          : undefined;
      const message = Array.isArray(details)
        ? details.join(", ")
        : typeof details === "string"
          ? details
          : `Email sending failed (${response.status})`;
      throw new Error(message);
    }

    return Result.parse(result);
  });
