import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { BarChart3, Download, FileText, Sparkles, Loader2 } from "lucide-react";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadCSV } from "@/lib/csv";
import { generateReportPdf } from "@/lib/report-pdf";
import { summariseReport } from "@/lib/ai.functions";
import { getToken } from "@/lib/api";
import {
  useUsers,
  useSubscriptions,
  useTickets,
  useDeletionRequests,
  useNotificationHistory,
} from "@/lib/admin-hooks";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
  head: () => ({
    meta: [
      { title: "Reports & Exports — Halal Connect Admin" },
      {
        name: "description",
        content:
          "Build filtered Halal Connect reports on members, subscriptions, support and notifications, then export branded PDF.",
      },
      { property: "og:title", content: "Reports & Exports — Halal Connect Admin" },
      { property: "og:description", content: "Branded PDF reporting for Halal Connect." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type ReportKey = "users" | "subscriptions" | "support" | "deletions" | "notifications";

const REPORTS: { key: ReportKey; label: string; description: string }[] = [
  { key: "users", label: "Members", description: "Profiles, status, verification and plan." },
  {
    key: "subscriptions",
    label: "Subscriptions",
    description: "Active plans, providers and renewals.",
  },
  {
    key: "support",
    label: "Support tickets",
    description: "Ticket volume, categories and status.",
  },
  { key: "deletions", label: "Deletion requests", description: "Account deletion compliance log." },
  { key: "notifications", label: "Notifications", description: "Campaigns sent and their reach." },
];

const STATUS_OPTIONS: Record<ReportKey, string[]> = {
  users: ["active", "inactive", "pending", "banned"],
  subscriptions: ["active", "pending", "canceled", "expired"],
  support: ["open", "pending", "closed"],
  deletions: ["pending", "confirmed", "rejected"],
  notifications: [],
};

const d = (v: unknown) => {
  if (!v) return "";
  const dt = new Date(String(v));
  return Number.isNaN(dt.getTime()) ? String(v) : dt.toISOString().slice(0, 10);
};

function inRange(iso: unknown, from: string, to: string) {
  if (!from && !to) return true;
  const t = new Date(String(iso ?? "")).getTime();
  if (Number.isNaN(t)) return true;
  if (from && t < new Date(`${from}T00:00:00`).getTime()) return false;
  if (to && t > new Date(`${to}T23:59:59`).getTime()) return false;
  return true;
}

function ReportsPage() {
  const [type, setType] = useState<ReportKey>("users");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState<"csv" | "pdf" | null>(null);
  const [useAi, setUseAi] = useState(true);

  const { data: usersData } = useUsers({ limit: 500 });
  const { data: subsData } = useSubscriptions();
  const { data: ticketsData } = useTickets({ status: "all" });
  const { data: deletionsData } = useDeletionRequests();
  const { data: notifData } = useNotificationHistory();

  const built = useMemo(() => {
    const s = (v: unknown) => String(v ?? "");
    const matchStatus = (v: unknown) => status === "all" || s(v).toLowerCase() === status;

    if (type === "users") {
      const rows = ((usersData?.users ?? []) as Record<string, any>[]).filter(
        (u) => matchStatus(u.status) && inRange(u.joined ?? u.createdAt, from, to),
      );
      return {
        title: "Member Report",
        columns: ["Name", "Email", "Gender", "Country", "Status", "Verified", "Premium", "Joined"],
        rows: rows.map((u) => [
          s(u.name),
          s(u.email),
          s(u.gender),
          s(u.country ?? u.city),
          s(u.status),
          u.verified ? "Yes" : "No",
          u.premium ? "Yes" : "No",
          d(u.joined ?? u.createdAt),
        ]),
        summary: [
          { label: "Members", value: String(rows.length) },
          { label: "Verified", value: String(rows.filter((u) => u.verified).length) },
          { label: "Premium", value: String(rows.filter((u) => u.premium).length) },
          { label: "Banned", value: String(rows.filter((u) => s(u.status) === "banned").length) },
        ],
      };
    }

    if (type === "subscriptions") {
      const rows = ((subsData ?? []) as Record<string, any>[]).filter(
        (x) => matchStatus(x.status) && inRange(x.createdAt ?? x.startedAt, from, to),
      );
      return {
        title: "Subscription Report",
        columns: ["Member", "Email", "Plan", "Tier", "Provider", "Status", "Interval", "Renews"],
        rows: rows.map((x) => [
          s(x.userName ?? x.user?.name),
          s(x.userEmail ?? x.user?.email),
          s(x.planName ?? x.plan?.name),
          s(x.tier ?? x.plan?.tier),
          s(x.provider),
          s(x.status),
          s(x.interval ?? x.plan?.interval),
          d(x.currentPeriodEnd),
        ]),
        summary: [
          { label: "Subscriptions", value: String(rows.length) },
          { label: "Active", value: String(rows.filter((x) => s(x.status) === "active").length) },
          { label: "Cancelling", value: String(rows.filter((x) => x.cancelAtPeriodEnd).length) },
        ],
      };
    }

    if (type === "support") {
      const rows = ((ticketsData ?? []) as Record<string, any>[]).filter(
        (t) => matchStatus(t.status) && inRange(t.createdAt, from, to),
      );
      return {
        title: "Support Ticket Report",
        columns: ["Created", "Name", "Email", "Category", "Subject", "Status", "Replies"],
        rows: rows.map((t) => [
          d(t.createdAt),
          s(t.name),
          s(t.email),
          s(t.category),
          s(t.subject),
          s(t.status),
          String(t.replyCount ?? 0),
        ]),
        summary: [
          { label: "Tickets", value: String(rows.length) },
          { label: "Open", value: String(rows.filter((t) => s(t.status) === "open").length) },
          { label: "Closed", value: String(rows.filter((t) => s(t.status) === "closed").length) },
        ],
      };
    }

    if (type === "deletions") {
      const rows = ((deletionsData ?? []) as Record<string, any>[]).filter(
        (r) => matchStatus(r.status) && inRange(r.requestedAt, from, to),
      );
      return {
        title: "Account Deletion Report",
        columns: ["Requested", "Email", "Reason", "Status", "Scheduled purge", "Handled"],
        rows: rows.map((r) => [
          d(r.requestedAt),
          s(r.email),
          s(r.reason),
          s(r.status),
          d(r.scheduledPurgeAt),
          d(r.handledAt),
        ]),
        summary: [
          { label: "Requests", value: String(rows.length) },
          { label: "Pending", value: String(rows.filter((r) => s(r.status) === "pending").length) },
          {
            label: "Confirmed",
            value: String(rows.filter((r) => s(r.status) === "confirmed").length),
          },
        ],
      };
    }

    const rows = ((notifData ?? []) as Record<string, any>[]).filter((n) =>
      inRange(n.createdAt, from, to),
    );
    return {
      title: "Notification Campaign Report",
      columns: ["Sent", "Title", "Audience", "Reach"],
      rows: rows.map((n) => [d(n.createdAt), s(n.title), s(n.audience), String(n.reach ?? 0)]),
      summary: [
        { label: "Campaigns", value: String(rows.length) },
        {
          label: "Total reach",
          value: rows.reduce((a, n) => a + Number(n.reach ?? 0), 0).toLocaleString(),
        },
      ],
    };
  }, [type, status, from, to, usersData, subsData, ticketsData, deletionsData, notifData]);

  const filterLine = [
    `Report: ${REPORTS.find((r) => r.key === type)?.label}`,
    `Status: ${status === "all" ? "All" : status}`,
    `Range: ${from || "start"} → ${to || "today"}`,
  ];

  function exportCsv() {
    if (built.rows.length === 0) {
      toast.error("Nothing to export — adjust your filters.");
      return;
    }
    setBusy("csv");
    const objects = built.rows.map((r) =>
      Object.fromEntries(built.columns.map((c, i) => [c, r[i] ?? ""])),
    );
    const ok = downloadCSV(
      `halal-connect-${type}-${new Date().toISOString().slice(0, 10)}`,
      objects,
      built.columns,
    );
    setBusy(null);
    ok ? toast.success("PDF downloaded") : toast.error("Export failed");
  }

  async function exportPdf() {
    if (built.rows.length === 0) {
      toast.error("Nothing to export — adjust your filters.");
      return;
    }
    setBusy("pdf");
    let narrative: string | undefined;
    if (useAi) {
      try {
        const adminToken = getToken();
        if (!adminToken) throw new Error("Admin session expired.");
        const res = await summariseReport({
          data: { adminToken, reportType: built.title, metrics: built.summary },
        });
        narrative = res.summary;
      } catch (e) {
        // A missing key or quota issue must not block the export.
        toast.warning("AI overview unavailable — exporting without it.");
        narrative = undefined;
      }
    }
    try {
      generateReportPdf({
        filename: `halal-connect-${type}-${new Date().toISOString().slice(0, 10)}`,
        title: built.title,
        reportType: REPORTS.find((r) => r.key === type)?.label ?? "Report",
        filters: filterLine,
        summary: built.summary,
        narrative,
        columns: built.columns,
        rows: built.rows,
      });
      toast.success("PDF report generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF generation failed");
    } finally {
      setBusy(null);
    }
  }

  const preview = built.rows.slice(0, 12);

  return (
    <AdminLayout>
      <PageHeader
        title="Reports & Exports"
        description="Filter any dataset, then export a branded PDF."
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-1 shadow-elegant">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Report settings
            </CardTitle>
            <CardDescription>Exports always use the filters below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Report type</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  setType(v as ReportKey);
                  setStatus("all");
                }}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORTS.map((r) => (
                    <SelectItem key={r.key} value={r.key}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {REPORTS.find((r) => r.key === type)?.description}
              </p>
            </div>

            {STATUS_OPTIONS[type].length > 0 && (
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {STATUS_OPTIONS[type].map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">From</Label>
                <Input
                  type="date"
                  className="mt-1.5"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <Input
                  type="date"
                  className="mt-1.5"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={useAi}
                onChange={(e) => setUseAi(e.target.checked)}
                className="accent-[var(--primary)]"
              />
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Include AI executive summary
            </label>

            <div className="space-y-2 pt-1">
              <Button
                className="w-full bg-gradient-primary text-primary-foreground border-0 shadow-elegant"
                onClick={exportPdf}
                disabled={busy !== null}
              >
                {busy === "pdf" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                {busy === "pdf" ? "Generating…" : "Generate PDF report"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={exportCsv}
                disabled={busy !== null}
              >
                <Download className="h-4 w-4 mr-2" /> Export PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">{built.title}</CardTitle>
              <CardDescription>{filterLine.join(" · ")}</CardDescription>
            </div>
            <Badge variant="outline">{built.rows.length} rows</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {built.summary.map((s) => (
                <div key={s.label} className="rounded-lg border bg-muted/20 p-3">
                  <div className="text-[11px] text-muted-foreground">{s.label}</div>
                  <div className="text-xl font-semibold">{s.value}</div>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {built.columns.map((c) => (
                      <TableHead key={c}>{c}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={built.columns.length}
                        className="text-center text-sm text-muted-foreground py-8"
                      >
                        No records match these filters.
                      </TableCell>
                    </TableRow>
                  )}
                  {preview.map((r, i) => (
                    <TableRow key={i}>
                      {r.map((cell, j) => (
                        <TableCell key={j} className="whitespace-nowrap text-sm">
                          {cell || "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {built.rows.length > preview.length && (
              <p className="text-[11px] text-muted-foreground">
                Showing first {preview.length} rows — the export contains all {built.rows.length}.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
