import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useRemoteList } from "@/lib/remote";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Download, Eye, Flag, Images, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";

import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadCSV } from "@/lib/csv";
import { mockUsers } from "@/lib/mock-data";

export const Route = createFileRoute("/photos")({
  head: () => ({
    meta: [
      { title: "Photo Moderation — Halal Connect Admin" },
      {
        name: "description",
        content:
          "Review member photos, auto-flags and private photo access requests on Halal Connect.",
      },
      { property: "og:title", content: "Photo Moderation — Halal Connect Admin" },
      {
        property: "og:description",
        content:
          "Review member photos, auto-flags and private photo access requests on Halal Connect.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PhotoModerationPage,
});

type PhotoStatus = "pending" | "approved" | "rejected";
type PhotoRow = {
  id: string;
  url?: string;
  reason?: string;
  userId: string;
  member: string;
  email: string;
  kind: "Profile" | "Private";
  flags: string[];
  submitted: string;
  status: PhotoStatus;
};

const FLAG_POOL = [
  ["Face not visible"],
  ["Possible nudity"],
  [],
  ["Group photo"],
  ["Text overlay / contact info"],
  [],
  ["Low quality"],
];

const initialPhotos: PhotoRow[] = mockUsers.slice(0, 28).map((u, i) => ({
  id: `pho_${(2000 + i).toString(36)}`,
  userId: u.id,
  member: u.name,
  email: u.email,
  kind: i % 3 === 0 ? "Private" : "Profile",
  flags: FLAG_POOL[i % FLAG_POOL.length],
  submitted: `${(i % 12) + 1}h ago`,
  status: i % 5 === 0 ? "approved" : i % 7 === 0 ? "rejected" : "pending",
}));

type RequestStatus = "pending" | "approved" | "declined" | "revoked";
type AccessRow = {
  id: string;
  requester: string;
  owner: string;
  reason: string;
  requested: string;
  status: RequestStatus;
};

const accessRequests: AccessRow[] = mockUsers.slice(30, 44).map((u, i) => ({
  id: `par_${(3000 + i).toString(36)}`,
  requester: u.name,
  owner: mockUsers[(i + 7) % mockUsers.length].name,
  reason: [
    "We have been matched for two weeks",
    "Wali introduced us",
    "Serious about proposal",
    "Would like to see before family meeting",
  ][i % 4],
  requested: `${(i % 6) + 1}d ago`,
  status: (["pending", "approved", "declined", "approved", "revoked"] as RequestStatus[])[i % 5],
}));

const statusTone: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  approved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  rejected: "bg-destructive/15 text-destructive",
  declined: "bg-destructive/15 text-destructive",
  revoked: "bg-muted text-muted-foreground",
};

function PhotoModerationPage() {
  const {
    rows: photos,
    mutate,
    sample,
    reload,
  } = useRemoteList<PhotoRow>("/admin/photos", initialPhotos, (r) => ({
    id: String(r.id),
    url: r.url ?? r.signedUrl,
    userId: r.userId,
    member: r.user?.name ?? r.member ?? "Member",
    email: r.user?.email ?? r.email ?? "",
    kind: r.visibility === "private" ? "Private" : "Profile",
    flags: r.flags ?? [],
    submitted: r.createdAt ? new Date(r.createdAt).toLocaleString() : "",
    status: (r.status ?? "pending") as PhotoStatus,
  }));
  const req = useRemoteList<AccessRow>("/admin/photo-requests", accessRequests, (r) => ({
    id: String(r.id),
    requester: r.requester?.name ?? r.requester ?? "",
    owner: r.owner?.name ?? r.owner ?? "",
    reason: r.reason ?? "",
    requested: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "",
    status: r.status === "granted" ? "approved" : r.status === "denied" ? "declined" : r.status,
  }));
  const [viewing, setViewing] = useState<PhotoRow | null>(null);
  const [rejecting, setRejecting] = useState<PhotoRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [revoking, setRevoking] = useState<AccessRow | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<PhotoStatus | "flagged">("pending");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return photos.filter((p) => {
      const matchesTab = tab === "flagged" ? p.flags.length > 0 : p.status === tab;
      const matchesQuery = !q || `${p.member} ${p.email} ${p.id}`.toLowerCase().includes(q);
      return matchesTab && matchesQuery;
    });
  }, [photos, search, tab]);

  const counts = useMemo(
    () => ({
      pending: photos.filter((p) => p.status === "pending").length,
      flagged: photos.filter((p) => p.flags.length > 0).length,
      approved: photos.filter((p) => p.status === "approved").length,
      requests: req.rows.filter((r) => r.status === "pending").length,
    }),
    [photos, req.rows],
  );

  async function decide(id: string, status: PhotoStatus, reason?: string) {
    try {
      await mutate(
        () => api(`/admin/photos/${id}`, { method: "PATCH", body: { status, reason } }),
        id,
        { status, reason },
      );
      toast.success(status === "approved" ? "Photo approved" : "Photo rejected — member notified");
      const p = photos.find((x) => x.id === id);
      if (p && (status === "approved" || status === "rejected"))
        void notifyMember({ email: p.email, name: p.member }, { kind: "photo", status, reason });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  }

  async function revoke(r: AccessRow) {
    try {
      await req.mutate(
        () =>
          api(`/admin/photo-requests/${r.id}`, {
            method: "PATCH",
            body: { status: "revoked", reason: "Admin safety override" },
          }),
        r.id,
        { status: "revoked" },
      );
      toast.success("Access revoked and logged for audit");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Revoke failed");
    }
    setRevoking(null);
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Photo Moderation"
        description="Review submitted photos, act on automatic flags, and audit private photo access."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              downloadCSV("halal-connect-photo-moderation", filtered);
              toast.success("Export started");
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        }
      />

      {(sample || req.sample) && (
        <Card className="mb-4 border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span>
              {sample && "Photo rows are sample data; actions update locally until your server is live. "}
              {req.sample && "Private-request rows are sample data."}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                reload();
                req.reload();
              }}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Awaiting review" value={String(counts.pending)} icon={Images} />
        <StatCard label="Auto-flagged" value={String(counts.flagged)} icon={Flag} />
        <StatCard label="Approved" value={String(counts.approved)} icon={Check} />
        <StatCard
          label="Private photo requests"
          value={String(counts.requests)}
          icon={ShieldAlert}
        />
      </div>

      <Card className="mt-6">
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Photo queue</CardTitle>
          <Input
            placeholder="Search member, email or photo ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="flex-wrap">
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="flagged">Flagged</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Flags</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium">{p.member}</div>
                          <div className="text-xs text-muted-foreground">{p.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{p.kind}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[220px]">
                          {p.flags.length === 0 ? (
                            <span className="text-xs text-muted-foreground">None</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {p.flags.map((f) => (
                                <Badge
                                  key={f}
                                  className="bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                >
                                  {f}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.submitted}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusTone[p.status]}>{p.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setViewing(p)}
                            aria-label="View photo"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label="Approve"
                            disabled={p.status === "approved"}
                            onClick={() => decide(p.id, "approved")}
                          >
                            <Check className="h-4 w-4 text-emerald-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label="Reject"
                            disabled={p.status === "rejected"}
                            onClick={() => {
                              setRejectReason("");
                              setRejecting(p);
                            }}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-10 text-center text-sm text-muted-foreground"
                        >
                          Nothing here right now.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Private photo requests</CardTitle>
          <p className="text-sm text-muted-foreground">
            Members approve or decline these themselves. This view is read-only and exists for
            safety audits.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requester</TableHead>
                <TableHead>Photo owner</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Safety</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {req.rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.requester}</TableCell>
                  <TableCell>{r.owner}</TableCell>
                  <TableCell className="max-w-[260px] text-sm text-muted-foreground">
                    {r.reason}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.requested}</TableCell>
                  <TableCell>
                    <Badge className={statusTone[r.status]}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={r.status === "revoked" || r.status === "declined"}
                      onClick={() => setRevoking(r)}
                    >
                      Revoke access
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="sm:max-w-lg">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {viewing.member} · {viewing.kind} photo
                </DialogTitle>
                <DialogDescription>
                  {viewing.email} · submitted {viewing.submitted}
                </DialogDescription>
              </DialogHeader>
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border bg-muted">
                {viewing.url ? (
                  <img
                    src={viewing.url}
                    alt={`Photo by ${viewing.member}`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Image loads here from your server's secure link
                  </span>
                )}
              </div>
              {viewing.flags.length > 0 && (
                <p className="text-sm text-amber-600">Flags: {viewing.flags.join(", ")}</p>
              )}
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  disabled={false}
                  onClick={() => {
                    setRejectReason("");
                    setRejecting(viewing);
                    setViewing(null);
                  }}
                >
                  Reject
                </Button>
                <Button
                  disabled={false}
                  onClick={() => {
                    decide(viewing.id, "approved");
                    setViewing(null);
                  }}
                >
                  Approve
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject photo</DialogTitle>
            <DialogDescription>The member sees this reason in the app.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {[
              "Face not visible",
              "Inappropriate content",
              "Contact info in photo",
              "Not the member",
            ].map((r) => (
              <Button
                key={r}
                size="sm"
                variant={rejectReason === r ? "default" : "outline"}
                onClick={() => setRejectReason(r)}
              >
                {r}
              </Button>
            ))}
          </div>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={() => {
                if (rejecting) decide(rejecting.id, "rejected", rejectReason.trim());
                setRejecting(null);
              }}
            >
              Reject photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!revoking} onOpenChange={(o) => !o && setRevoking(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke private photo access?</DialogTitle>
            <DialogDescription>
              {revoking?.requester} will no longer see {revoking?.owner}'s private photos. This is a
              safety override and is logged.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevoking(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => revoking && revoke(revoking)}>
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
