import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Search, Filter, Download, MoreHorizontal, ShieldCheck, Crown, MapPin,
  Send, Ban, ShieldOff, UserCheck, Eye, ChevronLeft, ChevronRight, Plus, Pencil, RotateCcw,
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
import { type MockUser } from "@/lib/mock-data";
import { useUsers, useUserMutations } from "@/lib/admin-hooks";
import { toApiStatus } from "@/lib/mappers";
import { downloadCSV } from "@/lib/csv";

export const Route = createFileRoute("/users")({
  component: UsersPage,
});

function UsersPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState(""); // debounced, sent to the server
  const [status, setStatus] = useState<string>("all");
  const [practice, setPractice] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Debounce the search box so we don't refetch on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  // Any filter/page-size change returns to the first page.
  useEffect(() => {
    setPage(1);
  }, [search, status, practice, limit]);

  const { data, isLoading, isFetching } = useUsers({
    page,
    limit,
    search: search || undefined,
    status: status as MockUser["status"] | "all",
    practice,
  });
  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

  const userMut = useUserMutations();
  const [viewUser, setViewUser] = useState<MockUser | null>(null);
  const [confirm, setConfirm] = useState<{ user: MockUser; action: "ban" | "unban" | "verify" } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user", status: "active", gender: "male" });
  const [creating, setCreating] = useState(false);

  // ── Edit user (full details) ─────────────────────────────────
  const editEmpty = { name: "", email: "", gender: "male", city: "", country: "", status: "active", password: "" };
  const [editUser, setEditUser] = useState<MockUser | null>(null);
  const [editForm, setEditForm] = useState(editEmpty);
  const [savingEdit, setSavingEdit] = useState(false);

  function openEdit(u: MockUser) {
    setEditUser(u);
    setEditForm({
      name: u.name,
      email: u.email,
      gender: u.gender === "Female" ? "female" : "male",
      city: u.city === "—" ? "" : u.city,
      country: u.country === "—" ? "" : u.country,
      status: toApiStatus(u.status),
      password: "",
    });
  }

  function resetSwipes(u: MockUser) {
    userMut.resetSwipes.mutate(u.id, {
      onSuccess: () => toast.success(`${u.name}'s discovery deck reset`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to reset deck"),
    });
  }

  async function saveEdit() {
    if (!editUser) return;
    if (!editForm.name.trim()) return toast.error("Enter a name");
    if (!/^\S+@\S+\.\S+$/.test(editForm.email)) return toast.error("Enter a valid email");
    setSavingEdit(true);
    try {
      const body: Record<string, unknown> = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        gender: editForm.gender,
        city: editForm.city.trim(),
        country: editForm.country.trim(),
        status: editForm.status,
      };
      if (editForm.password.trim()) body.password = editForm.password.trim();
      await userMut.update.mutateAsync({ id: editUser.id, body });
      toast.success(`${editForm.name} updated`);
      setEditUser(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update user");
    } finally {
      setSavingEdit(false);
    }
  }

  function handleExport() {
    downloadCSV("halal-connect-users", users, [
      "id", "name", "email", "age", "gender", "country", "city",
      "practice", "madhab", "status", "verified", "premium", "completeness", "joined",
    ]);
    toast.success(`Exported ${users.length} users on this page to PDF`);
  }

  function resetForm() {
    setForm({ name: "", email: "", password: "", role: "user", status: "active", gender: "male" });
  }

  function handleCreate() {
    if (!form.name.trim()) return toast.error("Enter a name");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return toast.error("Enter a valid email");
    if (form.password.length < 6) return toast.error("Password must be at least 6 characters");
    setCreating(true);
    userMut.create.mutate(
      {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role as "user" | "admin",
        status: form.status,
        gender: form.gender as "male" | "female",
      },
      {
        onSuccess: () => {
          toast.success(`${form.role === "admin" ? "Admin" : "User"} ${form.name} created`);
          setCreating(false);
          setAddOpen(false);
          resetForm();
        },
        onError: (e) => {
          toast.error(e instanceof Error ? e.message : "Failed to create user");
          setCreating(false);
        },
      },
    );
  }

  function applyAction() {
    if (!confirm) return;
    const { user, action } = confirm;
    const onError = (e: unknown) => toast.error(e instanceof Error ? e.message : "Action failed");
    if (action === "ban") userMut.setStatus.mutate({ id: user.id, status: "banned" }, { onError });
    else if (action === "unban") userMut.setStatus.mutate({ id: user.id, status: "active" }, { onError });
    else if (action === "verify") userMut.verify.mutate({ id: user.id, verified: true }, { onError });
    const labels = { ban: "banned", unban: "reinstated", verify: "verified" } as const;
    toast.success(`${user.name} has been ${labels[action]}`);
    setConfirm(null);
  }

  return (
    <AdminLayout>
      <PageHeader
        title="User Management"
        description={isLoading ? "Loading users…" : `${total.toLocaleString()} users${isFetching ? " · refreshing…" : ""}`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />Export
            </Button>
            <Button
              size="sm"
              onClick={() => setAddOpen(true)}
              className="bg-gradient-primary text-primary-foreground border-0 shadow-elegant"
            >
              <Plus className="h-4 w-4 mr-2" />Add User
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
              {!isLoading && users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">
                    No users match these filters.
                  </TableCell>
                </TableRow>
              )}
              {users.map((u) => (
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
                    {/* Dev-only helper: repopulate this user's discovery deck. */}
                    {import.meta.env.DEV && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mr-1 h-8"
                        title="Clear this user's swipes so their discovery deck refills (dev only)"
                        onClick={() => resetSwipes(u)}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset deck
                      </Button>
                    )}
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
                        <DropdownMenuItem onClick={() => openEdit(u)}>
                          <Pencil className="h-4 w-4 mr-2" /> Edit details
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

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page</span>
            <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
              <SelectTrigger className="h-8 w-[72px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground tabular-nums">
              {rangeStart}–{rangeEnd} of {total.toLocaleString()}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm tabular-nums px-1">Page {page} of {pageCount}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page >= pageCount || isFetching}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Edit user details dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit {editUser?.name}</DialogTitle>
            <DialogDescription>Update this member's account and profile details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={editForm.gender} onValueChange={(v) => setEditForm({ ...editForm, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="banned">Banned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Reset password (optional)</Label>
                <Input type="password" value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Leave blank to keep" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)} disabled={savingEdit}>Cancel</Button>
            <Button className="bg-gradient-primary" onClick={saveEdit} disabled={savingEdit}>
              {savingEdit ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Add user / admin dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a user</DialogTitle>
            <DialogDescription>
              Creates an account directly. The email is marked verified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-name">Full name</Label>
              <Input id="new-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Aisha Hassan" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-email">Email</Label>
              <Input id="new-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Temporary password</Label>
              <Input id="new-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="banned">Banned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-gradient-primary text-primary-foreground border-0">
              {creating ? "Creating…" : "Create user"}
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
