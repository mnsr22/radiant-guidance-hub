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

export const Route = createFileRoute("/notifications")({ component: NotificationsPage });

type Notif = { title: string; audience: string; date: string; reach: string };

const initial: Notif[] = [
  { title: "Ramadan Mubarak 🌙", audience: "All users", date: "2 days ago", reach: "14,820" },
  { title: "New Wali feature is live", audience: "Active users", date: "5 days ago", reach: "9,420" },
  { title: "Weekly halal date ideas", audience: "Premium", date: "1 week ago", reach: "2,184" },
];

const audienceLabel: Record<string, string> = {
  all: "All users",
  active: "Active users (30d)",
  premium: "Premium subscribers",
  new: "New signups (7d)",
  region: "By region",
};

const audienceReach: Record<string, number> = {
  all: 15240,
  active: 10580,
  premium: 2184,
  new: 284,
  region: 4120,
};

function NotificationsPage() {
  const [audience, setAudience] = useState("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sent, setSent] = useState<Notif[]>(initial);
  const [sending, setSending] = useState(false);

  function handleSend() {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and message are required");
      return;
    }
    setSending(true);
    setTimeout(() => {
      const reach = audienceReach[audience] ?? 0;
      setSent((prev) => [
        { title, audience: audienceLabel[audience], date: "just now", reach: reach.toLocaleString() },
        ...prev,
      ]);
      toast.success(`Notification sent to ${reach.toLocaleString()} users`);
      setTitle("");
      setBody("");
      setSending(false);
    }, 600);
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
            {sent.map((n, i) => (
              <div key={`${n.title}-${i}`} className="p-3 rounded-lg border hover:bg-muted/30 transition-colors">
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
