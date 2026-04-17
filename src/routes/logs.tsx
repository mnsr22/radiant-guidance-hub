import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockLogs } from "@/lib/mock-data";

export const Route = createFileRoute("/logs")({ component: LogsPage });

function LogsPage() {
  return (
    <AdminLayout>
      <PageHeader title="Audit Logs" description="Every administrative action is recorded here." />

      <Card className="p-5 shadow-elegant">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> Recent admin actions
        </h3>
        <div className="space-y-2">
          {mockLogs.map((l) => (
            <div key={l.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-0">{l.admin}</Badge>
              <div className="flex-1 text-sm">
                <span className="font-medium">{l.action}</span>
                <span className="text-muted-foreground"> · {l.target}</span>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">{l.timestamp}</span>
            </div>
          ))}
        </div>
      </Card>
    </AdminLayout>
  );
}
