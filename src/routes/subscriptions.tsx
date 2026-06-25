import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { CreditCard, Package, Plus, Pencil, Trash2, Link2, UserCog } from "lucide-react";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useSubscriptions, useSubscriptionMutations,
  usePlans, usePlanMutations, useUsers, useUserMutations,
} from "@/lib/admin-hooks";

export const Route = createFileRoute("/subscriptions")({ component: SubscriptionsPage });

type Sub = {
  id: string; userId: string; userName: string; userEmail: string;
  gender: string | null; country: string | null; city: string | null;
  userStatus: string | null;
  planId: string; planName: string; tier: string | null;
  priceCents: number; currency: string; interval: string;
  provider: string; status: string; currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean; createdAt: string; updatedAt: string;
};

type Plan = {
  id: string; tier: string; name: string; description: string | null;
  priceCents: number; currency: string; interval: string;
  features: string[]; visible: boolean; sortOrder: number;
};

const PROVIDERS = ["manual", "stripe", "apple", "google"];
const SUB_STATUSES = ["active", "pending", "canceled", "expired"];
const TIERS = ["basic", "premium", "vip"];
const INTERVALS = ["month", "year", "once"];

const money = (cents: number, currency = "USD") =>
  cents === 0 ? "Free" : `${currency === "USD" ? "$" : currency + " "}${(cents / 100).toFixed(2)}`;
const dateStr = (iso: string | null) =>
  !iso ? "—" : new Date(iso).toLocaleDateString();
const dateInput = (iso: string | null) =>
  !iso ? "" : new Date(iso).toISOString().slice(0, 10);

const tierVariant = (tier: string | null) =>
  tier === "vip" ? "default" : tier === "premium" ? "secondary" : "outline";
const statusVariant = (s: string) =>
  s === "active" ? "default" : s === "pending" ? "secondary" : "outline";

