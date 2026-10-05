import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/layout";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { CircleDot, Flame, Trophy, Users, Plus, Download } from "lucide-react";
import { toast } from "sonner";
import { downloadCSV } from "@/lib/csv";
import {
  useTasbihStats,
  useTasbihWeekly,
  useTasbihLeaderboard,
  useTasbihBadges,
  useTasbihSettings,
  useTasbihMutations,
} from "@/lib/admin-hooks";
import type { TasbihBadge as ApiBadge, TasbihLeader } from "@/store/admin-api";

export const Route = createFileRoute("/tasbih")({
  component: TasbihPage,
  head: () => ({
    meta: [{ title: "Tasbih & Streaks — Halal Connect Admin" }],
  }),
});

type Badge = {
  id: string;
  name: string;
  threshold: number;
  type: "streak" | "count";
  active: boolean;
};

function TasbihPage() {
  const { data: stats } = useTasbihStats();
  const { data: weekly } = useTasbihWeekly();
  const { data: leaders } = useTasbihLeaderboard(20);
  const { data: apiBadges } = useTasbihBadges();
  const { data: settings } = useTasbihSettings();
  const { createBadge, updateBadge, saveSettings, adjustStreak } = useTasbihMutations();

  const [streakGrace, setStreakGrace] = useState([1]);
  const [dailyGoal, setDailyGoal] = useState([100]);
  const [requireAuth, setRequireAuth] = useState(true);
  const [offlineSync, setOfflineSync] = useState(true);
  const [newBadge, setNewBadge] = useState({
    name: "",
    threshold: 0,
    type: "streak" as Badge["type"],
  });

  // Adopt server settings once they arrive.
  useEffect(() => {
    if (!settings) return;
    setDailyGoal([settings.dailyGoal]);
    setStreakGrace([settings.graceDays]);
    setRequireAuth(settings.requireAuth);
    setOfflineSync(settings.offlineSync);
  }, [settings]);

  const weeklyData = weekly ?? [];
  const badges: Badge[] = ((apiBadges ?? []) as ApiBadge[]).map((badge) => ({
    id: badge.id,
    name: badge.name,
    threshold: badge.threshold,
    type: badge.type,
    active: badge.active,
  }));
  const topUsers = ((leaders ?? []) as TasbihLeader[]).map((leader) => ({
    id: leader.userId,
    name: leader.name,
    email: leader.email,
    streak: leader.currentStreak,
    total: leader.totalCount,
  }));

  const addBadge = () => {
    if (!newBadge.name || newBadge.threshold <= 0) {
      toast.error("Provide a name and threshold > 0");
      return;
    }
    const draft = { name: newBadge.name, type: newBadge.type, threshold: newBadge.threshold };
    createBadge.mutate(draft, {
      onSuccess: () => toast.success("Badge created"),
      onError: () => toast.error("Could not create badge"),
    });
    setNewBadge({ name: "", threshold: 0, type: "streak" });
  };

  const toggleBadge = (id: string) => {
    const current = badges.find((b) => b.id === id);
    if (!current) return;
    updateBadge.mutate(
      { id, active: !current.active },
      { onError: () => toast.error("Could not update badge") },
    );
  };

  const saveRules = () => {
    saveSettings.mutate(
      {
        dailyGoal: dailyGoal[0],
        graceDays: streakGrace[0],
        requireAuth,
        offlineSync,
      },
      {
        onSuccess: () => toast.success("Streak rules saved"),
        onError: () => toast.error("Could not save streak rules"),
      },
    );
  };

  const adjust = (userId: string, name: string, currentStreak: number) => {
    const input = window.prompt(`Set current streak (days) for ${name}`, String(currentStreak));
    if (input == null) return;
    const value = Number(input);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Enter a valid number of days");
      return;
    }
    adjustStreak.mutate(
      { userId, currentStreak: value, reason: "Admin adjustment" },
      {
        onSuccess: () => toast.success(`Streak adjusted for ${name}`),
        onError: () => toast.error("Could not adjust streak"),
      },
    );
  };

  const exportLeaderboard = () => {
    const ok = downloadCSV(
      `halal-connect-tasbih-leaderboard-${new Date().toISOString().slice(0, 10)}`,
      topUsers.map((u) => ({
        name: u.name,
        email: u.email,
        streak_days: u.streak,
        total_count: u.total,
      })),
    );
    toast[ok ? "success" : "error"](ok ? "Leaderboard exported" : "Nothing to export");
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
          <StatCard
            label="Active Streaks"
            value={stats?.activeStreaks?.toLocaleString() ?? "—"}
            icon={Flame}
          />
          <StatCard
            label="Sessions Today"
            value={stats?.sessionsToday?.toLocaleString() ?? "—"}
            icon={CircleDot}
          />
          <StatCard
            label="Badges Awarded"
            value={stats?.badgesAwarded?.toLocaleString() ?? "—"}
            icon={Trophy}
          />
          <StatCard
            label="Avg Daily Users"
            value={stats?.avgDailyUsers?.toLocaleString() ?? "—"}
            icon={Users}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Engagement</CardTitle>
            <CardDescription>Sessions and unique users per day</CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyData.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No weekly Tasbih activity is available yet.
              </div>
            ) : (
              <ChartContainer
                config={{
                  sessions: { label: "Sessions", color: "hsl(var(--chart-1))" },
                  users: { label: "Users", color: "hsl(var(--chart-2))" },
                }}
                className="h-[280px] w-full"
              >
                <ResponsiveContainer>
                  <AreaChart data={weeklyData}>
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
                    <Area
                      type="monotone"
                      dataKey="sessions"
                      stroke="hsl(var(--chart-1))"
                      fill="url(#s)"
                    />
                    <Area
                      type="monotone"
                      dataKey="users"
                      stroke="hsl(var(--chart-2))"
                      fill="url(#u)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
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
                <Slider
                  disabled={!settings}
                  value={dailyGoal}
                  onValueChange={setDailyGoal}
                  min={10}
                  max={500}
                  step={10}
                />
                <div className="text-xs text-muted-foreground">
                  {dailyGoal[0]} dhikr / day to maintain a streak
                </div>
              </div>
              <div className="space-y-2">
                <Label>Grace Days per Month</Label>
                <Slider
                  disabled={!settings}
                  value={streakGrace}
                  onValueChange={setStreakGrace}
                  min={0}
                  max={5}
                  step={1}
                />
                <div className="text-xs text-muted-foreground">
                  {streakGrace[0]} missed day(s) allowed without resetting
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">Require Authentication</div>
                  <div className="text-xs text-muted-foreground">
                    Anonymous sessions won't count
                  </div>
                </div>
                <Switch
                  disabled={!settings}
                  checked={requireAuth}
                  onCheckedChange={setRequireAuth}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">Offline Sync</div>
                  <div className="text-xs text-muted-foreground">
                    Buffer sessions and sync with idempotency keys
                  </div>
                </div>
                <Switch
                  disabled={!settings}
                  checked={offlineSync}
                  onCheckedChange={setOfflineSync}
                />
              </div>
              <Button disabled={!settings} onClick={saveRules} className="w-full">
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
                  <Button size="sm" disabled={apiBadges === undefined}>
                    <Plus className="h-4 w-4 mr-1" /> New
                  </Button>
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
                          onChange={(e) =>
                            setNewBadge({ ...newBadge, type: e.target.value as Badge["type"] })
                          }
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
                          onChange={(e) =>
                            setNewBadge({ ...newBadge, threshold: Number(e.target.value) })
                          }
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
              {badges.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  No achievement badges are configured.
                </p>
              ) : (
                badges.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground">
                        <Trophy className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{b.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {b.threshold.toLocaleString()}{" "}
                          {b.type === "streak" ? "day streak" : "total dhikr"}
                        </div>
                      </div>
                    </div>
                    <Switch checked={b.active} onCheckedChange={() => toggleBadge(b.id)} />
                  </div>
                ))
              )}
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
                {topUsers.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No Tasbih leaderboard data is available yet.
                    </TableCell>
                  </TableRow>
                )}
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
                        onClick={() => adjust(u.id, u.name, u.streak)}
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
