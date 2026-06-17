import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, Send, MessageSquare, Inbox } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useInboxThreads, useInboxThread, useInboxSend } from "@/lib/admin-hooks";

export const Route = createFileRoute("/support")({ component: SupportPage });

function rel(iso?: string) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function initials(name?: string) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

type Thread = {
  userId: string;
  name: string;
  email: string | null;
  photo: string | null;
  lastMessage: string;
  lastFromAdmin: boolean;
  lastAt: string;
  unread: number;
};

function SupportPage() {
  const { data: threadsData } = useInboxThreads();
  const threads = (threadsData ?? []) as Thread[];
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const filtered = useMemo(
    () =>
      threads.filter((t) =>
        `${t.name} ${t.email ?? ""}`.toLowerCase().includes(q.toLowerCase()),
    ),
    [threads, q],
  );

  // Default to the first conversation once threads load.
  useEffect(() => {
    if (!selected && threads.length > 0) setSelected(threads[0].userId);
  }, [threads, selected]);

  return (
    <AdminLayout>
      <PageHeader
        title="Support Inbox"
        description="Direct conversations between your team and members."
      />

      <Card className="shadow-elegant overflow-hidden">
        <div className="grid md:grid-cols-[320px_1fr] h-[calc(100vh-220px)] min-h-[480px]">
          {/* Chat list */}
          <div className="border-r flex flex-col min-h-0">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search conversations…"
                  className="pl-9 h-9"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No conversations yet.
                </div>
              )}
              {filtered.map((t) => (
                <button
                  key={t.userId}
                  onClick={() => setSelected(t.userId)}
                  className={`w-full text-left flex items-center gap-3 p-3 border-b hover:bg-muted/40 transition-colors ${
                    selected === t.userId ? "bg-muted/60" : ""
                  }`}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    {t.photo && <AvatarImage src={t.photo} alt={t.name} />}
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                      {initials(t.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{t.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{rel(t.lastAt)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground truncate">
                        {t.lastFromAdmin && <span className="opacity-70">You: </span>}
                        {t.lastMessage}
                      </span>
                      {t.unread > 0 && (
                        <Badge className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] shrink-0">
                          {t.unread}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Conversation */}
          {selected ? (
            <Conversation userId={selected} key={selected} />
          ) : (
            <div className="hidden md:flex items-center justify-center text-sm text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-40" />
                Select a conversation to start chatting.
              </div>
            </div>
          )}
        </div>
      </Card>
    </AdminLayout>
  );
}

type Msg = { id: string; subject: string | null; body: string; fromAdmin: boolean; createdAt: string };

function Conversation({ userId }: { userId: string }) {
  const { data, isLoading } = useInboxThread(userId);
  const sendMut = useInboxSend();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const user = data?.user as { name: string; email: string | null; photo: string | null } | undefined;
  const messages = (data?.messages ?? []) as Msg[];

  // Keep the latest message in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  function handleSend() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    sendMut.mutate(
      { userId, body },
      {
        onSuccess: () => {
          setText("");
          setSending(false);
        },
        onError: (e) => {
          toast.error(e instanceof Error ? e.message : "Failed to send");
          setSending(false);
        },
      },
    );
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b">
        <Avatar className="h-9 w-9">
          {user?.photo && <AvatarImage src={user.photo} alt={user?.name} />}
          <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
            {initials(user?.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{user?.name ?? "…"}</div>
          {user?.email && <div className="text-xs text-muted-foreground truncate">{user.email}</div>}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
        {isLoading && (
          <div className="text-center text-sm text-muted-foreground py-8">Loading…</div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            No messages yet. Say salam 👋
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.fromAdmin ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                m.fromAdmin
                  ? "bg-gradient-primary text-primary-foreground rounded-br-sm"
                  : "bg-background border rounded-bl-sm"
              }`}
            >
              {m.subject && (
                <div className={`text-[11px] font-semibold mb-0.5 ${m.fromAdmin ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {m.subject}
                </div>
              )}
              <div className="whitespace-pre-wrap break-words">{m.body}</div>
              <div className={`text-[10px] mt-1 text-right ${m.fromAdmin ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {rel(m.createdAt)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="border-t p-3 flex items-center gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message…"
          className="flex-1"
        />
        <Button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="bg-gradient-primary text-primary-foreground border-0 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
