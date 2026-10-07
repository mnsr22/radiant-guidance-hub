import { z } from "zod";
import { api } from "@/lib/api";

async function generateWithBackend(prompt: string): Promise<string> {
  const result = z
    .object({ text: z.string() })
    .parse(await api<unknown>("/admin/ai/generate", { method: "POST", body: { prompt } }));
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
pushy. Islamic references must be accurate and gentle (e.g. adhkar, salah, Ramadan). Never promise features, refunds, verifications or upgrades.
No emoji spam — at most one tasteful emoji per notification.`;

const NotificationInput = z.object({
  brief: z.string().min(3).max(500),
  audience: z.string().max(60).optional(),
  count: z.number().int().min(1).max(5).optional(),
});

export async function generateNotificationCopy(input: z.input<typeof NotificationInput>) {
  const data = NotificationInput.parse(input);
  const count = data.count ?? 3;
  const raw = await generateWithBackend(
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
      title: String(suggestion.title ?? "").slice(0, 45),
      body: String(suggestion.body ?? "").slice(0, 140),
    }))
    .filter((suggestion) => suggestion.title && suggestion.body);
  if (suggestions.length === 0) {
    throw new Error("The AI did not return usable copy. Try again.");
  }
  return { suggestions };
}

const SummaryInput = z.object({
  reportType: z.string().max(60),
  metrics: z
    .array(
      z.object({
        label: z.string().max(60),
        value: z.string().max(40),
      }),
    )
    .max(12),
});

export async function summariseReport(input: z.input<typeof SummaryInput>) {
  const data = SummaryInput.parse(input);
  const raw = await generateWithBackend(
    `Write a two- or three-sentence executive summary for this Halal Connect
admin report. Be factual; do not speculate, advise, or use markdown. Use only
the supplied aggregate metrics.

Report: ${data.reportType}
Metrics:
${data.metrics.map((metric) => `- ${metric.label}: ${metric.value}`).join("\n")}`,
  );
  return { summary: raw.slice(0, 800) };
}
