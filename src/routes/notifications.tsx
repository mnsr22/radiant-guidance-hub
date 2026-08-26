import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Send, Bell, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  useMessaging,
  useNotificationHistory,
  useAudienceCounts,
  useUsers,
} from "@/lib/admin-hooks";
import { Checkbox } from "@/components/ui/checkbox";
import { generateNotificationCopy } from "@/lib/ai.functions";
import { X, Search } from "lucide-react";

export const Route = createFileRoute("/notifications")({ component: NotificationsPage });

// Keys must match AdminMessagingService.resolveTargets on the backend.
const audienceLabel: Record<string, string> = {
  all: "All users",
  active: "Active users (30d)",
  new: "New signups (7d)",
  premium: "Premium subscribers",
  free: "Free users",
  verified: "Verified profiles",
  banned: "Banned accounts",
};

function rel(iso?: string) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type Mode = "segment" | "users";

function NotificationsPage() {
  const [mode, setMode] = useState<Mode>("segment");
  const [audience, setAudience] = useState("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  // AI copy assistant
  const [brief, setBrief] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [ideas, setIdeas] = useState<{ title: string; body: string }[]>([]);

  async function generateCopy() {
    if (brief.trim().length < 3) {
      toast.error("Describe the notification first (e.g. \"Ramadan starts in 3 days\")");
      return;
    }
    setAiBusy(true);
    try {
      const res = await generateNotificationCopy({
        data: {
          brief: brief.trim(),
          audience: mode === "segment" ? audienceLabel[audience] : "selected members",
          count: 3,
        },
      });
      setIdeas(res.suggestions);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI copy generation failed");
    } finally {
      setAiBusy(false);
    }
  }

  // Recipient picker (mode === "users")
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<{ id: string; name: string; email: string }[]>([]);

  const { broadcast } = useMessaging();
  const { data: history } = useNotificationHistory();
  const { data: counts } = useAudienceCounts();
  // Only query while the picker is open, and only once there's something to
  // search for — otherwise every keystroke pulls the full user list.
  const searchTerm = search.trim();
  const canSearch = mode === "users" && searchTerm.length >= 2;
  const { data: userResults, isFetching: searching } = useUsers(
    { search: searchTerm, limit: 8 },
    { skip: !canSearch },
  );

  // Estimated reach per UI segment, from real counts. Segments the counts
  // endpoint doesn't cover show no estimate rather than a wrong one.
  const audienceReach: Record<string, number | undefined> = {
    all: counts?.all,
    active: counts?.active,
    premium: counts?.premium,
    new: counts?.new,
    free: counts?.all != null && counts?.premium != null ? counts.all - counts.premium : undefined,
    verified: undefined,
    banned: undefined,
  };

  const pickedIds = new Set(picked.map((u) => u.id));
  const candidates = (canSearch ? (userResults?.users ?? []) : []).filter(
    (u) => !pickedIds.has(u.id),
  );

  function togglePick(u: { id: string; name: string; email: string }) {
    setPicked((cur) =>
      cur.some((x) => x.id === u.id) ? cur.filter((x) => x.id !== u.id) : [...cur, u],
    );
  }

  const sent = ((history ?? []) as any[]).map((b) => ({
    id: b.id,
    title: b.title,
    audience: audienceLabel[b.audience] ?? b.audience,
    date: rel(b.createdAt),
    reach: (b.reach ?? 0).toLocaleString(),
  }));

  async function handleSend() {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and message are required");
      return;
    }
    if (mode === "users" && picked.length === 0) {
      toast.error("Pick at least one recipient");
      return;
    }
    setSending(true);
    try {
      // userIds and audience are mutually exclusive — sending both would let
      // the backend widen a targeted message into a segment.
      const payload =
        mode === "users"
          ? { title, message: body, userIds: picked.map((u) => u.id) }
          : { title, message: body, audience };
      const res = (await broadcast.mutateAsync(payload)) as { sent: number };
      const reach = res?.sent ?? 0;
      toast.success(
        `Notification sent to ${reach.toLocaleString()} ${reach === 1 ? "user" : "users"}`,
      );
      setTitle("");
      setBody("");
      setPicked([]);
      setSearch("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Notifications & Announcements"
        description="Reach your community with the right message."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-5 shadow-elegant">
          <h3 className="font-semibold mb-4">Compose announcement</h3>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Send to</Label>
              <div className="mt-1.5 inline-flex rounded-md border p-0.5">
                <button
                  type="button"
                  onClick={() => setMode("segment")}
                  className={`px-3 py-1.5 text-xs rounded ${mode === "segment" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  An audience
                </button>
                <button
                  type="button"
                  onClick={() => setMode("users")}
                  className={`px-3 py-1.5 text-xs rounded ${mode === "users" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  Specific users
                </button>
              </div>
            </div>

            {mode === "segment" ? (
              <div>
                <Label className="text-xs">Audience</Label>
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(audienceLabel).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {audienceReach[audience] != null
                    ? `Estimated reach: ${audienceReach[audience]!.toLocaleString()} users`
                    : "Reach is calculated when you send."}
                </p>
              </div>
            ) : (
              <div>
                <Label className="text-xs">Recipients</Label>

                {picked.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {picked.map((u) => (
                      <span
                        key={u.id}
                        className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
                      >
                        {u.name || u.email}
                        <button
                          type="button"
                          aria-label={`Remove ${u.name || u.email}`}
                          onClick={() => togglePick(u)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="relative mt-1.5">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Search by name or email…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {canSearch && (
                  <div className="mt-1.5 rounded-md border divide-y max-h-52 overflow-y-auto">
                    {searching && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
                    )}
                    {!searching && candidates.length === 0 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No matches</div>
                    )}
                    {candidates.map((u) => (
                      <label
                        key={u.id}
                        className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/50"
                      >
                        <Checkbox checked={false} onCheckedChange={() => togglePick(u)} />
                        <span className="min-w-0">
                          <span className="block text-sm truncate">{u.name}</span>
                          <span className="block text-[11px] text-muted-foreground truncate">
                            {u.email}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {picked.length === 0
                    ? "Type at least 2 characters to search."
                    : `Sending to ${picked.length} ${picked.length === 1 ? "user" : "users"}.`}
                </p>
              </div>
            )}
            <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> AI copywriter
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ramadan starts in 3 days — encourage duas and profile updates"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  maxLength={300}
                />
                <Button type="button" variant="outline" disabled={aiBusy} onClick={generateCopy}>
                  {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
                </Button>
              </div>
              {ideas.length > 0 && (
                <div className="space-y-1.5">
                  {ideas.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setTitle(s.title); setBody(s.body); toast.success("Copy applied — edit before sending"); }}
                      className="w-full text-left rounded-md border bg-background px-3 py-2 hover:border-primary transition-colors"
                    >
                      <div className="text-sm font-medium">{s.title}</div>
                      <div className="text-xs text-muted-foreground">{s.body}</div>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Drafts are suggestions — review and edit before sending.
              </p>
            </div>

            <div>
              <Label className="text-xs">Title</Label>
              <Input
                className="mt-1.5"
                placeholder="Eid Mubarak 🌙"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
              />
            </div>
            <div>
              <Label className="text-xs">Message</Label>
              <Textarea
                className="mt-1.5 min-h-28"
                placeholder="Wishing you a blessed Eid filled with joy and love…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={500}
              />
              <div className="text-[11px] text-muted-foreground text-right mt-1">
                {body.length}/500
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                disabled={sending}
                onClick={handleSend}
                className="bg-gradient-primary text-primary-foreground border-0 shadow-elegant"
              >
                <Send className="h-4 w-4 mr-2" /> {sending ? "Sending…" : "Send notification"}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-5 shadow-elegant">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> Recent
          </h3>
          <div className="space-y-3">
            {sent.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No announcements sent yet.
              </div>
            )}
            {sent.map((n) => (
              <div key={n.id} className="p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                <div className="text-sm font-medium">{n.title}</div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
                  <span>{n.date}</span>
                  <Badge variant="secondary">{n.reach}</Badge>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">{n.audience}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
