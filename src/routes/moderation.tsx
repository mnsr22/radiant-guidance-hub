import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Ban, MessageCircle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/admin/stat-card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { mockReports, type Report } from "@/lib/mock-data";

export const Route = createFileRoute("/moderation")({ component: Moderation });

function Moderation() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>(mockReports);
  const [reviewing, setReviewing] = useState<Report | null>(null);
  const [confirm, setConfirm] = useState<{ report: Report; action: "warn" | "ban" } | null>(null);

  const counts = {
    pending: reports.filter((r) => r.status === "pending").length,
    high: reports.filter((r) => r.severity === "high").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
  };

  function applyAction() {
    if (!confirm) return;
    const { report, action } = confirm;
    setReports((prev) =>
      prev.map((r) =>
        r.id === report.id ? { ...r, status: action === "ban" ? "resolved" : "reviewed" } : r,
      ),
    );
    toast.success(
      action === "ban"
        ? `${report.reportedUser} has been banned`
        : `Warning sent to ${report.reportedUser}`,
    );
    setConfirm(null);
    setReviewing(null);
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Moderation & Reports"
        description="Review reported users and take protective action."
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatCard label="Pending" value={String(counts.pending)} icon={AlertTriangle} accent="warning" />
        <StatCard label="High severity" value={String(counts.high)} icon={ShieldAlert} accent="destructive" />
        <StatCard label="Resolved (7d)" value={String(counts.resolved)} icon={MessageCircle} accent="success" />
        <StatCard label="Banned today" value="3" icon={Ban} accent="destructive" />
      </div>

      <Card className="p-5 shadow-elegant">
        <h3 className="font-semibold mb-4">Report Queue</h3>
        <div className="space-y-3">
          {reports.map((r) => (
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
                <Button size="sm" variant="outline" onClick={() => setReviewing(r)}>Review</Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-warning border-warning/30 hover:bg-warning/10"
                  onClick={() => setConfirm({ report: r, action: "warn" })}
                >
                  Warn
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setConfirm({ report: r, action: "ban" })}
                >
                  Ban
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Review dialog */}
      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent className="sm:max-w-md">
          {reviewing && (
            <>
              <DialogHeader>
                <DialogTitle>Report {reviewing.id}</DialogTitle>
                <DialogDescription>
                  {reviewing.category} · {reviewing.severity} severity · {reviewing.date}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Reported user</div>
                  <div className="font-medium">{reviewing.reportedUser}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Reported by</div>
                  <div className="font-medium">{reviewing.reporter}</div>
                </div>
                <div className="rounded-lg border p-3 bg-muted/30">
                  <div className="text-xs text-muted-foreground mb-1">Reporter notes</div>
                  <p className="text-sm">
                    User submitted a {reviewing.category.toLowerCase()} report. Review chat history before
                    deciding on action.
                  </p>
                </div>
              </div>
              <DialogFooter className="gap-2 flex-wrap">
                <Button variant="outline" onClick={() => { setReviewing(null); navigate({ to: "/chats" }); }}>
                  View chat
                </Button>
                <Button
                  variant="outline"
                  className="text-warning border-warning/30 hover:bg-warning/10"
                  onClick={() => setConfirm({ report: reviewing, action: "warn" })}
                >
                  Warn
                </Button>
                <Button
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  onClick={() => setConfirm({ report: reviewing, action: "ban" })}
                >
                  Ban
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm */}
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          {confirm && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {confirm.action === "ban"
                    ? `Ban ${confirm.report.reportedUser}?`
                    : `Send warning to ${confirm.report.reportedUser}?`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {confirm.action === "ban"
                    ? "This will permanently revoke the user's access. The report will be marked resolved."
                    : "The user will receive a warning notification. The report will be marked reviewed."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={applyAction}
                  className={confirm.action === "ban" ? "bg-destructive hover:bg-destructive/90" : ""}
                >
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
