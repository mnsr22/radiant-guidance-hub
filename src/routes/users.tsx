import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Search, Filter, Download, MoreHorizontal, ShieldCheck, Crown, MapPin,
  Send, Ban, ShieldOff, UserCheck, Eye,
} from "lucide-react";
import { toast } from "sonner";
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { mockUsers, type MockUser } from "@/lib/mock-data";
import { downloadCSV } from "@/lib/csv";

export const Route = createFileRoute("/users")({
  component: UsersPage,
});

function UsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<MockUser[]>(mockUsers);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [practice, setPractice] = useState<string>("all");
  const [viewUser, setViewUser] = useState<MockUser | null>(null);
  const [confirm, setConfirm] = useState<{ user: MockUser; action: "ban" | "unban" | "verify" } | null>(null);
  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminRole, setAdminRole] = useState("moderator");

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (status !== "all" && u.status !== status) return false;
      if (practice !== "all" && u.practice !== practice) return false;
      if (q && !`${u.name} ${u.email} ${u.country}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [users, q, status, practice]);

  function handleExport() {
    downloadCSV("noor-users", filtered, [
      "id", "name", "email", "age", "gender", "country", "city",
      "practice", "madhab", "status", "verified", "premium", "completeness", "joined",
    ]);
    toast.success(`Exported ${filtered.length} users to CSV`);
  }

  function handleAddAdmin() {
    if (!adminEmail.trim() || !/^\S+@\S+\.\S+$/.test(adminEmail)) {
      toast.error("Enter a valid email");
      return;
    }
    toast.success(`Invite sent to ${adminEmail} as ${adminRole}`);
    setAdminEmail("");
    setAdminRole("moderator");
    setAddAdminOpen(false);
  }

  function applyAction() {
    if (!confirm) return;
    const { user, action } = confirm;
    setUsers((prev) => prev.map((u) => {
      if (u.id !== user.id) return u;
      if (action === "ban") return { ...u, status: "banned" };
      if (action === "unban") return { ...u, status: "active" };
      if (action === "verify") return { ...u, verified: true };
      return u;
    }));
    const labels = { ban: "banned", unban: "reinstated", verify: "verified" } as const;
    toast.success(`${user.name} has been ${labels[action]}`);
    setConfirm(null);
  }

  return (
    <AdminLayout>
      <PageHeader
        title="User Management"
        description={`${filtered.length} of ${users.length} users`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />Export
            </Button>
            <Button
              size="sm"
              onClick={() => setAddAdminOpen(true)}
              className="bg-gradient-primary text-primary-foreground border-0 shadow-elegant"
            >
              Add Admin
            </Button>
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
          <Button
            variant="outline"
            size="icon"
            onClick={() => { setQ(""); setStatus("all"); setPractice("all"); toast.info("Filters cleared"); }}
            title="Clear filters"
          >
            <Filter className="h-4 w-4" />
          </Button>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setViewUser(u)}>
                          <Eye className="h-4 w-4 mr-2" /> View profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate({ to: "/messaging" })}>
                          <Send className="h-4 w-4 mr-2" /> Send message
                        </DropdownMenuItem>
                        {!u.verified && (
                          <DropdownMenuItem onClick={() => setConfirm({ user: u, action: "verify" })}>
                            <UserCheck className="h-4 w-4 mr-2" /> Verify
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {u.status === "banned" ? (
                          <DropdownMenuItem onClick={() => setConfirm({ user: u, action: "unban" })}>
                            <ShieldOff className="h-4 w-4 mr-2" /> Reinstate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => setConfirm({ user: u, action: "ban" })}
                            className="text-destructive focus:text-destructive"
                          >
                            <Ban className="h-4 w-4 mr-2" /> Ban user
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* View profile dialog */}
      <Dialog open={!!viewUser} onOpenChange={(o) => !o && setViewUser(null)}>
        <DialogContent className="sm:max-w-md">
          {viewUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {viewUser.name}
                  {viewUser.verified && <ShieldCheck className="h-4 w-4 text-success" />}
                  {viewUser.premium && <Crown className="h-4 w-4 text-warning" />}
                </DialogTitle>
                <DialogDescription>{viewUser.email}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Age" value={String(viewUser.age)} />
                <Field label="Gender" value={viewUser.gender} />
                <Field label="Location" value={`${viewUser.city}, ${viewUser.country}`} />
                <Field label="Madhab" value={viewUser.madhab} />
                <Field label="Practice" value={viewUser.practice} />
                <Field label="Status" value={viewUser.status} />
                <Field label="Profile" value={`${viewUser.completeness}%`} />
                <Field label="Joined" value={viewUser.joined} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewUser(null)}>Close</Button>
                <Button
                  onClick={() => { setViewUser(null); navigate({ to: "/messaging" }); }}
                  className="bg-gradient-primary text-primary-foreground border-0"
                >
                  <Send className="h-4 w-4 mr-2" /> Message
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add admin dialog */}
      <Dialog open={addAdminOpen} onOpenChange={setAddAdminOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite an admin</DialogTitle>
            <DialogDescription>They will receive an email to accept the role.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="admin-email">Email</Label>
              <Input id="admin-email" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="name@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={adminRole} onValueChange={setAdminRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="support">Support Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddAdminOpen(false)}>Cancel</Button>
            <Button onClick={handleAddAdmin} className="bg-gradient-primary text-primary-foreground border-0">
              Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm action */}
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          {confirm && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {confirm.action === "ban" && `Ban ${confirm.user.name}?`}
                  {confirm.action === "unban" && `Reinstate ${confirm.user.name}?`}
                  {confirm.action === "verify" && `Verify ${confirm.user.name}?`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {confirm.action === "ban" && "This user won't be able to log in or interact with others."}
                  {confirm.action === "unban" && "This user will regain full access to the platform."}
                  {confirm.action === "verify" && "Marks this user as identity-verified."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={applyAction}
                  className={confirm.action === "ban" ? "bg-destructive hover:bg-destructive/90" : ""}
                >
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-0.5 capitalize">{value}</div>
    </div>
  );
}
