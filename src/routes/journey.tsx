import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { HeartHandshake, ShieldCheck, ClipboardCheck, Download, Stethoscope } from "lucide-react";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { downloadCSV } from "@/lib/csv";
import { mockUsers } from "@/lib/mock-data";

export const Route = createFileRoute("/journey")({
  component: JourneyPage,
  head: () => ({
    meta: [
      { title: "Marriage Journey — Halal Connect Admin" },
      {
        name: "description",
        content:
          "Track nikah proposals, marriage readiness checklists and privacy-preserving health disclosure adoption across Halal Connect members.",
      },
      { property: "og:title", content: "Marriage Journey — Halal Connect Admin" },
      { property: "og:description", content: "Proposals, readiness checklists and health disclosure adoption." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type ProposalStage = "proposed" | "wali_review" | "families_meeting" | "accepted" | "declined";

const stageLabel: Record<ProposalStage, string> = {
  proposed: "Proposal sent",
  wali_review: "Wali review",
  families_meeting: "Families meeting",
  accepted: "Accepted",
  declined: "Declined",
};

const stageTone: Record<ProposalStage, string> = {
  proposed: "secondary",
  wali_review: "outline",
  families_meeting: "outline",
  accepted: "default",
  declined: "destructive",
};

type Proposal = {
  id: string;
  from: string;
  to: string;
  stage: ProposalStage;
  waliInvolved: boolean;
  createdAt: string;
  checklist: number;
};

const stages: ProposalStage[] = ["proposed", "wali_review", "families_meeting", "accepted", "declined"];

const proposals: Proposal[] = mockUsers.slice(0, 24).map((u, i) => ({
  id: `prp_${i + 1}`,
  from: u.name,
  to: mockUsers[(i + 7) % mockUsers.length].name,
  stage: stages[i % stages.length],
  waliInvolved: i % 3 !== 0,
  createdAt: `${(i % 20) + 1}d ago`,
  checklist: [20, 40, 60, 80, 100][i % 5],
}));

// Health disclosure is aggregate-only by design: admins never see a member's
// medical answers, just whether the disclosure step was completed and shared.
const healthAdoption = [
  { label: "Completed health disclosure", value: 62 },
  { label: "Shared with a match", value: 38 },
  { label: "Shared with wali", value: 24 },
  { label: "Requested medical certificate upload", value: 11 },
];

const checklistItems = [
  { item: "Profile & photos verified", done: 84 },
  { item: "Identity verified", done: 71 },
  { item: "Wali assigned", done: 58 },
  { item: "Marriage intentions questionnaire", done: 66 },
  { item: "Health disclosure", done: 62 },
  { item: "Family introduction call", done: 29 },
];

function JourneyPage() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | ProposalStage>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return proposals.filter(
      (p) =>
        (tab === "all" || p.stage === tab) &&
        (!q || p.from.toLowerCase().includes(q) || p.to.toLowerCase().includes(q) || p.id.includes(q)),
    );
  }, [search, tab]);

  const accepted = proposals.filter((p) => p.stage === "accepted").length;
  const inReview = proposals.filter((p) => p.stage === "wali_review" || p.stage === "families_meeting").length;

  return (
    <AdminLayout>
      <PageHeader
        title="Marriage Journey"
        description="Nikah proposals, readiness checklists and health-disclosure adoption — aggregate only, no medical details."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              downloadCSV("marriage-journey-proposals", filtered);
              toast.success("Proposals exported");
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Active proposals" value={String(proposals.length)} icon={HeartHandshake} />
        <StatCard label="Awaiting wali / families" value={String(inReview)} icon={ShieldCheck} />
        <StatCard label="Accepted (nikah track)" value={String(accepted)} icon={ClipboardCheck} />
        <StatCard label="Health disclosure rate" value="62%" icon={Stethoscope} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Health disclosure adoption</CardTitle>
            <CardDescription>
              Percentages only. Answers stay encrypted and are never visible to admins.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {healthAdoption.map((h) => (
              <div key={h.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{h.label}</span>
                  <span className="text-muted-foreground">{h.value}%</span>
                </div>
                <Progress value={h.value} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Marriage readiness checklist</CardTitle>
            <CardDescription>Share of active members who completed each step.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {checklistItems.map((c) => (
              <div key={c.item}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{c.item}</span>
                  <span className="text-muted-foreground">{c.done}%</span>
                </div>
                <Progress value={c.done} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Proposals</CardTitle>
              <CardDescription>Every nikah proposal and the stage it has reached.</CardDescription>
            </div>
            <Input
              placeholder="Search member or proposal ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:w-72"
            />
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              {stages.map((s) => (
                <TabsTrigger key={s} value={s}>
                  {stageLabel[s]}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value={tab} />
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proposal</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Wali</TableHead>
                  <TableHead>Checklist</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No proposals match this filter
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.id}</TableCell>
                      <TableCell className="font-medium">{p.from}</TableCell>
                      <TableCell>{p.to}</TableCell>
                      <TableCell>
                        <Badge variant={stageTone[p.stage] as "default" | "secondary" | "outline" | "destructive"}>
                          {stageLabel[p.stage]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {p.waliInvolved ? (
                          <Badge variant="outline">CC'd</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="w-40">
                        <div className="flex items-center gap-2">
                          <Progress value={p.checklist} className="h-2" />
                          <span className="text-xs text-muted-foreground">{p.checklist}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.createdAt}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
