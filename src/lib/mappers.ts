// Maps backend /api/admin responses to the shapes the UI already renders
// (see lib/mock-data.ts types). Shared by the RTK Query endpoints.
import { formatDistanceToNow } from "date-fns";
import type { MockUser, Report, Conversation, AuditLog } from "./mock-data";

export function rel(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
}

export function dateStr(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toISOString().slice(0, 10);
}

// Backend status (active|pending|suspended|banned) ↔ UI status (…|inactive|…).
export function toUiStatus(s: string): MockUser["status"] {
  return s === "suspended" ? "inactive" : (s as MockUser["status"]);
}
export function toApiStatus(s: MockUser["status"]): string {
  return s === "inactive" ? "suspended" : s;
}

export function mapUser(u: any): MockUser {
  return {
    id: u.id,
    name: u.name ?? "",
    email: u.email ?? "",
    age: u.age ?? 0,
    gender: u.gender === "Female" ? "Female" : "Male",
    country: u.country ?? "—",
    city: u.city ?? "—",
    practice: (u.practice ?? "Learning") as MockUser["practice"],
    madhab: (u.madhab ?? "Other") as MockUser["madhab"],
    status: toUiStatus(u.status ?? "active"),
    verified: !!u.verified,
    premium: !!u.premium,
    completeness: u.completeness ?? 0,
    lastActive: rel(u.lastActive),
    joined: dateStr(u.joined),
  };
}

export function mapReport(r: any): Report {
  const status = r.status === "open" ? "pending" : r.status;
  return {
    id: r.id,
    reportedUser: r.reportedUser ?? "—",
    reporter: r.reporter ?? "—",
    category: (r.category ?? "Other") as Report["category"],
    severity: (r.severity ?? "low") as Report["severity"],
    status: (status === "dismissed" ? "resolved" : status) as Report["status"],
    date: rel(r.date),
  };
}

export function mapConversation(c: any): Conversation {
  return {
    id: c.id,
    participants: (c.participants ?? ["—", "—"]) as [string, string],
    participantIds: c.participantIds as [string, string] | undefined,
    messageCount: c.messageCount ?? 0,
    flagged: !!c.flagged,
    flagReason: c.flagged ? "Flagged by moderation" : undefined,
    lastMessage: rel(c.lastMessageAt),
  };
}

export function mapLog(l: any): AuditLog {
  return {
    id: l.id,
    admin: l.admin ?? "system",
    action: l.action ?? "",
    target: l.target ?? "",
    timestamp: rel(l.timestamp),
  };
}
