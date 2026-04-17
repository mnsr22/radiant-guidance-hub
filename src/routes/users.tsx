import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, Filter, Download, MoreHorizontal, ShieldCheck, Crown, MapPin } from "lucide-react";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { mockUsers } from "@/lib/mock-data";

export const Route = createFileRoute("/users")({
  component: UsersPage,
});

function UsersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [practice, setPractice] = useState<string>("all");

  const filtered = useMemo(() => {
    return mockUsers.filter((u) => {
      if (status !== "all" && u.status !== status) return false;
      if (practice !== "all" && u.practice !== practice) return false;
      if (q && !`${u.name} ${u.email} ${u.country}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [q, status, practice]);

  return (
    <AdminLayout>
      <PageHeader
        title="User Management"
        description={`${filtered.length} of ${mockUsers.length} users`}
        actions={
          <>
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
            <Button size="sm" className="bg-gradient-primary text-primary-foreground border-0 shadow-elegant">Add Admin</Button>
          </>
        }
      />

      <Card className="p-4 shadow-elegant mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, country…" className="pl-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="md:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="banned">Banned</SelectItem>
            </SelectContent>
          </Select>
          <Select value={practice} onValueChange={setPractice}>
            <SelectTrigger className="md:w-52"><SelectValue placeholder="Practice level" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All practice levels</SelectItem>
              <SelectItem value="Highly Practicing">Highly Practicing</SelectItem>
              <SelectItem value="Practicing">Practicing</SelectItem>
              <SelectItem value="Moderately">Moderately</SelectItem>
              <SelectItem value="Learning">Learning</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
        </div>
      </Card>

      <Card className="shadow-elegant overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>User</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Practice</TableHead>
                <TableHead>Madhab</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 25).map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                          {u.name.split(" ").map((p) => p[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-sm font-medium flex items-center gap-1.5">
                          {u.name}
                          {u.verified && <ShieldCheck className="h-3.5 w-3.5 text-success" />}
                          {u.premium && <Crown className="h-3.5 w-3.5 text-warning" />}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[180px]">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {u.city}, {u.country}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{u.practice}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.madhab}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-gradient-primary" style={{ width: `${u.completeness}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{u.completeness}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={u.status === "active" ? "default" : "secondary"}
                      className={
                        u.status === "active" ? "bg-success/15 text-success border-0 hover:bg-success/20"
                        : u.status === "banned" ? "bg-destructive/15 text-destructive border-0 hover:bg-destructive/20"
                        : u.status === "pending" ? "bg-warning/15 text-warning border-0 hover:bg-warning/20"
                        : ""
                      }
                    >
                      {u.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u.lastActive}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </AdminLayout>
  );
}
