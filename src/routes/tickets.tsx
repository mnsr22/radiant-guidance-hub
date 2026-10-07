import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  LifeBuoy,
  Search,
  Download,
  Send,
  CheckCircle2,
  Clock,
  Trash2,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { downloadCSV } from "@/lib/csv";
import {
  useTickets,
  useTicket,
  useTicketMutations,
  useDeletionRequests,
  useDeletionMutations,
} from "@/lib/admin-hooks";
import type { SupportTicket, TicketStatus, DeletionRequest } from "@/store/admin-api";

export const Route = createFileRoute("/tickets")({
  component: TicketsPage,
  head: () => ({
    meta: [
      { title: "Support Tickets — Halal Connect Admin" },
      {
        name: "description",
        content:
          "Triage, reply to and close Halal Connect support tickets and account deletion requests.",
      },
      { property: "og:title", content: "Support Tickets — Halal Connect Admin" },
      { property: "og:description", content: "Ticket triage and account deletion review." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const CATEGORIES = ["account", "matches", "billing", "safety", "bug", "other"] as const;

function fmt(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-primary/15 text-primary",
    pending: "bg-amber-500/15 text-amber-600",
    closed: "bg-muted text-muted-foreground",
    confirmed: "bg-emerald-500/15 text-emerald-600",
    rejected: "bg-destructive/15 text-destructive",
  };
  return (
    <Badge className={`border-0 capitalize ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </Badge>
  );
}

function TicketsPage() {
  return (
    <AdminLayout>
      <PageHeader
        title="Support Tickets"
        description="Triage member tickets, reply by email and review account deletion requests."
      />
      <Tabs defaultValue="tickets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tickets">
            <LifeBuoy className="h-4 w-4 mr-1.5" /> Tickets
          </TabsTrigger>
          <TabsTrigger value="deletions">
            <Trash2 className="h-4 w-4 mr-1.5" /> Deletion Requests
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tickets">
          <TicketsTab />
        </TabsContent>
        <TabsContent value="deletions">
          <DeletionsTab />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

function TicketsTab() {
  const [status, setStatus] = useState<string>("open");
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useTickets({ status, category, search });
  const tickets = useMemo(() => (data ?? []) as SupportTicket[], [data]);
  const { setStatus: setTicketStatus } = useTicketMutations();

  const counts = useMemo(() => {
    const c = { open: 0, pending: 0, closed: 0 };
    for (const t of tickets) c[t.status] = (c[t.status] ?? 0) + 1;
    return c;
  }, [tickets]);

  function exportCsv() {
    const ok = downloadCSV(
      `halal-connect-tickets-${new Date().toISOString().slice(0, 10)}`,
      tickets.map((t) => ({
        id: t.id,
        created: t.createdAt,
        name: t.name,
        email: t.email,
        category: t.category,
        subject: t.subject,
        status: t.status,
        app_version: t.appVersion ?? "",
        os: t.os ?? "",
        device: t.device ?? "",
      })),
    );
    toast[ok ? "success" : "error"](ok ? "Tickets exported" : "Nothing to export");
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-elegant">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base">Inbox</CardTitle>
              <CardDescription>
                {counts.open} open · {counts.pending} pending · {counts.closed} closed
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-1" /> Export PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[1fr_160px_160px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search subject, name or email…"
                className="pl-9"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead className="hidden md:table-cell">From</TableHead>
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-sm text-muted-foreground py-10"
                    >
                      Loading tickets…
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && tickets.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-sm text-muted-foreground py-10"
                    >
                      No tickets match these filters.
                    </TableCell>
                  </TableRow>
                )}
                {tickets.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer" onClick={() => setOpenId(t.id)}>
                    <TableCell className="max-w-[260px]">
                      <div className="font-medium truncate">{t.subject}</div>
                      <div className="text-xs text-muted-foreground truncate">{t.message}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="text-sm">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.email}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell capitalize">{t.category}</TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {fmt(t.createdAt)}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => setOpenId(t.id)}>
                          View
                        </Button>
                        {t.status !== "closed" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setTicketStatus.mutate(
                                { id: t.id, status: "closed" },
                                {
                                  onSuccess: () => toast.success("Ticket closed"),
                                  onError: () => toast.error("Could not close ticket"),
                                },
                              )
                            }
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setTicketStatus.mutate(
                                { id: t.id, status: "open" },
                                {
                                  onSuccess: () => toast.success("Ticket reopened"),
                                  onError: () => toast.error("Could not reopen ticket"),
                                },
                              )
                            }
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <TicketDialog id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function TicketDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, isLoading } = useTicket(id);
  const { reply, setStatus } = useTicketMutations();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiNote, setAiNote] = useState<{ handoff: boolean; reason: string } | null>(null);

  function suggest() {
    if (!data) return;
    setAiNote(null);
    setBody(
      "Thank you for contacting Halal Connect Support. We have received your message and a member of our team will review it and follow up here.",
    );
    setAiNote({
      handoff: true,
      reason:
        "This privacy-safe acknowledgement is a template; ticket content is not sent to free-tier Gemini.",
    });
  }

  function send(close: boolean) {
    if (!id) return;
    const text = body.trim();
    if (text.length < 2) {
      toast.error("Write a reply first");
      return;
    }
    setBusy(true);
    reply.mutate(
      { id, body: text, close },
      {
        onSuccess: () => {
          setBody("");
          setBusy(false);
          toast.success(close ? "Replied and closed" : "Reply sent");
          if (close) onClose();
        },
        onError: () => {
          setBusy(false);
          toast.error("Failed to send reply");
        },
      },
    );
  }

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-8">{data?.subject ?? "Ticket"}</DialogTitle>
          <DialogDescription>
            {data ? `${data.name} · ${data.email} · ${fmt(data.createdAt)}` : "Loading…"}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
        )}

        {data && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <StatusBadge status={data.status} />
              <Badge variant="outline" className="capitalize">
                {data.category}
              </Badge>
              {data.appVersion && <Badge variant="outline">v{data.appVersion}</Badge>}
              {data.os && <Badge variant="outline">{data.os}</Badge>}
              {data.device && <Badge variant="outline">{data.device}</Badge>}
            </div>

            <div className="max-h-[320px] overflow-y-auto space-y-3 rounded-lg border bg-muted/20 p-3">
              <div className="rounded-2xl rounded-bl-sm border bg-background px-3.5 py-2 text-sm">
                <div className="whitespace-pre-wrap break-words">{data.message}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{fmt(data.createdAt)}</div>
              </div>
              {(data.replies ?? []).map((r) => (
                <div key={r.id} className={`flex ${r.fromAdmin ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                      r.fromAdmin
                        ? "bg-gradient-primary text-primary-foreground rounded-br-sm"
                        : "bg-background border rounded-bl-sm"
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">{r.body}</div>
                    <div
                      className={`text-[10px] mt-1 ${r.fromAdmin ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                    >
                      {r.authorName ? `${r.authorName} · ` : ""}
                      {fmt(r.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="reply">Reply</Label>
                <Button type="button" variant="outline" size="sm" onClick={suggest}>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
                  Draft safe acknowledgement
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Ticket messages may contain personal information, so they are not sent to free-tier
                Gemini.
              </p>
              <Textarea
                id="reply"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type your reply — it is emailed to the member…"
                className="min-h-24"
                maxLength={4000}
              />
              {aiNote && (
                <p
                  className={`text-[11px] ${aiNote.handoff ? "text-amber-600" : "text-muted-foreground"}`}
                >
                  {aiNote.handoff ? "Human review needed: " : "AI note: "}
                  {aiNote.reason ||
                    (aiNote.handoff
                      ? "This request needs an admin decision."
                      : "Draft is ready to review.")}
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            disabled={!id || busy}
            onClick={() =>
              id &&
              setStatus.mutate(
                { id, status: "pending" as TicketStatus },
                {
                  onSuccess: () => toast.success("Marked as pending"),
                  onError: () => toast.error("Update failed"),
                },
              )
            }
          >
            <Clock className="h-4 w-4 mr-1" /> Mark pending
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" disabled={busy} onClick={() => send(true)}>
              Reply &amp; close
            </Button>
            <Button
              className="bg-gradient-primary text-primary-foreground border-0"
              disabled={busy}
              onClick={() => send(false)}
            >
              <Send className="h-4 w-4 mr-1" /> Send reply
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeletionsTab() {
  const [status, setStatus] = useState("pending");
  const { data, isLoading } = useDeletionRequests(status);
  const requests = (data ?? []) as DeletionRequest[];
  const { confirm, reject } = useDeletionMutations();
  const [confirmTarget, setConfirmTarget] = useState<DeletionRequest | null>(null);

  function exportCsv() {
    const ok = downloadCSV(
      `halal-connect-deletion-requests-${new Date().toISOString().slice(0, 10)}`,
      requests.map((r) => ({
        id: r.id,
        email: r.email,
        phone: r.phone ?? "",
        reason: r.reason ?? "",
        status: r.status,
        requested_at: r.requestedAt,
        purge_at: r.scheduledPurgeAt ?? "",
      })),
    );
    toast[ok ? "success" : "error"](ok ? "Requests exported" : "Nothing to export");
  }

  return (
    <Card className="shadow-elegant">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">Account deletion requests</CardTitle>
            <CardDescription>
              Confirming schedules a permanent purge of the member's data within 30 days.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-1" /> Export PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="hidden md:table-cell">Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Requested</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-sm text-muted-foreground py-10"
                  >
                    Loading requests…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && requests.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-sm text-muted-foreground py-10"
                  >
                    No deletion requests.
                  </TableCell>
                </TableRow>
              )}
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="text-sm font-medium">{r.email}</div>
                    {r.phone && <div className="text-xs text-muted-foreground">{r.phone}</div>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-[280px]">
                    <span className="text-sm text-muted-foreground line-clamp-2">
                      {r.reason || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {fmt(r.requestedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "pending" ? (
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            reject.mutate(
                              { id: r.id, reason: "Could not verify ownership" },
                              {
                                onSuccess: () => toast.success("Request rejected"),
                                onError: () => toast.error("Action failed"),
                              },
                            )
                          }
                        >
                          Reject
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setConfirmTarget(r)}>
                          <ShieldAlert className="h-4 w-4 mr-1" /> Confirm
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">{fmt(r.handledAt)}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <AlertDialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm account deletion?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget?.email} will be signed out, removed from discovery, and all personal
              data permanently purged. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const target = confirmTarget;
                if (!target) return;
                confirm.mutate(
                  { id: target.id, hardDelete: true },
                  {
                    onSuccess: () => toast.success("Deletion confirmed"),
                    onError: () => toast.error("Deletion failed"),
                  },
                );
                setConfirmTarget(null);
              }}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
