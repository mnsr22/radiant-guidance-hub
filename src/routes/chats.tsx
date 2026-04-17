import { createFileRoute } from "@tanstack/react-router";
import { Flag, MessageSquare, Trash2, ShieldOff } from "lucide-react";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockConversations } from "@/lib/mock-data";

export const Route = createFileRoute("/chats")({ component: Chats });

function Chats() {
  return (
    <AdminLayout>
      <PageHeader title="Chat Monitoring" description="Review flagged conversations and take action when needed." />

      <Card className="p-5 shadow-elegant">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" /> Active Conversations
          </h3>
          <Badge variant="secondary" className="bg-destructive/15 text-destructive border-0">2 flagged</Badge>
        </div>

        <div className="space-y-3">
          {mockConversations.map((c) => (
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
                <Button size="sm" variant="outline">View</Button>
                <Button size="sm" variant="outline" className="text-warning border-warning/30 hover:bg-warning/10">
                  <ShieldOff className="h-3.5 w-3.5 mr-1" /> Restrict
                </Button>
                <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </AdminLayout>
  );
}
