import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/layout";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { CircleDot, Flame, Trophy, Users, Plus, Download } from "lucide-react";
import { toast } from "sonner";
import { exportToCSV } from "@/lib/csv";
import { mockUsers } from "@/lib/mock-data";

export const Route = createFileRoute("/tasbih")({
  component: TasbihPage,
  head: () => ({
    meta: [{ title: "Tasbih & Streaks — Halal Connect Admin" }],
  }),
});

const weeklyCounts = [
  { day: "Mon", sessions: 4820, users: 1240 },
  { day: "Tue", sessions: 5210, users: 1380 },
  { day: "Wed", sessions: 5640, users: 1510 },
  { day: "Thu", sessions: 6020, users: 1620 },
  { day: "Fri", sessions: 8240, users: 2180 },
  { day: "Sat", sessions: 6480, users: 1740 },
  { day: "Sun", sessions: 6120, users: 1660 },
];

type Badge = { id: string; name: string; threshold: number; type: "streak" | "count"; active: boolean };

const initialBadges: Badge[] = [
  { id: "b1", name: "First Dhikr", threshold: 1, type: "count", active: true },
  { id: "b2", name: "7-Day Streak", threshold: 7, type: "streak", active: true },
  { id: "b3", name: "30-Day Devotee", threshold: 30, type: "streak", active: true },
  { id: "b4", name: "1,000 Dhikr", threshold: 1000, type: "count", active: true },
  { id: "b5", name: "10,000 Dhikr", threshold: 10000, type: "count", active: false },
];

function TasbihPage() {
  const [streakGrace, setStreakGrace] = useState([1]);
  const [dailyGoal, setDailyGoal] = useState([100]);
  const [requireAuth, setRequireAuth] = useState(true);
  const [offlineSync, setOfflineSync] = useState(true);
  const [badges, setBadges] = useState<Badge[]>(initialBadges);
  const [newBadge, setNewBadge] = useState({ name: "", threshold: 0, type: "streak" as Badge["type"] });

  const topUsers = useMemo(
    () =>
      mockUsers.slice(0, 12).map((u, i) => ({
        ...u,
        streak: 60 - i * 3,
        total: 12400 - i * 720,
      })),
    [],
  );

  const addBadge = () => {
    if (!newBadge.name || newBadge.threshold <= 0) {
      toast.error("Provide a name and threshold > 0");
      return;
    }
    setBadges((b) => [
      ...b,
      { id: `b${Date.now()}`, name: newBadge.name, threshold: newBadge.threshold, type: newBadge.type, active: true },
    ]);
    setNewBadge({ name: "", threshold: 0, type: "streak" });
    toast.success("Badge created");
  };

  const toggleBadge = (id: string) => {
    setBadges((b) => b.map((x) => (x.id === id ? { ...x, active: !x.active } : x)));
  };

  const exportLeaderboard = () => {
    exportToCSV(
      "tasbih-leaderboard.csv",
      topUsers.map((u) => ({
        name: u.name,
        email: u.email,
        streak_days: u.streak,
        total_count: u.total,
      })),
    );
    toast.success("Leaderboard exported");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasbih & Streaks</h1>
          <p className="text-muted-foreground text-sm">
            Monitor global dhikr engagement, manage badges, and tune streak rules.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Active Streaks" value="8,420" icon={Flame} trend={{ value: 12.4, isPositive: true }} />
          <StatCard title="Sessions Today" value="42,318" icon={CircleDot} trend={{ value: 8.1, isPositive: true }} />
          <StatCard title="Badges Awarded" value="1,284" icon={Trophy} trend={{ value: 3.2, isPositive: true }} />
          <StatCard title="Avg Daily Users" value="1,620" icon={Users} trend={{ value: 5.6, isPositive: true }} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Engagement</CardTitle>
            <CardDescription>Sessions and unique users per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                sessions: { label: "Sessions", color: "hsl(var(--chart-1))" },
                users: { label: "Users", color: "hsl(var(--chart-2))" },
              }}
              className="h-[280px] w-full"
            >
              <ResponsiveContainer>
                <AreaChart data={weeklyCounts}>
                  <defs>
                    <linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="u" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="sessions" stroke="hsl(var(--chart-1))" fill="url(#s)" />
                  <Area type="monotone" dataKey="users" stroke="hsl(var(--chart-2))" fill="url(#u)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Streak Rules</CardTitle>
              <CardDescription>Configure how streaks are earned and preserved</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Daily Goal (count)</Label>
                <Slider value={dailyGoal} onValueChange={setDailyGoal} min={10} max={500} step={10} />
                <div className="text-xs text-muted-foreground">{dailyGoal[0]} dhikr / day to maintain a streak</div>
              </div>
              <div className="space-y-2">
                <Label>Grace Days per Month</Label>
                <Slider value={streakGrace} onValueChange={setStreakGrace} min={0} max={5} step={1} />
                <div className="text-xs text-muted-foreground">{streakGrace[0]} missed day(s) allowed without resetting</div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">Require Authentication</div>
                  <div className="text-xs text-muted-foreground">Anonymous sessions won't count</div>
                </div>
                <Switch checked={requireAuth} onCheckedChange={setRequireAuth} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">Offline Sync</div>
                  <div className="text-xs text-muted-foreground">Buffer sessions and sync with idempotency keys</div>
                </div>
                <Switch checked={offlineSync} onCheckedChange={setOfflineSync} />
              </div>
              <Button onClick={() => toast.success("Streak rules saved")} className="w-full">
                Save Rules
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Achievement Badges</CardTitle>
                <CardDescription>Awarded automatically when thresholds are met</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Badge</DialogTitle>
                    <DialogDescription>Set a name, type and threshold.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Name</Label>
                      <Input
                        value={newBadge.name}
                        onChange={(e) => setNewBadge({ ...newBadge, name: e.target.value })}
                        placeholder="e.g. 100-Day Streak"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Type</Label>
                        <select
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                          value={newBadge.type}
                          onChange={(e) => setNewBadge({ ...newBadge, type: e.target.value as Badge["type"] })}
                        >
                          <option value="streak">Streak (days)</option>
                          <option value="count">Count (total)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Threshold</Label>
                        <Input
                          type="number"
                          value={newBadge.threshold || ""}
                          onChange={(e) => setNewBadge({ ...newBadge, threshold: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={addBadge}>Create</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-2">
              {badges.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground">
                      <Trophy className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{b.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.threshold.toLocaleString()} {b.type === "streak" ? "day streak" : "total dhikr"}
                      </div>
                    </div>
                  </div>
                  <Switch checked={b.active} onCheckedChange={() => toggleBadge(b.id)} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Leaderboard</CardTitle>
              <CardDescription>Top users by current streak</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportLeaderboard}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Streak</TableHead>
                  <TableHead>Total Dhikr</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topUsers.map((u, i) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{i + 1}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1">
                        <Flame className="h-3.5 w-3.5 text-orange-500" />
                        {u.streak}d
                      </span>
                    </TableCell>
                    <TableCell>{u.total.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toast.success(`Streak adjusted for ${u.name}`)}
                      >
                        Adjust
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}