import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText, Search } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLogs } from "@/lib/admin-hooks";
import { downloadCSV } from "@/lib/csv";

export const Route = createFileRoute("/logs")({ component: LogsPage });

function LogsPage() {
  const [q, setQ] = useState("");
  const [admin, setAdmin] = useState("all");
  const { data } = useLogs();
  const logs = data ?? [];
  const admins = useMemo(() => Array.from(new Set(logs.map((l) => l.admin))), [logs]);
  const filtered = useMemo(() => logs.filter((l) => {
    if (admin !== "all" && l.admin !== admin) return false;
    if (q && !`${l.action} ${l.target} ${l.admin}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [logs, q, admin]);

  function handleExport() {
    downloadCSV("halal-connect-audit-logs", filtered, ["id", "admin", "action", "target", "timestamp"]);
    toast.success(`Exported ${filtered.length} log entries`);
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Audit Logs"
        description={`${filtered.length} of ${logs.length} actions recorded`}
        actions={
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        }
      />

      <Card className="p-4 shadow-elegant mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search action, target, admin…" className="pl-9" />
          </div>
          <Select value={admin} onValueChange={setAdmin}>
            <SelectTrigger className="md:w-56"><SelectValue placeholder="Admin" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All admins</SelectItem>
              {admins.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-5 shadow-elegant">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> Recent admin actions
        </h3>
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">No matching logs.</div>
          )}
          {filtered.map((l) => (
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
