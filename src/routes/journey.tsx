import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck, Download, HeartHandshake, ListChecks, Users } from "lucide-react";
import { toast } from "sonner";

import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { StatCard } from "@/components/admin/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { downloadCSV } from "@/lib/csv";
import { useJourneySummary } from "@/lib/admin-hooks";

export const Route = createFileRoute("/journey")({
  head: () => ({
    meta: [
      { title: "Marriage Journey — Halal Connect Admin" },
      {
        name: "description",
        content:
          "View anonymous member progress through the Halal Connect marriage-preparation journey.",
      },
      { property: "og:title", content: "Marriage Journey — Halal Connect Admin" },
      {
        property: "og:description",
        content:
          "View anonymous member progress through the Halal Connect marriage-preparation journey.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JourneyPage,
});

function JourneyPage() {
  const { data, isLoading } = useJourneySummary();
  const steps = data?.steps ?? [];
  const exportRows = steps.map((step) => ({
    step: step.title,
    members: step.total,
    completed: step.completed,
    completion_rate: `${step.completionRate}%`,
  }));

  return (
    <AdminLayout>
      <PageHeader
        title="Marriage Journey"
        description="Anonymous completion metrics for members’ preparation steps. Individual journeys and health details are not exposed here."
        actions={
          <Button
            variant="outline"
            disabled={exportRows.length === 0}
            onClick={() => {
              const exported = downloadCSV("halal-connect-marriage-journey", exportRows);
              toast[exported ? "success" : "error"](
                exported ? "Export started" : "Nothing to export",
              );
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Members with journey data"
          value={data ? data.participants.toLocaleString() : "—"}
          icon={Users}
        />
        <StatCard
          label="Steps completed"
          value={data ? data.completedSteps.toLocaleString() : "—"}
          icon={ClipboardCheck}
        />
        <StatCard
          label="Overall completion"
          value={data ? `${data.completionRate}%` : "—"}
          icon={HeartHandshake}
        />
        <StatCard
          label="Preparation steps"
          value={data ? steps.length.toLocaleString() : "—"}
          icon={ListChecks}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Preparation step completion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading journey metrics…</p>
          ) : steps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No members have started the marriage-preparation journey yet.
            </p>
          ) : (
            steps.map((step) => (
              <div key={step.stepKey}>
                <div className="mb-1 flex items-center justify-between gap-4 text-sm">
                  <span>{step.title}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {step.completed.toLocaleString()} / {step.total.toLocaleString()} ·{" "}
                    {step.completionRate}%
                  </span>
                </div>
                <Progress value={step.completionRate} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
