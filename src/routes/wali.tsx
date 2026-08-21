import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ShieldCheck, Search, Mail, Send, Ban, CheckCircle2, Users, Download, Eye,
} from "lucide-react";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { downloadCSV } from "@/lib/csv";
import { useWaliLinks, useWaliSettings, useWaliMutations } from "@/lib/admin-hooks";
import type { WaliLink, WaliSettings, WaliStatus } from "@/store/admin-api";

export const Route = createFileRoute("/wali")({
  component: WaliPage,
  head: () => ({
    meta: [
      { title: "Wali Oversight · Halal Connect Admin" },
      {
        name: "description",
        content:
          "Manage guardian (wali) assignments, chat CC delivery and match approvals across Halal Connect members.",
      },
      { property: "og:title", content: "Wali Oversight · Halal Connect Admin" },
      {
        property: "og:description",
        content: "Guardian assignments, chat CC delivery and match approval controls.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const STATUSES: WaliStatus[] = ["pending", "active", "revoked", "declined"];

const statusVariant = (s: WaliStatus) =>
  s === "active" ? "default" : s === "pending" ? "secondary" : "outline";

const dateStr = (iso?: string | null) => (!iso ? "—" : new Date(iso).toLocaleDateString());

// Shown until the backend /admin/wali endpoints are live.
const SAMPLE: WaliLink[] = [
  {
    id: "w1", userId: "u1", userName: "Aisha Rahman", userEmail: "aisha@example.com",
    userGender: "Female", waliName: "Yusuf Rahman", waliEmail: "yusuf.rahman@example.com",
    waliPhone: "+254 700 111 222", relationship: "Father", status: "active",
    ccChats: true, ccMatches: true, approvalRequired: true, ccCount: 148,
    lastCcAt: new Date(Date.now() - 3.6e6).toISOString(),
    invitedAt: "2026-05-02T10:00:00Z", acceptedAt: "2026-05-02T18:20:00Z",
    createdAt: "2026-05-02T10:00:00Z",
  },
  {
    id: "w2", userId: "u2", userName: "Fatima Noor", userEmail: "fatima@example.com",
    userGender: "Female", waliName: "Ibrahim Noor", waliEmail: "ibrahim.noor@example.com",
    waliPhone: "+254 711 333 444", relationship: "Brother", status: "pending",
    ccChats: true, ccMatches: false, approvalRequired: true, ccCount: 0,
    lastCcAt: null, invitedAt: "2026-08-18T09:15:00Z", acceptedAt: null,
    createdAt: "2026-08-18T09:15:00Z",
  },
  {
    id: "w3", userId: "u3", userName: "Maryam Ali", userEmail: "maryam@example.com",
    userGender: "Female", waliName: "Hamza Ali", waliEmail: "hamza.ali@example.com",
    waliPhone: null, relationship: "Uncle", status: "revoked",
    ccChats: false, ccMatches: false, approvalRequired: false, ccCount: 27,
    lastCcAt: "2026-07-01T12:00:00Z", invitedAt: "2026-04-11T08:00:00Z",
    acceptedAt: "2026-04-12T08:00:00Z", createdAt: "2026-04-11T08:00:00Z",
  },
];

const DEFAULT_SETTINGS: WaliSettings = {
  waliEnabled: true,
  requireWaliForSisters: true,
  ccAllChats: true,
  ccDigestFrequency: "daily",
  waliApprovalForMatches: true,
  inviteExpiryDays: 7,
};

function WaliPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const { data, isLoading } = useWaliLinks();
  const { data: storedSettings } = useWaliSettings();
  const mut = useWaliMutations();

  const links = (data && data.length > 0 ? data : SAMPLE) as WaliLink[];
  const usingSample = !isLoading && (!data || data.length === 0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return links.filter((l) => {
      if (status !== "all" && l.status !== status) return false;
      if (!q) return true;
      return [
        l.userName, l.userEmail, l.userGender, l.waliName, l.waliEmail,
        l.waliPhone, l.relationship, l.status, l.id, l.userId,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [links, search, status]);

  const activeCount = links.filter((l) => l.status === "active").length;
  const pendingCount = links.filter((l) => l.status === "pending").length;
  const ccOn = links.filter((l) => l.ccChats && l.status === "active").length;

  function act(l: WaliLink, next: WaliStatus) {
    mut.setStatus.mutate(
      { id: l.id, status: next },
      {
        onSuccess: () => toast.success(`${l.waliName} ${next === "active" ? "approved" : next}`),
        onError: () => toast.error("Backend not connected yet — action not saved"),
      },
    );
  }

  function toggleCc(l: WaliLink, field: "ccChats" | "ccMatches" | "approvalRequired", v: boolean) {
    mut.updateLink.mutate(
      { id: l.id, [field]: v },
      {
        onSuccess: () => toast.success("Guardian settings updated"),
        onError: () => toast.error("Backend not connected yet — change not saved"),
      },
    );
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Wali (Guardian) Oversight"
        description="See every guardian a member has assigned, control chat CC delivery and match approvals."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-4">
        <StatCard label="Active guardians" value={String(activeCount)} icon={ShieldCheck} />
        <StatCard label="Pending invites" value={String(pendingCount)} icon={Mail} />
        <StatCard label="Chat CC enabled" value={String(ccOn)} icon={Eye} />
        <StatCard label="Members with a wali" value={String(links.length)} icon={Users} />
      </div>

      <Tabs defaultValue="links" className="space-y-4">
        <TabsList>
          <TabsTrigger value="links">Guardian assignments</TabsTrigger>
          <TabsTrigger value="rules">Wali rules</TabsTrigger>
        </TabsList>

        <TabsContent value="links">
          <Card>
            <CardHeader className="gap-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <CardTitle className="text-base">
                  Guardian assignments ({filtered.length})
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search member, wali, email, phone…"
                      className="pl-8 w-full md:w-72"
                    />
                  </div>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => downloadCSV("wali-assignments", filtered as unknown as Record<string, unknown>[])}
                  >
                    <Download className="h-4 w-4 mr-2" /> Export
                  </Button>
                </div>
              </div>
              {usingSample && (
                <p className="text-xs text-muted-foreground">
                  Showing sample data — connect <code>GET /api/admin/wali</code> to load live assignments.
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Wali</TableHead>
                      <TableHead>Relationship</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>CC chats</TableHead>
                      <TableHead>CC matches</TableHead>
                      <TableHead>Approval</TableHead>
                      <TableHead>Last CC</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                          No guardians match “{search}”.
                        </TableCell>
                      </TableRow>
                    )}
                    {filtered.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>
                          <div className="font-medium">{l.userName}</div>
                          <div className="text-xs text-muted-foreground">{l.userEmail ?? "—"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{l.waliName}</div>
                          <div className="text-xs text-muted-foreground">
                            {l.waliEmail}{l.waliPhone ? ` · ${l.waliPhone}` : ""}
                          </div>
                        </TableCell>
                        <TableCell>{l.relationship}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(l.status)} className="capitalize">{l.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={l.ccChats}
                            disabled={l.status !== "active"}
                            onCheckedChange={(v) => toggleCc(l, "ccChats", v)}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={l.ccMatches}
                            disabled={l.status !== "active"}
                            onCheckedChange={(v) => toggleCc(l, "ccMatches", v)}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={l.approvalRequired}
                            disabled={l.status !== "active"}
                            onCheckedChange={(v) => toggleCc(l, "approvalRequired", v)}
                          />
                        </TableCell>
                        <TableCell className="text-sm">
                          {dateStr(l.lastCcAt)}
                          <div className="text-xs text-muted-foreground">{l.ccCount ?? 0} sent</div>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {l.status === "pending" && (
                            <>
                              <Button
                                size="icon" variant="ghost" title="Resend invite"
                                onClick={() =>
                                  mut.resendInvite.mutate(l.id, {
                                    onSuccess: () => toast.success(`Invite resent to ${l.waliEmail}`),
                                    onError: () => toast.error("Backend not connected yet"),
                                  })
                                }
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" title="Approve guardian" onClick={() => act(l, "active")}>
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                              </Button>
                            </>
                          )}
                          {l.status === "active" && (
                            <Button size="icon" variant="ghost" title="Revoke guardian" onClick={() => act(l, "revoked")}>
                              <Ban className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                          {(l.status === "revoked" || l.status === "declined") && (
                            <Button size="sm" variant="outline" onClick={() => act(l, "active")}>
                              Reinstate
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <WaliRules stored={storedSettings} mut={mut} />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

function WaliRules({
  stored, mut,
}: {
  stored?: WaliSettings;
  mut: ReturnType<typeof useWaliMutations>;
}) {
  const [form, setForm] = useState<WaliSettings>({ ...DEFAULT_SETTINGS, ...(stored ?? {}) });
  const [testOpen, setTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  const rows: { key: keyof WaliSettings; label: string; desc: string }[] = [
    { key: "waliEnabled", label: "Wali feature enabled", desc: "Members can invite a guardian from their profile." },
    { key: "requireWaliForSisters", label: "Require a wali for sisters", desc: "Sisters must assign a guardian before chatting." },
    { key: "ccAllChats", label: "CC guardian on all chats", desc: "Every message is copied to the assigned wali." },
    { key: "waliApprovalForMatches", label: "Wali approval for matches", desc: "A match is only confirmed after the wali approves." },
  ];

  function save() {
    mut.saveSettings.mutate(form, {
      onSuccess: () => toast.success("Wali rules saved"),
      onError: () => toast.error("Backend not connected yet — rules not saved"),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Global wali rules</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((r) => (
          <div key={r.key} className="flex items-start justify-between gap-4 p-3 rounded-lg border">
            <div className="min-w-0">
              <Label className="text-sm font-medium">{r.label}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
            </div>
            <Switch
              checked={!!form[r.key]}
              onCheckedChange={(v) => setForm({ ...form, [r.key]: v })}
            />
          </div>
        ))}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>CC digest frequency</Label>
            <Select
              value={form.ccDigestFrequency}
              onValueChange={(v) => setForm({ ...form, ccDigestFrequency: v as WaliSettings["ccDigestFrequency"] })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="instant">Instant</SelectItem>
                <SelectItem value="daily">Daily digest</SelectItem>
                <SelectItem value="weekly">Weekly digest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Invite expiry (days)</Label>
            <Input
              type="number" min={1} max={30}
              value={form.inviteExpiryDays}
              onChange={(e) => setForm({ ...form, inviteExpiryDays: Number(e.target.value) || 1 })}
            />
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setTestOpen(true)}>
            <Mail className="h-4 w-4 mr-2" /> Send test CC
          </Button>
          <Button className="bg-gradient-primary text-primary-foreground border-0" onClick={save}>
            Save rules
          </Button>
        </div>
      </CardContent>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send a test CC email</DialogTitle>
            <DialogDescription>
              Verifies the guardian CC template and delivery settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Guardian email</Label>
            <Input
              type="email" value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="wali@example.com"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestOpen(false)}>Cancel</Button>
            <Button
              className="bg-gradient-primary text-primary-foreground border-0"
              onClick={() => {
                if (!/^\S+@\S+\.\S+$/.test(testEmail)) return toast.error("Enter a valid email");
                toast.success(`Test CC queued to ${testEmail}`);
                setTestOpen(false);
              }}
            >
              Send test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
