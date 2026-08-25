// Gemini-backed admin AI helpers.
//
// SECURITY: GEMINI_API_KEY is read inside the handler only. It is never sent to
// the browser, never prefixed with VITE_, and the Flutter app must call the
// NestJS backend (which holds its own copy of the key) — never Google directly.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MODEL = "gemini-2.5-flash";
const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

/// Single low-level call. Returns raw model text.
async function gemini(system: string, user: string, json: boolean): Promise<string> {
  const key = process.env["GEMINI_API_KEY"];
  if (!key) throw new Error("GEMINI_API_KEY is not configured on the server.");

  const res = await fetch(ENDPOINT(MODEL), {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 1200,
        ...(json ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    // Surface the provider status/body instead of a generic 500 so the admin
    // sees "key invalid" / "quota exceeded" rather than "something broke".
    throw new Error(`Gemini request failed [${res.status}]: ${text.slice(0, 400)}`);
  }
  const data = JSON.parse(text) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const out = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!out.trim()) throw new Error("Gemini returned an empty response.");
  return out.trim();
}

/// Tolerant JSON extraction — models occasionally wrap JSON in prose or fences.
function parseJson<T>(raw: string, fallback: T): T {
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.search(/[[{]/);
    const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        /* fall through */
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

// ── 1. Notification campaign copy ──────────────────────────────
export const generateNotificationCopy = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        brief: z.string().min(3).max(500),
        audience: z.string().max(60).optional(),
        count: z.number().int().min(1).max(5).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const n = data.count ?? 3;
    const raw = await gemini(
      `${HOUSE_STYLE}
You draft push-notification copy. Titles are at most 45 characters, bodies at
most 140 characters. Reply ONLY with JSON of the shape
{"suggestions":[{"title":"...","body":"..."}]}.`,
      `Audience: ${data.audience ?? "all users"}.
Write ${n} distinct notification options for this brief: ${data.brief}`,
      true,
    );
    const parsed = parseJson<{ suggestions?: { title?: string; body?: string }[] }>(raw, {});
    const suggestions = (parsed.suggestions ?? [])
      .map((s) => ({
        title: String(s.title ?? "").slice(0, 80),
        body: String(s.body ?? "").slice(0, 500),
      }))
      .filter((s) => s.title && s.body);
    if (suggestions.length === 0) throw new Error("The AI did not return usable copy. Try again.");
    return { suggestions };
  });

// ── 2. Support reply suggestion + human-handoff decision ───────
const HANDOFF_RULES = `Escalate to a human (handoff = true) whenever the request needs:
account investigation, payment or refund investigation, verification review,
safety/abuse investigation, user reports, administrative action, or anything
you cannot answer from the facts you were given.
CRITICAL: never claim an action happened. Do NOT write "your account has been
verified", "your subscription was upgraded", "your payment was refunded", or
anything similar, unless the FACTS block explicitly states it. When a human is
needed, say you have passed the request to the support team and that they will
follow up — nothing more.`;

export const suggestSupportReply = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        subject: z.string().max(300),
        message: z.string().min(1).max(6000),
        category: z.string().max(60).optional(),
        // Verified backend facts only. Anything absent must not be invented.
        facts: z.string().max(2000).optional(),
        history: z
          .array(z.object({ fromAdmin: z.boolean(), body: z.string().max(4000) }))
          .max(20)
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const convo = (data.history ?? [])
      .map((h) => `${h.fromAdmin ? "SUPPORT" : "MEMBER"}: ${h.body}`)
      .join("\n");

    const raw = await gemini(
      `${HOUSE_STYLE}
You are the Halal Connect support assistant drafting a reply for a HUMAN agent
to review. You may explain: account features, subscription plans and limits,
how verification works, how the wali (guardian) system works, prayer times,
tasbih/adhkar, navigating the app, and basic troubleshooting.
${HANDOFF_RULES}
Reply ONLY with JSON:
{"reply":"...","handoff":true|false,"status":"AI_HANDLED"|"HUMAN_REQUIRED"|"PENDING_HUMAN"|"RESOLVED","reason":"one short sentence"}`,
      `Category: ${data.category ?? "other"}
Subject: ${data.subject}
FACTS (verified backend data — the ONLY things you may state about this account):
${data.facts?.trim() || "(none provided — do not state anything about this member's account)"}

Member message:
${data.message}

${convo ? `Conversation so far:\n${convo}` : ""}`,
      true,
    );

    const parsed = parseJson<{
      reply?: string;
      handoff?: boolean;
      status?: string;
      reason?: string;
    }>(raw, {});
    const allowed = ["AI_HANDLED", "HUMAN_REQUIRED", "PENDING_HUMAN", "RESOLVED"] as const;
    const status = (allowed as readonly string[]).includes(parsed.status ?? "")
      ? (parsed.status as (typeof allowed)[number])
      : parsed.handoff
        ? "HUMAN_REQUIRED"
        : "AI_HANDLED";
    const reply = String(parsed.reply ?? "").trim();
    if (!reply) throw new Error("The AI did not return a usable reply. Try again.");
    return {
      reply,
      handoff: Boolean(parsed.handoff) || status === "HUMAN_REQUIRED",
      status,
      reason: String(parsed.reason ?? "").slice(0, 300),
    };
  });

// ── 3. Report narrative summary (used by the PDF header) ───────
export const summariseReport = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        reportType: z.string().max(60),
        metrics: z.array(z.object({ label: z.string().max(60), value: z.string().max(40) })).max(12),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const raw = await gemini(
      `You write executive summaries for internal admin reports at Halal Connect.
Two to three plain sentences. Factual, no speculation, no advice, no markdown.
Only use the numbers provided.`,
      `Report: ${data.reportType}
Metrics:
${data.metrics.map((m) => `- ${m.label}: ${m.value}`).join("\n")}`,
      false,
    );
    return { summary: raw.slice(0, 800) };
  });
