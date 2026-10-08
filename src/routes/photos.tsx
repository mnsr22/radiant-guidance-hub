import { notifyMember } from "@/lib/notify";
import { useMemo, useState } from "react";
import { api, resolveApiUrl } from "@/lib/api";
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
type PhotoGroup = {
  userId: string;
  member: string;
  email: string;
  photos: PhotoRow[];
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
    sample,
    reload,
  } = useRemoteList<PhotoRow>("/admin/photos", initialPhotos, (r) => ({
    id: String(r.id),
    url: (r.url ?? r.signedUrl) ? resolveApiUrl(r.url ?? r.signedUrl) : undefined,
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
  const [reviewingGroup, setReviewingGroup] = useState<PhotoGroup | null>(null);
  const [rejectingGroup, setRejectingGroup] = useState<PhotoGroup | null>(null);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
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

  const groups = useMemo(() => {
    const byUser = new Map<string, PhotoGroup>();
    for (const photo of filtered) {
      let group = byUser.get(photo.userId);
      if (!group) {
        group = {
          userId: photo.userId,
          member: photo.member,
          email: photo.email,
          photos: [],
        };
        byUser.set(photo.userId, group);
      }
      group.photos.push(photo);
    }
    return [...byUser.values()];
  }, [filtered]);

  const counts = useMemo(
    () => ({
      pending: photos.filter((p) => p.status === "pending").length,
      flagged: photos.filter((p) => p.flags.length > 0).length,
      approved: photos.filter((p) => p.status === "approved").length,
      requests: req.rows.filter((r) => r.status === "pending").length,
    }),
    [photos, req.rows],
  );

  function openReview(group: PhotoGroup) {
    setReviewingGroup(group);
    setSelectedPhotoIds(group.photos.map((photo) => photo.id));
  }

  async function decideSelected(
    group: PhotoGroup,
    status: "approved" | "rejected",
    reason?: string,
  ) {
    const ids = selectedPhotoIds.filter((id) =>
      group.photos.some((photo) => photo.id === id),
    );
    if (ids.length === 0) {
      toast.error("Select at least one photo to review");
      return;
    }
    try {
      await api("/admin/photos/bulk-review", {
        method: "POST",
        body: { photoIds: ids, status, reason },
      });
      toast.success(
        `${ids.length} photo${ids.length === 1 ? "" : "s"} ${status}`,
      );
      void notifyMember(
        { email: group.email, name: group.member },
        { kind: "photo", status, reason, count: ids.length },
      );
      setReviewingGroup(null);
      setRejectingGroup(null);
      await reload();
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
                      <TableHead>Photos</TableHead>
                      <TableHead>Flags</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((group) => {
                      const groupFlags = [...new Set(group.photos.flatMap((p) => p.flags))];
                      const statuses = [...new Set(group.photos.map((p) => p.status))];
                      return (
                      <TableRow
                        key={group.userId}
                        className="cursor-pointer"
                        onClick={() => openReview(group)}
                      >
                        <TableCell>
                          <div className="font-medium">{group.member}</div>
                          <div className="text-xs text-muted-foreground">{group.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {group.photos.length} photo{group.photos.length === 1 ? "" : "s"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[220px]">
                          {groupFlags.length === 0 ? (
                            <span className="text-xs text-muted-foreground">None</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {groupFlags.map((f) => (
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
                          {group.photos[0]?.submitted}
                        </TableCell>
                        <TableCell>
                          {statuses.map((status) => (
                            <Badge key={status} className={`mr-1 ${statusTone[status]}`}>
                              {status}
                            </Badge>
                          ))}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation();
                              openReview(group);
                            }}
                            aria-label="Review member photos"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="ml-2">Review</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                    {groups.length === 0 && (
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
      <Dialog
        open={!!reviewingGroup}
        onOpenChange={(open) => {
          if (!open) setReviewingGroup(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          {reviewingGroup && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {reviewingGroup.member} · {reviewingGroup.photos.length} photo
                  {reviewingGroup.photos.length === 1 ? "" : "s"}
                </DialogTitle>
                <DialogDescription>
                  {reviewingGroup.email}. Choose which photos to review.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-between text-sm">
                <span>{selectedPhotoIds.length} selected</span>
                <Button
                  variant="link"
                  onClick={() =>
                    setSelectedPhotoIds(
                      selectedPhotoIds.length === reviewingGroup.photos.length
                        ? []
                        : reviewingGroup.photos.map((photo) => photo.id),
                    )
                  }
                >
                  {selectedPhotoIds.length === reviewingGroup.photos.length
                    ? "Select none"
                    : "Select all"}
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {reviewingGroup.photos.map((photo) => {
                  const selected = selectedPhotoIds.includes(photo.id);
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      className={`overflow-hidden rounded-lg border text-left ${selected ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
                      onClick={() =>
                        setSelectedPhotoIds((ids) =>
                          selected
                            ? ids.filter((id) => id !== photo.id)
                            : [...ids, photo.id],
                        )
                      }
                    >
                      <div className="flex aspect-square items-center justify-center bg-muted">
                        {photo.url ? (
                          <img
                            src={photo.url}
                            alt={`${photo.kind} photo by ${photo.member}`}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Secure photo preview unavailable
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between p-3">
                        <span className="text-sm">
                          {photo.kind} · {photo.status}
                        </span>
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"}`}
                          aria-label={selected ? "Selected" : "Not selected"}
                        >
                          {selected && <Check className="h-3 w-3" />}
                        </span>
                      </div>
                      {photo.flags.length > 0 && (
                        <p className="px-3 pb-3 text-xs text-amber-600">
                          Flags: {photo.flags.join(", ")}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  disabled={selectedPhotoIds.length === 0}
                  onClick={() => {
                    setRejectReason("");
                    setRejectingGroup(reviewingGroup);
                  }}
                >
                  Reject selected
                </Button>
                <Button
                  disabled={selectedPhotoIds.length === 0}
                  onClick={() => void decideSelected(reviewingGroup, "approved")}
                >
                  Approve selected
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!rejectingGroup}
        onOpenChange={(open) => !open && setRejectingGroup(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject selected photos</DialogTitle>
            <DialogDescription>
              {selectedPhotoIds.length} selected photo
              {selectedPhotoIds.length === 1 ? "" : "s"} from {rejectingGroup?.member} will be
              rejected together, with one email and one notification.
            </DialogDescription>
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
            <Button variant="outline" onClick={() => setRejectingGroup(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || !rejectingGroup}
              onClick={() =>
                rejectingGroup &&
                void decideSelected(rejectingGroup, "rejected", rejectReason.trim())
              }
            >
              Reject selected & notify
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
