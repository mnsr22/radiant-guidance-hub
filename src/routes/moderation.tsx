import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Ban, MessageCircle, ShieldAlert } from "lucide-react";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/admin/stat-card";
import { mockReports } from "@/lib/mock-data";

export const Route = createFileRoute("/moderation")({ component: Moderation });

function Moderation() {
  return (
    <AdminLayout>
      <PageHeader
        title="Moderation & Reports"
        description="Review reported users and take protective action."
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatCard label="Pending" value="24" icon={AlertTriangle} accent="warning" />
        <StatCard label="High severity" value="6" icon={ShieldAlert} accent="destructive" />
        <StatCard label="Resolved (7d)" value="48" icon={MessageCircle} accent="success" />
        <StatCard label="Banned today" value="3" icon={Ban} accent="destructive" />
      </div>

      <Card className="p-5 shadow-elegant">
        <h3 className="font-semibold mb-4">Report Queue</h3>
        <div className="space-y-3">
          {mockReports.map((r) => (
            <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`h-10 w-1 rounded-full ${r.severity === "high" ? "bg-destructive" : r.severity === "medium" ? "bg-warning" : "bg-success"}`} />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{r.reportedUser}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.category} · reported by {r.reporter} · {r.date}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{r.severity}</Badge>
                <Badge variant={r.status === "pending" ? "default" : "secondary"} className={r.status === "pending" ? "bg-gradient-primary text-primary-foreground border-0" : ""}>{r.status}</Badge>
                <Button size="sm" variant="outline">Review</Button>
                <Button size="sm" variant="outline" className="text-warning border-warning/30 hover:bg-warning/10">Warn</Button>
                <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10">Ban</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </AdminLayout>
  );
}
