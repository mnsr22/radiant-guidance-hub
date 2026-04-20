import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Flag, MessageSquare, Trash2, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { mockConversations, type Conversation } from "@/lib/mock-data";

export const Route = createFileRoute("/chats")({ component: Chats });

function Chats() {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [viewing, setViewing] = useState<Conversation | null>(null);
  const [confirm, setConfirm] = useState<{ conv: Conversation; action: "restrict" | "delete" } | null>(null);

  const flaggedCount = conversations.filter((c) => c.flagged).length;

  function applyAction() {
    if (!confirm) return;
    const { conv, action } = confirm;
    if (action === "delete") {
      setConversations((prev) => prev.filter((c) => c.id !== conv.id));
      toast.success(`Conversation between ${conv.participants[0]} & ${conv.participants[1]} deleted`);
    } else {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conv.id ? { ...c, flagged: true, flagReason: c.flagReason ?? "Restricted by admin" } : c,
        ),
      );
      toast.success(`Conversation restricted`);
    }
    setConfirm(null);
  }

  return (
    <AdminLayout>
      <PageHeader title="Chat Monitoring" description="Review flagged conversations and take action when needed." />

      <Card className="p-5 shadow-elegant">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" /> Active Conversations
          </h3>
          <Badge variant="secondary" className="bg-destructive/15 text-destructive border-0">
            {flaggedCount} flagged
          </Badge>
        </div>

        <div className="space-y-3">
          {conversations.map((c) => (
            <div key={c.id} className="flex flex-col md:flex-row md:items-center gap-3 p-4 rounded-xl border hover:bg-muted/30 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {c.participants[0]} <span className="text-muted-foreground text-xs">↔</span> {c.participants[1]}
                  {c.flagged && (
                    <Badge variant="secondary" className="bg-destructive/15 text-destructive border-0 gap-1">
                      <Flag className="h-3 w-3" /> Flagged
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {c.messageCount} messages · last activity {c.lastMessage}
                  {c.flagReason && ` · ${c.flagReason}`}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => setViewing(c)}>View</Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-warning border-warning/30 hover:bg-warning/10"
                  onClick={() => setConfirm({ conv: c, action: "restrict" })}
                >
                  <ShieldOff className="h-3.5 w-3.5 mr-1" /> Restrict
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setConfirm({ conv: c, action: "delete" })}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              </div>
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="p-10 text-center text-sm text-muted-foreground">No conversations.</div>
          )}
        </div>
      </Card>

      {/* View dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="sm:max-w-lg">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>{viewing.participants[0]} ↔ {viewing.participants[1]}</DialogTitle>
                <DialogDescription>
                  {viewing.messageCount} messages · last activity {viewing.lastMessage}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 max-h-72 overflow-y-auto rounded-lg border bg-muted/20 p-3 text-sm">
                {[
                  { from: viewing.participants[0], text: "As-salamu alaykum, hope you're well." },
                  { from: viewing.participants[1], text: "Wa alaykum as-salam, alhamdulillah." },
                  { from: viewing.participants[0], text: "Would your wali be open to a call this week?" },
                  { from: viewing.participants[1], text: "Yes, in sha Allah. I'll arrange it." },
                ].map((m, i) => (
                  <div key={i} className="rounded-lg bg-background border px-3 py-2">
                    <div className="text-[11px] font-medium text-muted-foreground">{m.from}</div>
                    <div>{m.text}</div>
                  </div>
                ))}
              </div>
              {viewing.flagReason && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
                  <span className="font-semibold text-destructive">Flag reason:</span> {viewing.flagReason}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
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
                  {confirm.action === "delete" ? "Delete conversation?" : "Restrict conversation?"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {confirm.action === "delete"
                    ? "This will permanently remove the conversation and all messages. This action cannot be undone."
                    : "Both participants will lose the ability to send new messages until reviewed."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={applyAction}
                  className={confirm.action === "delete" ? "bg-destructive hover:bg-destructive/90" : ""}
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
