import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, Send, ShieldCheck, Crown, AlertTriangle, Users as UsersIcon, Ban, Clock } from "lucide-react";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { mockUsers, mockReports, type MockUser } from "@/lib/mock-data";

export const Route = createFileRoute("/messaging")({ component: MessagingPage });

type Category = "all" | "reported" | "premium" | "verified" | "banned" | "pending";

const categoryMeta: Record<Category, { label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = {
  all:      { label: "All Users",  icon: UsersIcon,      description: "Every registered user" },
  reported: { label: "Reported",   icon: AlertTriangle,  description: "Users with active reports" },
  premium:  { label: "Premium",    icon: Crown,          description: "Paid subscribers" },
  verified: { label: "Verified",   icon: ShieldCheck,    description: "Identity-verified members" },
  banned:   { label: "Banned",     icon: Ban,            description: "Accounts currently banned" },
  pending:  { label: "Pending",    icon: Clock,          description: "Awaiting review" },
};

function MessagingPage() {
  const [tab, setTab] = useState<Category>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTarget, setComposeTarget] = useState<MockUser[]>([]);
  const [template, setTemplate] = useState("custom");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const reportedNames = useMemo(() => new Set(mockReports.map((r) => r.reportedUser)), []);

  const buckets: Record<Category, MockUser[]> = useMemo(() => ({
    all: mockUsers,
    reported: mockUsers.filter((u) => reportedNames.has(u.name)),
    premium: mockUsers.filter((u) => u.premium),
    verified: mockUsers.filter((u) => u.verified),
    banned: mockUsers.filter((u) => u.status === "banned"),
    pending: mockUsers.filter((u) => u.status === "pending"),
  }), [reportedNames]);

  const list = useMemo(() => {
    const base = buckets[tab];
    if (!q) return base;
    const needle = q.toLowerCase();
    return base.filter((u) => `${u.name} ${u.email} ${u.country}`.toLowerCase().includes(needle));
  }, [buckets, tab, q]);

  const selectedUsers = useMemo(() => list.filter((u) => selected[u.id]), [list, selected]);
  const allSelected = list.length > 0 && list.every((u) => selected[u.id]);

  function toggleAll() {
    const next = { ...selected };
    if (allSelected) {
      list.forEach((u) => delete next[u.id]);
    } else {
      list.forEach((u) => { next[u.id] = true; });
    }
    setSelected(next);
  }

  function openCompose(targets: MockUser[]) {
    if (targets.length === 0) {
      toast.error("Select at least one user");
      return;
    }
    setComposeTarget(targets);
    setSubject("");
    setBody("");
    setTemplate("custom");
    setComposeOpen(true);
  }

  function applyTemplate(value: string) {
    setTemplate(value);
    switch (value) {
      case "warning":
        setSubject("Community guideline reminder");
        setBody("As-salamu alaykum,\n\nWe noticed activity on your account that may not align with our community guidelines. Please review them and adjust your behavior accordingly. Repeated issues may lead to restrictions.\n\n— Noor Admin Team");
        break;
      case "followup":
        setSubject("Following up on your recent report");
        setBody("As-salamu alaykum,\n\nThank you for taking the time to report a concern on Noor. Our moderation team has reviewed it and taken appropriate action. Please reply if you have any additional details.\n\n— Noor Admin Team");
        break;
      case "welcome":
        setSubject("Welcome to Noor 💜");
        setBody("As-salamu alaykum and welcome!\n\nWe're delighted to have you. Complete your profile to start receiving thoughtful, halal-friendly matches.\n\n— Noor Admin Team");
        break;
      default:
        setSubject("");
        setBody("");
    }
  }

  function send() {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and message are required");
      return;
    }
    toast.success(`Message sent to ${composeTarget.length} user${composeTarget.length === 1 ? "" : "s"}`);
    setComposeOpen(false);
    setSelected({});
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Messaging"
        description="Send follow-ups, warnings, or announcements to any user — by category."
        actions={
          <Button
            size="sm"
            onClick={() => openCompose(selectedUsers)}
            className="bg-gradient-primary text-primary-foreground border-0 shadow-elegant"
          >
            <Send className="h-4 w-4 mr-2" />
            Message selected ({selectedUsers.length})
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => { setTab(v as Category); setSelected({}); }}>
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          {(Object.keys(categoryMeta) as Category[]).map((key) => {
            const meta = categoryMeta[key];
            const Icon = meta.icon;
            return (
              <TabsTrigger key={key} value={key} className="gap-2">
                <Icon className="h-3.5 w-3.5" />
                {meta.label}
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">{buckets[key].length}</Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(Object.keys(categoryMeta) as Category[]).map((key) => (
          <TabsContent key={key} value={key} className="mt-4 space-y-4">
            <Card className="p-4 shadow-elegant">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={`Search ${categoryMeta[key].label.toLowerCase()}…`}
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} id="select-all" />
                  <Label htmlFor="select-all" className="cursor-pointer">Select all visible</Label>
                </div>
              </div>
            </Card>

            <Card className="shadow-elegant overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{categoryMeta[key].label}</h3>
                  <p className="text-xs text-muted-foreground">{categoryMeta[key].description} · {list.length} shown</p>
                </div>
              </div>
              <div className="divide-y max-h-[560px] overflow-y-auto">
                {list.length === 0 && (
                  <div className="p-10 text-center text-sm text-muted-foreground">No users in this category.</div>
                )}
                {list.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors">
                    <Checkbox
                      checked={!!selected[u.id]}
                      onCheckedChange={(v) => setSelected((s) => ({ ...s, [u.id]: !!v }))}
                    />
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                        {u.name.split(" ").map((p) => p[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium flex items-center gap-1.5">
                        {u.name}
                        {u.verified && <ShieldCheck className="h-3.5 w-3.5 text-success" />}
                        {u.premium && <Crown className="h-3.5 w-3.5 text-warning" />}
                        {reportedNames.has(u.name) && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {u.email} · {u.city}, {u.country}
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        u.status === "active" ? "bg-success/15 text-success border-0"
                        : u.status === "banned" ? "bg-destructive/15 text-destructive border-0"
                        : u.status === "pending" ? "bg-warning/15 text-warning border-0"
                        : ""
                      }
                    >
                      {u.status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openCompose([u])}
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Message
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Compose message</DialogTitle>
            <DialogDescription>
              Sending to {composeTarget.length} user{composeTarget.length === 1 ? "" : "s"}
              {composeTarget.length === 1 && `: ${composeTarget[0].name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={template} onValueChange={applyTemplate}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom message</SelectItem>
                  <SelectItem value="followup">Report follow-up</SelectItem>
                  <SelectItem value="warning">Guideline warning</SelectItem>
                  <SelectItem value="welcome">Welcome message</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" maxLength={120} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder="Write your message…" maxLength={2000} />
              <div className="text-xs text-muted-foreground text-right">{body.length}/2000</div>
            </div>

            {composeTarget.length > 1 && (
              <div className="rounded-lg border bg-muted/30 p-3 max-h-28 overflow-y-auto">
                <div className="text-xs font-medium mb-1.5">Recipients</div>
                <div className="flex flex-wrap gap-1.5">
                  {composeTarget.slice(0, 20).map((u) => (
                    <Badge key={u.id} variant="secondary" className="text-xs">{u.name}</Badge>
                  ))}
                  {composeTarget.length > 20 && (
                    <Badge variant="secondary" className="text-xs">+{composeTarget.length - 20} more</Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
            <Button onClick={send} className="bg-gradient-primary text-primary-foreground border-0">
              <Send className="h-4 w-4 mr-2" />
              Send message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
