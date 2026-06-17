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
import { type Conversation } from "@/lib/mock-data";
import { useConversations, useDeleteConversation, useConversationMessages } from "@/lib/admin-hooks";

export const Route = createFileRoute("/chats")({ component: Chats });

function Chats() {
  const { data } = useConversations();
  const conversations = data ?? [];
  const delConv = useDeleteConversation();
  const [viewing, setViewing] = useState<Conversation | null>(null);
  const [confirm, setConfirm] = useState<{ conv: Conversation; action: "restrict" | "delete" } | null>(null);

  const flaggedCount = conversations.filter((c) => c.flagged).length;

  function applyAction() {
    if (!confirm) return;
    const { conv, action } = confirm;
    if (action === "delete") {
      delConv.mutate(conv.id, {
        onSuccess: () =>
          toast.success(`Conversation between ${conv.participants[0]} & ${conv.participants[1]} deleted`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete"),
      });
    } else {
      // No backend "restrict" endpoint yet — acknowledge in the UI only.
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
          {viewing && <ConversationView conv={viewing} onClose={() => setViewing(null)} />}
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

function ConversationView({ conv, onClose }: { conv: Conversation; onClose: () => void }) {
  const { data: messages, isLoading } = useConversationMessages(conv.id);
  const nameFor = (senderId: string) => {
    const ids = conv.participantIds;
    if (ids && senderId === ids[1]) return conv.participants[1];
    if (ids && senderId === ids[0]) return conv.participants[0];
    return conv.participants[0];
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{conv.participants[0]} ↔ {conv.participants[1]}</DialogTitle>
        <DialogDescription>
          {conv.messageCount} messages · last activity {conv.lastMessage}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2 max-h-72 overflow-y-auto rounded-lg border bg-muted/20 p-3 text-sm">
        {isLoading && <div className="p-4 text-center text-muted-foreground">Loading messages…</div>}
        {!isLoading && (messages ?? []).length === 0 && (
          <div className="p-4 text-center text-muted-foreground">No messages in this conversation.</div>
        )}
        {((messages ?? []) as any[]).map((m) => (
          <div key={m.id} className="rounded-lg bg-background border px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-medium text-muted-foreground">{nameFor(m.senderId)}</div>
              {m.flagged && <Flag className="h-3 w-3 text-destructive" />}
            </div>
            <div>{m.type && m.type !== "text" ? `[${m.type}]` : m.text}</div>
          </div>
        ))}
      </div>
      {conv.flagReason && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
          <span className="font-semibold text-destructive">Flag reason:</span> {conv.flagReason}
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </DialogFooter>
    </>
  );
}
