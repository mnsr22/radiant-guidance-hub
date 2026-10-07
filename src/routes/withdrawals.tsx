import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Banknote, CheckCircle2, Clock, Copy, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useRemoteList } from "@/lib/remote";

export const Route = createFileRoute("/withdrawals")({
  head: () => ({
    meta: [
      { title: "Withdrawals — Halal Connect Admin" },
      { name: "description", content: "Approve member gift cash-out requests after sending payment manually." },
      { property: "og:title", content: "Withdrawals — Halal Connect Admin" },
      { property: "og:description", content: "Approve member gift cash-out requests after sending payment manually." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WithdrawalsPage,
});

type Status = "pending" | "approved" | "paid" | "rejected";
type Row = { id: string; member: string; amount: number; method: string; account: string; accountName?: string; requested: string; status: Status; reference?: string; reason?: string };

const SAMPLE: Row[] = [
  { id: "w1", member: "Aisha N.", amount: 64000, method: "MTN Mobile Money", account: "+256 772 456 812", accountName: "Aisha Nakato", requested: "Today", status: "pending" },
  { id: "w2", member: "Yusuf K.", amount: 120000, method: "Airtel Money", account: "+256 701 883 330", accountName: "Yusuf Kato", requested: "Yesterday", status: "pending" },
  { id: "w3", member: "Maryam S.", amount: 52000, method: "Bank — Stanbic", account: "903001234410", accountName: "Maryam Ssempala", requested: "3 days ago", status: "paid", reference: "MM8812" },
];

const tone: Record<Status, string> = {
  pending: "bg-amber-500/15 text-amber-600",
  approved: "bg-primary/15 text-primary",
  paid: "bg-emerald-500/15 text-emerald-600",
  rejected: "bg-destructive/15 text-destructive",
};

function WithdrawalsPage() {
  const { rows, mutate } = useRemoteList<Row>("/admin/withdrawals", SAMPLE, (r) => ({
    id: String(r.id),
    member: r.user?.name ?? r.member ?? "Member",
    email: r.user?.email ?? r.email,
    amount: Number(r.amount),
    method: r.method,
    account: r.details?.phone ?? r.details?.account ?? r.account ?? r.accountMasked ?? "",
    accountName: r.details?.accountName ?? r.accountName ?? r.user?.name,
    requested: r.createdAt ? new Date(r.createdAt).toLocaleString() : "",
    status: r.status,
    reference: r.reference,
    reason: r.reason,
  }));
  const [tab, setTab] = useState<Status>("pending");
  const [paying, setPaying] = useState<Row | null>(null);
  const [rejecting, setRejecting] = useState<Row | null>(null);
  const [ref, setRef] = useState("");
  const [reason, setReason] = useState("");

  const sum = (s: Status) => rows.filter((r) => r.status === s).reduce((a, r) => a + r.amount, 0);

  async function decide(r: Row, status: Status, extra: Partial<Row>) {
    try {
      const action = status === "approved" ? "approve" : status === "paid" ? "mark-paid" : "reject";
      await mutate(() => api(`/admin/withdrawals/${r.id}/${action}`, { method: "POST", body: extra }), r.id, { status, ...extra });
      toast.success(status === "paid" ? "Marked paid — member notified in the app" : "Request rejected — amount returned to member's balance");
      if (status !== "pending")
        void notifyMember({ email: r.email, name: r.member }, { kind: "withdrawal", status, amount: r.amount, reference: extra.reference, reason: extra.reason });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  }

  return (
    <AdminLayout>
      <PageHeader title="Withdrawals" description="Send the money manually first, then mark the request paid with your transfer reference." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending payout" value={sum("pending").toLocaleString()} icon={Clock} accent="warning" />
        <StatCard label="Paid out" value={sum("paid").toLocaleString()} icon={CheckCircle2} accent="success" />
        <StatCard label="Requests" value={String(rows.length)} icon={Banknote} />
      </div>
      <Card>
        <CardContent className="pt-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Status)}>
            <TabsList><TabsTrigger value="pending">Pending</TabsTrigger><TabsTrigger value="approved">Approved</TabsTrigger><TabsTrigger value="paid">Paid</TabsTrigger><TabsTrigger value="rejected">Rejected</TabsTrigger></TabsList>
          </Tabs>
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Member</TableHead><TableHead>Amount</TableHead><TableHead>Send to</TableHead><TableHead>Requested</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.filter((r) => r.status === tab).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.member}</TableCell>
                    <TableCell>{r.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{r.method}</div>
                      <div className="flex items-center gap-1 font-mono text-xs">
                        {r.account || "—"}
                        {r.account && (
                          <button
                            type="button"
                            aria-label="Copy account number"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => { void navigator.clipboard?.writeText(r.account); toast.success("Account number copied"); }}
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      {r.accountName && <div className="text-xs text-muted-foreground">{r.accountName}</div>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.requested}</TableCell>
                    <TableCell><Badge className={tone[r.status]}>{r.status}</Badge>{r.reference && <div className="text-xs text-muted-foreground">Ref {r.reference}</div>}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {r.status === "pending" ? (
                        <>
                          <Button size="sm" onClick={() => decide(r, "approved", {})}>Approve</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setReason(""); setRejecting(r); }}><XCircle className="h-4 w-4 text-destructive" /></Button>
                        </>
                      ) : r.status === "approved" ? (
                        <Button size="sm" onClick={() => { setRef(""); setPaying(r); }}>Mark paid</Button>
                      ) : <span className="text-xs text-muted-foreground">{r.reason ?? "Done"}</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!paying} onOpenChange={(o) => !o && setPaying(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm payment sent</DialogTitle>
            <DialogDescription>Only confirm after you've sent {paying?.amount.toLocaleString()} to {paying?.member} via {paying?.method} ({paying?.account}).</DialogDescription>
          </DialogHeader>
          <Label>Transfer reference</Label>
          <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. mobile money transaction ID" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaying(null)}>Cancel</Button>
            <Button disabled={!ref.trim()} onClick={() => { if (paying) decide(paying, "paid", { reference: ref.trim() }); setPaying(null); }}>Mark as paid</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Reject withdrawal</DialogTitle><DialogDescription>The amount goes back to the member's balance and they see this reason.</DialogDescription></DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Account name doesn't match profile" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="destructive" disabled={!reason.trim()} onClick={() => { if (rejecting) decide(rejecting, "rejected", { reason: reason.trim() }); setRejecting(null); }}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
