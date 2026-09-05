import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck, Download, HeartHandshake, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";

import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadCSV } from "@/lib/csv";
import { mockUsers } from "@/lib/mock-data";

export const Route = createFileRoute("/journey")({
  head: () => ({
    meta: [
      { title: "Marriage Journey — Halal Connect Admin" },
      { name: "description", content: "Track proposals, marriage readiness checklists and health disclosure adoption across Halal Connect." },
      { property: "og:title", content: "Marriage Journey — Halal Connect Admin" },
      { property: "og:description", content: "Track proposals, marriage readiness checklists and health disclosure adoption across Halal Connect." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JourneyPage,
});

const STAGES = ["Interest", "Wali contacted", "Families met", "Proposal", "Nikah"] as const;
type Stage = (typeof STAGES)[number];

type Proposal = {
  id: string;
  brother: string;
  sister: string;
  stage: Stage;
  waliInvolved: boolean;
  opened: string;
  lastUpdate: string;
};

const proposals: Proposal[] = mockUsers.slice(0, 26).map((u, i) => ({
  id: `prp_${(4000 + i).toString(36)}`,
  brother: mockUsers[(i * 3 + 1) % mockUsers.length].name,
  sister: u.name,
  stage: STAGES[i % STAGES.length],
  waliInvolved: i % 3 !== 0,
  opened: `2026-0${(i % 9) + 1}-${String((i % 27) + 1).padStart(2, "0")}`,
  lastUpdate: `${(i % 14) + 1}d ago`,
}));

const checklist = [
  { item: "Profile & intentions completed", pct: 92 },
  { item: "Wali details provided", pct: 71 },
  { item: "Marriage timeline agreed", pct: 58 },
  { item: "Financial readiness answered", pct: 46 },
  { item: "Living arrangements discussed", pct: 39 },
  { item: "Family introduction booked", pct: 27 },
];

const healthAdoption = [
  { label: "Opted in to health disclosure", count: 1840 },
  { label: "Shared with a matched member", count: 962 },
  { label: "Shared with a wali", count: 611 },
  { label: "Declined to share", count: 407 },
];

const stageTone: Record<Stage, string> = {
  Interest: "bg-muted text-muted-foreground",
  "Wali contacted": "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "Families met": "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  Proposal: "bg-primary/15 text-primary",
  Nikah: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

function JourneyPage() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | Stage>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return proposals.filter((p) => {
      const stageOk = tab === "all" || p.stage === tab;
      const queryOk = !q || `${p.brother} ${p.sister} ${p.id}`.toLowerCase().includes(q);
      return stageOk && queryOk;
    });
  }, [search, tab]);

  const nikahCount = proposals.filter((p) => p.stage === "Nikah").length;
  const waliPct = Math.round(
    (proposals.filter((p) => p.waliInvolved).length / proposals.length) * 100,
  );

  return (
    <AdminLayout>
      <PageHeader
        title="Marriage Journey"
        description="Follow every proposal from first interest through to nikah, with readiness and disclosure insight."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              downloadCSV("halal-connect-marriage-journey", filtered);
              toast.success("Export started");
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active journeys" value={String(proposals.length)} icon={HeartHandshake} />
        <StatCard label="Reached nikah" value={String(nikahCount)} icon={ClipboardCheck} />
        <StatCard label="Wali involved" value={`${waliPct}%`} icon={ShieldCheck} />
        <StatCard label="Health disclosure opt-ins" value="1,840" icon={Users} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Proposal pipeline</CardTitle>
            <Input
              placeholder="Search by member or proposal ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList className="flex-wrap">
                <TabsTrigger value="all">All</TabsTrigger>
                {STAGES.map((s) => (
                  <TabsTrigger key={s} value={s}>
                    {s}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value={tab} className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pair</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Wali</TableHead>
                      <TableHead>Opened</TableHead>
                      <TableHead>Last update</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium">
                            {p.brother} &amp; {p.sister}
                          </div>
                          <div className="text-xs text-muted-foreground">{p.id}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={stageTone[p.stage]}>{p.stage}</Badge>
                        </TableCell>
                        <TableCell>
                          {p.waliInvolved ? (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                              Involved
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not yet</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.opened}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.lastUpdate}</TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                          No journeys match that search.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Readiness checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {checklist.map((c) => (
                <div key={c.item}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{c.item}</span>
                    <span className="text-muted-foreground">{c.pct}%</span>
                  </div>
                  <Progress value={c.pct} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Health disclosure</CardTitle>
              <p className="text-sm text-muted-foreground">
                Aggregate counts only — no admin can read a member&apos;s health details.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {healthAdoption.map((h) => (
                <div key={h.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{h.label}</span>
                  <span className="font-semibold">{h.count.toLocaleString()}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