function SubscriptionsPage() {
  const { data: subs } = useSubscriptions();
  const { data: rawPlans } = usePlans();
  const { data: usersData } = useUsers({ limit: 100 });
  const subMut = useSubscriptionMutations();
  const planMut = usePlanMutations();

  const plans = (rawPlans ?? []) as Plan[];
  const subscriptions = (subs ?? []) as Sub[];
  const users = usersData?.users ?? [];

  return (
    <AdminLayout>
      <PageHeader
        title="Subscriptions"
        description="Manage member subscriptions and the subscription packages they can buy."
      />

      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions">
            <CreditCard className="h-4 w-4 mr-2" /> Subscriptions
          </TabsTrigger>
          <TabsTrigger value="packages">
            <Package className="h-4 w-4 mr-2" /> Subscription Packages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions">
          <SubscriptionsTab
            subscriptions={subscriptions}
            plans={plans}
            users={users}
            subMut={subMut}
          />
        </TabsContent>

        <TabsContent value="packages">
          <PackagesTab plans={plans} planMut={planMut} />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

// ── Subscriptions tab ─────────────────────────────────────────────
function SubscriptionsTab({
  subscriptions, plans, users, subMut,
}: {
  subscriptions: Sub[];
  plans: Plan[];
  users: { id: string; name: string; email: string }[];
  subMut: ReturnType<typeof useSubscriptionMutations>;
}) {
  const empty = { userId: "", planId: "", provider: "manual", status: "active", currentPeriodEnd: "", cancelAtPeriodEnd: false };
  const [attachOpen, setAttachOpen] = useState(false);
  const [editing, setEditing] = useState<Sub | null>(null);
  const [del, setDel] = useState<Sub | null>(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  // ── Inline edit of the subscriber's user details ───────────────
  const userMut = useUserMutations();
  const userEmpty = { name: "", email: "", gender: "male", city: "", country: "", status: "active", password: "" };
  const [editUser, setEditUser] = useState<Sub | null>(null);
  const [userForm, setUserForm] = useState(userEmpty);
  const [savingUser, setSavingUser] = useState(false);

  function openEditUser(s: Sub) {
    setEditUser(s);
    setUserForm({
      name: s.userName === "—" ? "" : s.userName,
      email: s.userEmail === "—" ? "" : s.userEmail,
      gender: s.gender === "Female" ? "female" : "male",
      city: s.city ?? "",
      country: s.country ?? "",
      status: s.userStatus ?? "active",
      password: "",
    });
  }

  async function saveUser() {
    if (!editUser) return;
    if (!userForm.name.trim()) return toast.error("Enter a name");
    if (!/^\S+@\S+\.\S+$/.test(userForm.email)) return toast.error("Enter a valid email");
    setSavingUser(true);
    try {
      const body: Record<string, unknown> = {
        name: userForm.name.trim(),
        email: userForm.email.trim(),
        gender: userForm.gender,
        city: userForm.city.trim(),
        country: userForm.country.trim(),
        status: userForm.status,
      };
      if (userForm.password.trim()) body.password = userForm.password.trim();
      await userMut.update.mutateAsync({ id: editUser.userId, body });
      toast.success(`${userForm.name} updated`);
      setEditUser(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update user");
    } finally {
      setSavingUser(false);
    }
  }

  function openAttach() {
    setForm({ ...empty, planId: plans[0]?.id ?? "" });
    setEditing(null);
    setAttachOpen(true);
  }
  function openEdit(s: Sub) {
    setEditing(s);
    setForm({
      userId: s.userId, planId: s.planId, provider: s.provider,
      status: s.status, currentPeriodEnd: dateInput(s.currentPeriodEnd),
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    });
    setAttachOpen(true);
  }

  async function save() {
    if (!editing && !form.userId) return toast.error("Choose a user");
    if (!form.planId) return toast.error("Choose a package");
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        planId: form.planId,
        provider: form.provider,
        status: form.status,
        cancelAtPeriodEnd: form.cancelAtPeriodEnd,
        currentPeriodEnd: form.currentPeriodEnd
          ? new Date(form.currentPeriodEnd).toISOString()
          : undefined,
      };
      if (editing) {
        await subMut.update.mutateAsync({ id: editing.id, body });
        toast.success("Subscription updated");
      } else {
        await subMut.attach.mutateAsync({ ...body, userId: form.userId });
        toast.success("Subscription attached");
      }
      setAttachOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save subscription");
    } finally {
      setBusy(false);
    }
  }

  function remove(s: Sub) {
    subMut.remove.mutate(s.id, {
      onSuccess: () => toast.success(`${s.userName}'s subscription removed`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to remove"),
    });
    setDel(null);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Active & past subscriptions ({subscriptions.length})</CardTitle>
        <Button className="bg-gradient-primary" onClick={openAttach} disabled={plans.length === 0}>
          <Link2 className="h-4 w-4 mr-2" /> Attach subscription
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Renews</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    No subscriptions yet. Click "Attach subscription" to add one.
                  </TableCell>
                </TableRow>
              )}
              {subscriptions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium">{s.userName}</div>
                    <div className="text-xs text-muted-foreground">{s.userEmail}</div>
                  </TableCell>
                  <TableCell>{s.gender ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    {[s.city, s.country].filter(Boolean).join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{s.planName}</span>
                      {s.tier && <Badge variant={tierVariant(s.tier)}>{s.tier}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>{money(s.priceCents, s.currency)}<span className="text-xs text-muted-foreground">/{s.interval}</span></TableCell>
                  <TableCell className="capitalize">{s.provider}</TableCell>
                  <TableCell><Badge variant={statusVariant(s.status)}>{s.status}</Badge></TableCell>
                  <TableCell className="text-sm">
                    {dateStr(s.currentPeriodEnd)}
                    {s.cancelAtPeriodEnd && <div className="text-xs text-destructive">cancels</div>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" title="Edit user details" onClick={() => openEditUser(s)}>
                      <UserCog className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Edit subscription" onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Remove subscription" onClick={() => setDel(s)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Attach / edit subscription */}
      <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.userName}'s subscription` : "Attach subscription"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editing && (
              <div className="space-y-1.5">
                <Label>User</Label>
                <Select value={form.userId} onValueChange={(v) => setForm({ ...form, userId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select a user" /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name} — {u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Package</Label>
              <Select value={form.planId} onValueChange={(v) => setForm({ ...form, planId: v })}>
                <SelectTrigger><SelectValue placeholder="Select a package" /></SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} · {money(p.priceCents, p.currency)}/{p.interval}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Provider</Label>
                <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUB_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Renews / expires on</Label>
              <Input type="date" value={form.currentPeriodEnd}
                onChange={(e) => setForm({ ...form, currentPeriodEnd: e.target.value })} />
              <p className="text-xs text-muted-foreground">Leave blank to auto-set from the package interval.</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.cancelAtPeriodEnd}
                onCheckedChange={(v) => setForm({ ...form, cancelAtPeriodEnd: v })} />
              <span className="text-sm">Cancel at period end</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttachOpen(false)} disabled={busy}>Cancel</Button>
            <Button className="bg-gradient-primary" onClick={save} disabled={busy}>
              {busy ? "Saving…" : editing ? "Save changes" : "Attach"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit subscriber's user details */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit {editUser?.userName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={userForm.gender} onValueChange={(v) => setUserForm({ ...userForm, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={userForm.city} onChange={(e) => setUserForm({ ...userForm, city: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input value={userForm.country} onChange={(e) => setUserForm({ ...userForm, country: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={userForm.status} onValueChange={(v) => setUserForm({ ...userForm, status: v })}>
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
                <Input type="password" value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="Leave blank to keep" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)} disabled={savingUser}>Cancel</Button>
            <Button className="bg-gradient-primary" onClick={saveUser} disabled={savingUser}>
              {savingUser ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              {del && `This drops ${del.userName} back to the free plan. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => del && remove(del)}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ── Subscription packages tab ─────────────────────────────────────
function PackagesTab({
  plans, planMut,
}: {
  plans: Plan[];
  planMut: ReturnType<typeof usePlanMutations>;
}) {
  const empty = { tier: "premium", name: "", priceDollars: "0", currency: "USD", interval: "month", description: "", features: "", visible: true };
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [del, setDel] = useState<Plan | null>(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  function openCreate() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(p: Plan) {
    setEditing(p);
    setForm({
      tier: p.tier, name: p.name, priceDollars: (p.priceCents / 100).toString(),
      currency: p.currency, interval: p.interval, description: p.description ?? "",
      features: (p.features ?? []).join("\n"), visible: p.visible,
    });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) return toast.error("Enter a package name");
    setBusy(true);
    try {
      const body = {
        tier: form.tier,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        priceCents: Math.round((parseFloat(form.priceDollars) || 0) * 100),
        currency: form.currency,
        interval: form.interval,
        features: form.features.split("\n").map((f) => f.trim()).filter(Boolean),
        visible: form.visible,
      };
      if (editing) {
        await planMut.update.mutateAsync({ id: editing.id, body });
        toast.success(`${body.name} updated`);
      } else {
        await planMut.create.mutateAsync(body);
        toast.success(`${body.name} created`);
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save package");
    } finally {
      setBusy(false);
    }
  }

  function remove(p: Plan) {
    planMut.remove.mutate(p.id, {
      onSuccess: () => toast.success(`${p.name} deleted`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete"),
    });
    setDel(null);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Packages ({plans.length})</CardTitle>
        <Button className="bg-gradient-primary" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> New package
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.length === 0 && (
            <p className="text-muted-foreground col-span-full py-8 text-center">No packages yet.</p>
          )}
          {plans.map((p) => (
            <Card key={p.id} className={p.visible ? "" : "opacity-60"}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <Badge variant={tierVariant(p.tier)}>{p.tier}</Badge>
                </div>
                <div className="text-2xl font-bold">
                  {money(p.priceCents, p.currency)}
                  <span className="text-sm font-normal text-muted-foreground">/{p.interval}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                <ul className="space-y-1 text-sm">
                  {(p.features ?? []).map((f, i) => <li key={i}>• {f}</li>)}
                </ul>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={p.visible}
                      onCheckedChange={(v) =>
                        planMut.update.mutate({ id: p.id, body: { visible: v } })}
                    />
                    <span className="text-xs text-muted-foreground">Visible in app</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDel(p)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit package" : "New package"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Premium" />
              </div>
              <div className="space-y-1.5">
                <Label>Tier (gating)</Label>
                <Select value={form.tier} onValueChange={(v) => setForm({ ...form, tier: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIERS.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Price</Label>
                <Input type="number" min="0" step="0.01" value={form.priceDollars}
                  onChange={(e) => setForm({ ...form, priceDollars: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} maxLength={4} />
              </div>
              <div className="space-y-1.5">
                <Label>Interval</Label>
                <Select value={form.interval} onValueChange={(v) => setForm({ ...form, interval: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INTERVALS.map((i) => <SelectItem key={i} value={i} className="capitalize">{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Features (one per line)</Label>
              <Textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })}
                placeholder={"Unlimited likes\nSee who liked you\nNo ads"} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.visible} onCheckedChange={(v) => setForm({ ...form, visible: v })} />
              <span className="text-sm">Visible in the mobile app</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button className="bg-gradient-primary" onClick={save} disabled={busy}>
              {busy ? "Saving…" : editing ? "Save changes" : "Create package"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete package?</AlertDialogTitle>
            <AlertDialogDescription>
              {del && `"${del.name}" will be removed. Packages with active subscriptions can't be deleted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => del && remove(del)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
