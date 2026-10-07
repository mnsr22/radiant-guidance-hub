// Admin AI requests are proxied through the authenticated backend so the
// Gemini key and shared free-tier budget stay server-side.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { BASE_URL } from "@/lib/api";

async function generateWithBackend(adminToken: string, prompt: string): Promise<string> {
  const response = await fetch(`${BASE_URL}/admin/ai/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ prompt }),
    signal: AbortSignal.timeout(15_000),
  });

  const responseText = await response.text();
  if (!response.ok) {
    let message = `AI request failed (${response.status})`;
    try {
      const body = JSON.parse(responseText) as {
        message?: string | string[];
      };
      if (Array.isArray(body.message)) message = body.message.join(", ");
      else if (body.message) message = body.message;
    } catch {
      // Keep the status-based error when the backend response is not JSON.
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("Your admin session has expired. Please sign in again.");
    }
    throw new Error(message);
  }

  const result = z.object({ text: z.string() }).parse(JSON.parse(responseText));
  if (!result.text.trim()) throw new Error("Gemini returned an empty response.");
  return result.text.trim();
}

function parseJson<T>(raw: string, fallback: T): T {
  const cleaned = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.search(/[[{]/);
    const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        // Fall through to the caller's validation error.
      }
    }
    return fallback;
  }
}

const HOUSE_STYLE = `You write for Halal Connect, a Muslim marriage (nikah-intent) app.
Tone: warm, respectful, concise, family-appropriate. Never flirtatious, never
pushy. Islamic references must be accurate and gentle (e.g. adhkar, salah,
Ramadan). Never promise features, refunds, verifications or upgrades.
No emoji spam — at most one tasteful emoji per notification.`;

export const generateNotificationCopy = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        adminToken: z.string().min(10).max(4096),
        brief: z.string().min(3).max(500),
        audience: z.string().max(60).optional(),
        count: z.number().int().min(1).max(5).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const count = data.count ?? 3;
    const raw = await generateWithBackend(
      data.adminToken,
      `${HOUSE_STYLE}
Draft push-notification copy. Titles must be at most 45 characters and bodies
at most 140 characters. Reply only with JSON:
{"suggestions":[{"title":"...","body":"..."}]}

Audience: ${data.audience ?? "all users"}
Write ${count} distinct options for this brief: ${data.brief}`,
    );
    const parsed = parseJson<{
      suggestions?: { title?: string; body?: string }[];
    }>(raw, {});
    const suggestions = (parsed.suggestions ?? [])
      .map((suggestion) => ({
        title: String(suggestion.title ?? "").slice(0, 80),
        body: String(suggestion.body ?? "").slice(0, 500),
      }))
      .filter((suggestion) => suggestion.title && suggestion.body);
    if (suggestions.length === 0) {
      throw new Error("The AI did not return usable copy. Try again.");
    }
    return { suggestions };
  });

export const summariseReport = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        adminToken: z.string().min(10).max(4096),
        reportType: z.string().max(60),
        metrics: z
          .array(
            z.object({
              label: z.string().max(60),
              value: z.string().max(40),
            }),
          )
          .max(12),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const raw = await generateWithBackend(
      data.adminToken,
      `Write a two- or three-sentence executive summary for this Halal Connect
admin report. Be factual; do not speculate, advise, or use markdown. Use only
the supplied aggregate metrics.

Report: ${data.reportType}
Metrics:
${data.metrics.map((metric) => `- ${metric.label}: ${metric.value}`).join("\n")}`,
    );
    return { summary: raw.slice(0, 800) };
  });
