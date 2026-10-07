import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Mail,
  Search,
  Send,
  Eye,
  Users as UsersIcon,
  Crown,
  ShieldCheck,
  Ban,
  Clock,
  Loader2,
} from "lucide-react";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUsers } from "@/lib/admin-hooks";
import { getToken } from "@/lib/api";
import { sendAdminEmails } from "@/lib/email.functions";
import { renderEmailHtml } from "@/lib/email-template";
import type { MockUser } from "@/lib/mock-data";
import type { GetUsersArgs } from "@/store/admin-api";

export const Route = createFileRoute("/email")({
  component: EmailPage,
  head: () => ({
    meta: [
      { title: "Email Campaigns — Halal Connect Admin" },
      {
        name: "description",
        content:
          "Send branded Halal Connect emails to individual members or segments such as premium, verified, banned or pending users.",
      },
      { property: "og:title", content: "Email Campaigns — Halal Connect Admin" },
      {
        property: "og:description",
        content: "Branded member emails and segment campaigns for Halal Connect.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Segment = "all" | "premium" | "verified" | "banned" | "pending";

const segmentMeta: Record<
  Segment,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  all: { label: "All members", icon: UsersIcon },
  premium: { label: "Premium", icon: Crown },
  verified: { label: "Verified", icon: ShieldCheck },
  banned: { label: "Banned", icon: Ban },
  pending: { label: "Pending", icon: Clock },
};

const templates = {
  custom: { heading: "", subject: "", body: "" },
  welcome: {
    subject: "Welcome to Halal Connect",
    heading: "As-salamu alaykum, {{name}} 🌙",
    body: "We're delighted to have you with us.\n\nComplete your profile and verification to start receiving thoughtful, marriage-minded matches that respect your values.\n\n— The Halal Connect team",
  },
  verification: {
    subject: "Finish your verification",
    heading: "One step left, {{name}}",
    body: "Your profile is nearly ready. Verified members receive up to 3× more quality matches and appear higher in discovery.\n\nOpen the app and upload your ID to complete verification.\n\n— The Halal Connect team",
  },
  premium: {
    subject: "Unlock unlimited matches",
    heading: "Ready for something serious, {{name}}?",
    body: "Premium gives you unlimited daily matches, message read receipts, wali summary reports and priority support.\n\nUpgrade in seconds from the Subscription tab.\n\n— The Halal Connect team",
  },
  warning: {
    subject: "Community guideline reminder",
    heading: "A quick reminder about our guidelines",
    body: "As-salamu alaykum {{name}},\n\nWe noticed activity on your account that may not align with our community guidelines. Please review them and adjust accordingly — repeated issues may lead to restrictions.\n\n— Halal Connect Moderation",
  },
  ramadan: {
    subject: "Ramadan Mubarak from Halal Connect",
    heading: "Ramadan Mubarak, {{name}} 🌙",
    body: "May this blessed month bring you peace, patience and closeness to Allah.\n\nWe've enabled Ramadan mode in the app — quieter notifications during prayer times and a daily tasbih reminder.\n\n— The Halal Connect team",
  },
} as const;

function EmailPage() {
  const [segment, setSegment] = useState<Segment>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const userQuery = useMemo<GetUsersArgs>(() => {
    const query: GetUsersArgs = {
      page,
      limit: 100,
      search: q.trim() || undefined,
    };
    if (segment === "premium") query.premium = true;
    else if (segment === "verified") query.verified = true;
    else if (segment === "banned" || segment === "pending") query.status = segment;
    return query;
  }, [page, q, segment]);
  const { data: usersData, isLoading, isFetching, isError } = useUsers(userQuery);
  const users: MockUser[] = useMemo(() => usersData?.users ?? [], [usersData?.users]);

  const [selected, setSelected] = useState<Record<string, { email: string; name: string }>>({});
  const [manual, setManual] = useState("");

  const [templateKey, setTemplateKey] = useState<keyof typeof templates>("custom");
  const [design, setDesign] = useState<"branded" | "plain">("branded");
  const [subject, setSubject] = useState("");
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const list = users;

  const allSelected = list.length > 0 && list.every((u) => selected[u.id]);
  const totalUsers = usersData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalUsers / 100));

  const manualRecipients = useMemo(
    () =>
      manual
        .split(/[,\n;\s]+/)
        .map((e) => e.trim())
        .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))
        .map((email) => ({ email, name: undefined as string | undefined })),
    [manual],
  );

  const recipients = useMemo(() => {
    const picked = Object.values(selected);
    const seen = new Set(picked.map((p) => p.email.toLowerCase()));
    return [
      ...picked,
      ...manualRecipients.filter((recipient) => {
        const key = recipient.email.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
    ];
  }, [selected, manualRecipients]);

  function applyTemplate(key: keyof typeof templates) {
    setTemplateKey(key);
    const t = templates[key];
    setSubject(t.subject);
    setHeading(t.heading);
    setBody(t.body);
  }

  function toggleAll() {
    const next = { ...selected };
    if (allSelected) list.forEach((u) => delete next[u.id]);
    else
      list.forEach((u) => {
        next[u.id] = { email: u.email, name: u.name };
      });
    setSelected(next);
  }

  const previewHtml = useMemo(
    () =>
      renderEmailHtml({
        subject: subject || "Subject preview",
        heading: heading || undefined,
        body: body || "Your message will appear here.",
        template: design,
        ctaLabel: ctaLabel || undefined,
        ctaUrl: ctaUrl || undefined,
        name: recipients[0]?.name,
      }),
    [subject, heading, body, design, ctaLabel, ctaUrl, recipients],
  );

  async function handleSend() {
    if (recipients.length === 0) return toast.error("Select at least one recipient");
    if (recipients.length > 200)
      return toast.error("Campaigns are limited to 200 recipients at a time");
    if (!subject.trim() || !body.trim()) return toast.error("Subject and message are required");
    if (ctaLabel && !ctaUrl) return toast.error("Add a link for the button");
    const adminToken = getToken();
    if (!adminToken) return toast.error("Your admin session has expired. Please sign in again.");
    setSending(true);
    try {
      const result = await sendAdminEmails({
        recipients: recipients.map((r) => ({
          email: r.email,
          name: r.name || undefined,
        })),
        subject: subject.trim(),
        body: body.trim(),
        template: design,
        heading: heading.trim() || undefined,
        ctaLabel: ctaLabel.trim() || undefined,
        ctaUrl: ctaUrl.trim() || undefined,
      });
      if (result.sent > 0)
        toast.success(`Resend accepted ${result.sent} email${result.sent === 1 ? "" : "s"}`);
      if (result.failed.length > 0) {
        toast.error(
          `${result.failed.length} not accepted — ${result.failed[0]?.error ?? "unknown error"}`,
        );
      }
      if (result.sent > 0) {
        const failedEmails = new Set(
          result.failed.map((failure) => failure.email.toLowerCase()),
        );
        setSelected(
          Object.fromEntries(
            Object.entries(selected).filter(([, recipient]) =>
              failedEmails.has(recipient.email.toLowerCase()),
            ),
          ),
        );
        setManual(
          manualRecipients
            .filter((recipient) =>
              failedEmails.has(recipient.email.toLowerCase()),
            )
            .map((recipient) => recipient.email)
            .join(", "),
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Email Campaigns"
        description="Send branded email to selected members or manual addresses. Campaign sends are limited to 200 recipients."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-4 w-4 mr-2" /> Preview
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sending}
              className="bg-gradient-primary text-primary-foreground border-0 shadow-elegant"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send to {recipients.length}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card className="shadow-elegant overflow-hidden">
          <div className="p-4 border-b space-y-3">
            <Tabs
              value={segment}
              onValueChange={(value) => {
                setSegment(value as Segment);
                setPage(1);
              }}
            >
              <TabsList className="flex flex-wrap h-auto gap-1 p-1">
                {(Object.keys(segmentMeta) as Segment[]).map((key) => {
                  const Icon = segmentMeta[key].icon;
                  return (
                    <TabsTrigger key={key} value={key} className="gap-1.5 text-xs">
                      <Icon className="h-3.5 w-3.5" />
                      {segmentMeta[key].label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name, email, country…"
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox id="all-recipients" checked={allSelected} onCheckedChange={toggleAll} />
              <Label htmlFor="all-recipients" className="cursor-pointer">
                Select all visible ({list.length})
              </Label>
              <span className="ml-auto">
                {totalUsers === 0
                  ? "No matching members"
                  : `Page ${page} of ${totalPages} · ${totalUsers} matching members`}
              </span>
            </div>
          </div>
          <div className="divide-y max-h-[380px] overflow-y-auto">
            {isError && (
              <div className="p-4 text-sm text-destructive">
                Could not load members from the backend. Check your admin session and try again.
              </div>
            )}
            {(isLoading || isFetching) && (
              <div className="p-4 text-sm text-muted-foreground">Loading members…</div>
            )}
            {list.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No members in this segment.
              </div>
            )}
            {list.map((u) => (
              <label
                key={u.id}
                className="flex items-center gap-3 p-3 hover:bg-muted/30 cursor-pointer"
              >
                <Checkbox
                  checked={!!selected[u.id]}
                  onCheckedChange={(v) =>
                    setSelected((current) => {
                      const next = { ...current };
                      if (v) next[u.id] = { email: u.email, name: u.name };
                      else delete next[u.id];
                      return next;
                    })
                  }
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    {u.name}
                    {u.verified && <ShieldCheck className="h-3.5 w-3.5 text-success" />}
                    {u.premium && <Crown className="h-3.5 w-3.5 text-warning" />}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {u.status}
                </Badge>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between border-t p-3 text-sm">
            <span>{Object.keys(selected).length} member(s) selected across pages</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages || isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
          <div className="p-4 border-t space-y-2">
            <Label htmlFor="manual">Additional emails</Label>
            <Textarea
              id="manual"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              rows={2}
              placeholder="wali@example.com, partner@example.com"
            />
            {manualRecipients.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {manualRecipients.length} valid address(es) added
              </p>
            )}
          </div>
        </Card>

        <Card className="p-4 space-y-4 shadow-elegant">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select
                value={templateKey}
                onValueChange={(v) => applyTemplate(v as keyof typeof templates)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom message</SelectItem>
                  <SelectItem value="welcome">Welcome</SelectItem>
                  <SelectItem value="verification">Verification reminder</SelectItem>
                  <SelectItem value="premium">Premium upgrade</SelectItem>
                  <SelectItem value="warning">Guideline warning</SelectItem>
                  <SelectItem value="ramadan">Ramadan greeting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Design</Label>
              <Select value={design} onValueChange={(v) => setDesign(v as "branded" | "plain")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="branded">Branded template</SelectItem>
                  <SelectItem value="plain">Plain text style</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              placeholder="Subject line"
            />
          </div>

          {design === "branded" && (
            <div className="space-y-2">
              <Label htmlFor="heading">Heading</Label>
              <Input
                id="heading"
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
                maxLength={160}
                placeholder="Defaults to the subject"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={9}
              maxLength={5000}
              placeholder="Write your message… use {{name}} to personalise."
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{"{{name}}"} is replaced with each member's name</span>
              <span>{body.length}/5000</span>
            </div>
          </div>

          {design === "branded" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cta">Button label</Label>
                <Input
                  id="cta"
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  maxLength={60}
                  placeholder="Open Halal Connect"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ctaurl">Button link</Label>
                <Input
                  id="ctaurl"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://halalconnect.app"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            <Mail className="h-4 w-4 shrink-0" />
            Emails are sent one-by-one through the backend mailer so each member is personalised and
            never sees other recipients.
          </div>
        </Card>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email preview</DialogTitle>
          </DialogHeader>
          <iframe
            title="Email preview"
            srcDoc={previewHtml}
            className="w-full h-[60vh] rounded-lg border bg-white"
          />
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
