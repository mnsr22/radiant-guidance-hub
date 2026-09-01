import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Images, Check, X, Flag, Lock, Search, Download } from "lucide-react";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { downloadCSV } from "@/lib/csv";
import { mockUsers } from "@/lib/mock-data";

export const Route = createFileRoute("/photos")({
  component: PhotosPage,
  head: () => ({
    meta: [
      { title: "Photo Moderation — Halal Connect Admin" },
      {
        name: "description",
        content:
          "Review member photos, approve or remove uploads, handle auto-flagged images and audit private photo access requests.",
      },
      { property: "og:title", content: "Photo Moderation — Halal Connect Admin" },
      { property: "og:description", content: "Moderate member photos and private photo requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type PhotoStatus = "pending" | "approved" | "removed";

type PhotoRow = {
  id: string;
  userId: string;
  userName: string;
  slot: "Primary" | "Gallery" | "Private";
  uploadedAt: string;
  autoFlag: string | null;
  status: PhotoStatus;
};

const flags = [null, null, null, "Possible nudity", "Face not visible", "Contains contact info", "Group photo"];

const initialPhotos: PhotoRow[] = mockUsers.slice(0, 28).map((u, i) => ({
  id: `pho_${i + 1}`,
  userId: u.id,
  userName: u.name,
  slot: i % 5 === 0 ? "Private" : i % 3 === 0 ? "Primary" : "Gallery",
  uploadedAt: `${(i % 12) + 1}h ago`,
  autoFlag: flags[i % flags.length] ?? null,
  status: i % 4 === 0 ? "approved" : i % 9 === 0 ? "removed" : "pending",
}));

type AccessRequest = {
  id: string;
  requester: string;
  owner: string;
  reason: string;
  requestedAt: string;
  state: "pending" | "approved" | "denied";
};

const initialRequests: AccessRequest[] = mockUsers.slice(30, 38).map((u, i) => ({
  id: `preq_${i + 1}`,
  requester: u.name,
  owner: mockUsers[40 + i].name,
  reason: ["Serious about marriage", "Wali requested", "Getting to know each other", "Matched 2 weeks ago"][i % 4],
  requestedAt: `${i + 1}d ago`,
  state: i % 3 === 0 ? "approved" : i % 5 === 0 ? "denied" : "pending",
}));

const statusTone: Record<PhotoStatus, "secondary" | "default" | "destructive"> = {
  pending: "secondary",
  approved: "default",
  removed: "destructive",
};

function PhotosPage() {
  const [photos, setPhotos] = useState(initialPhotos);
  const [requests, setRequests] = useState(initialRequests);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return photos;
    return photos.filter((p) =>
      [p.userName, p.slot, p.status, p.autoFlag ?? "", p.id, p.userId]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [photos, q]);

  const counts = useMemo(
    () => ({
      pending: photos.filter((p) => p.status === "pending").length,
      flagged: photos.filter((p) => p.autoFlag).length,
      privateCount: photos.filter((p) => p.slot === "Private").length,
      openRequests: requests.filter((r) => r.state === "pending").length,
    }),
    [photos, requests],
  );

  function setStatus(id: string, status: PhotoStatus) {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    toast.success(status === "approved" ? "Photo approved" : "Photo removed and member notified");
  }

  function decide(id: string, state: AccessRequest["state"]) {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, state } : r)));
    toast.success(state === "approved" ? "Access granted" : "Request denied");
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Photo Moderation"
        description="Approve member photos, action auto-flagged uploads and audit private photo access."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const ok = downloadCSV("halal-connect-photo-moderation", filtered);
              ok ? toast.success("Queue exported") : toast.error("Nothing to export");
            }}
          >
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <StatCard label="Pending review" value={String(counts.pending)} icon={Images} />
        <StatCard label="Auto-flagged" value={String(counts.flagged)} icon={Flag} accent="destructive" />
        <StatCard label="Private photos" value={String(counts.privateCount)} icon={Lock} accent="warning" />
        <StatCard label="Access requests" value={String(counts.openRequests)} icon={Check} accent="success" />
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">Photo queue</TabsTrigger>
          <TabsTrigger value="requests">Private photo requests</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle>Uploaded photos</CardTitle>
                <CardDescription>Newest uploads first — approve, or remove with a reason sent to the member.</CardDescription>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search member, flag, status…" className="pl-9" />
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Slot</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Auto-flag</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium">{p.userName}</div>
                        <div className="text-xs text-muted-foreground">{p.userId}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.slot === "Private" ? "outline" : "secondary"}>{p.slot}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.uploadedAt}</TableCell>
                      <TableCell>
                        {p.autoFlag ? (
                          <span className="text-destructive text-sm">{p.autoFlag}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell><Badge variant={statusTone[p.status]}>{p.status}</Badge></TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => setStatus(p.id, "approved")}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setStatus(p.id, "removed")}>
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No photos match “{q}”.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Private photo access requests</CardTitle>
              <CardDescription>Owners decide in-app; admins can override for safety investigations.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requester</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.requester}</TableCell>
                      <TableCell>{r.owner}</TableCell>
                      <TableCell className="text-muted-foreground">{r.reason}</TableCell>
                      <TableCell className="text-muted-foreground">{r.requestedAt}</TableCell>
                      <TableCell>
                        <Badge variant={r.state === "approved" ? "default" : r.state === "denied" ? "destructive" : "secondary"}>
                          {r.state}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => decide(r.id, "approved")}>Approve</Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => decide(r.id, "denied")}>Deny</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
