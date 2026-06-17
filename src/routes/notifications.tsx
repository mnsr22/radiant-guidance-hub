import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Send, Bell } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useMessaging, useNotificationHistory, useAudienceCounts } from "@/lib/admin-hooks";

export const Route = createFileRoute("/notifications")({ component: NotificationsPage });

const audienceLabel: Record<string, string> = {
  all: "All users",
  active: "Active users (30d)",
  premium: "Premium subscribers",
  new: "New signups (7d)",
  region: "By region",
  free: "Free users",
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

function NotificationsPage() {
  const [audience, setAudience] = useState("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const { broadcast } = useMessaging();
  const { data: history } = useNotificationHistory();
  const { data: counts } = useAudienceCounts();

  // Estimated reach per UI segment, from real counts.
  const audienceReach: Record<string, number> = {
    all: counts?.all ?? 0,
    active: counts?.active ?? 0,
    premium: counts?.premium ?? 0,
    new: counts?.new ?? 0,
    region: counts?.all ?? 0,
  };

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
    setSending(true);
    // Backend audiences are all | free | premium; map the UI segments onto them.
    const apiAudience = audience === "premium" ? "premium" : "all";
    try {
      const res = (await broadcast.mutateAsync({ title, message: body, audience: apiAudience })) as {
        sent: number;
      };
      const reach = res?.sent ?? audienceReach[audience] ?? 0;
      toast.success(`Notification sent to ${reach.toLocaleString()} users`);
      setTitle("");
      setBody("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <AdminLayout>
      <PageHeader title="Notifications & Announcements" description="Reach your community with the right message." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-5 shadow-elegant">
          <h3 className="font-semibold mb-4">Compose announcement</h3>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Audience</Label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  <SelectItem value="active">Active users (30d)</SelectItem>
                  <SelectItem value="premium">Premium subscribers</SelectItem>
                  <SelectItem value="new">New signups (7d)</SelectItem>
                  <SelectItem value="region">By region</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Estimated reach: {(audienceReach[audience] ?? 0).toLocaleString()} users
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
              <div className="text-[11px] text-muted-foreground text-right mt-1">{body.length}/500</div>
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
              <div className="p-6 text-center text-sm text-muted-foreground">No announcements sent yet.</div>
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
