import { useMemo, useState } from "react";
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadCSV } from "@/lib/csv";
import { mockUsers } from "@/lib/mock-data";

export const Route = createFileRoute("/photos")({
  head: () => ({
    meta: [
      { title: "Photo Moderation — Halal Connect Admin" },
      { name: "description", content: "Review member photos, auto-flags and private photo access requests on Halal Connect." },
      { property: "og:title", content: "Photo Moderation — Halal Connect Admin" },
      { property: "og:description", content: "Review member photos, auto-flags and private photo access requests on Halal Connect." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PhotoModerationPage,
});

type PhotoStatus = "pending" | "approved" | "rejected";
type PhotoRow = {
  id: string;
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
  const [photos, setPhotos] = useState<PhotoRow[]>(initialPhotos);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<PhotoStatus | "flagged">("pending");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return photos.filter((p) => {
      const matchesTab = tab === "flagged" ? p.flags.length > 0 : p.status === tab;
      const matchesQuery =
        !q || `${p.member} ${p.email} ${p.id}`.toLowerCase().includes(q);
      return matchesTab && matchesQuery;
    });
  }, [photos, search, tab]);

  const counts = useMemo(
    () => ({
      pending: photos.filter((p) => p.status === "pending").length,
      flagged: photos.filter((p) => p.flags.length > 0).length,
      approved: photos.filter((p) => p.status === "approved").length,
      requests: accessRequests.filter((r) => r.status === "pending").length,
    }),
    [photos],
  );

  function decide(id: string, status: PhotoStatus) {
    setPhotos((rows) => rows.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success(status === "approved" ? "Photo approved" : "Photo rejected");
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Photo Moderation"
        description="Review submitted photos, act on automatic flags, and audit private photo access."
      >
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
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Awaiting review" value={String(counts.pending)} icon={Images} />
        <StatCard title="Auto-flagged" value={String(counts.flagged)} icon={Flag} />
        <StatCard title="Approved" value={String(counts.approved)} icon={Check} />
        <StatCard title="Private photo requests" value={String(counts.requests)} icon={ShieldAlert} />
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
                                <Badge key={f} className="bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                  {f}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.submitted}</TableCell>
                        <TableCell>
                          <Badge className={statusTone[p.status]}>{p.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toast.info(`Opening ${p.id} in secure viewer`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => decide(p.id, "approved")}>
                            <Check className="h-4 w-4 text-emerald-600" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => decide(p.id, "rejected")}>
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
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
            Members approve or decline these themselves. This view is read-only and exists for safety audits.
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
              {accessRequests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.requester}</TableCell>
                  <TableCell>{r.owner}</TableCell>
                  <TableCell className="max-w-[260px] text-sm text-muted-foreground">{r.reason}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.requested}</TableCell>
                  <TableCell>
                    <Badge className={statusTone[r.status]}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toast.success("Access revoked and logged for audit")}
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
    </AdminLayout>
  );
}
