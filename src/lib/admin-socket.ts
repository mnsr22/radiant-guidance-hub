// Live admin event feed over the backend's `/admin` socket.io namespace.
// Seeds from the REST backlog (`/admin/live/events`) for an instant first
// paint, then streams `admin:event` pushes in real time.
import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { api, getToken, SOCKET_URL } from "./api";

export type AdminFeedType =
  | "signup"
  | "match"
  | "message"
  | "report"
  | "subscription"
  | "moderation";

export type AdminFeedEvent = {
  id: string;
  type: AdminFeedType;
  text: string;
  at: string;
  meta?: Record<string, unknown>;
};

const FEED_MAX = 50;

function merge(prev: AdminFeedEvent[], incoming: AdminFeedEvent[]): AdminFeedEvent[] {
  const byId = new Map(prev.map((e) => [e.id, e]));
  for (const e of incoming) byId.set(e.id, e);
  return [...byId.values()].sort((a, b) => b.at.localeCompare(a.at)).slice(0, FEED_MAX);
}

export function useAdminFeed() {
  const [events, setEvents] = useState<AdminFeedEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Immediate backlog via REST so the feed isn't empty while the socket dials.
    api<AdminFeedEvent[]>("/admin/live/events")
      .then((rows) => !cancelled && setEvents((prev) => merge(prev, rows ?? [])))
      .catch(() => {});

    const socket: Socket = io(`${SOCKET_URL}/admin`, {
      auth: { token: getToken() ?? "" },
      transports: ["websocket"],
    });
    socket.on("connect", () => !cancelled && setConnected(true));
    socket.on("disconnect", () => !cancelled && setConnected(false));
    socket.on("admin:backlog", (rows: AdminFeedEvent[]) =>
      !cancelled && setEvents((prev) => merge(prev, rows ?? [])),
    );
    socket.on("admin:event", (evt: AdminFeedEvent) =>
      !cancelled && setEvents((prev) => merge(prev, [evt])),
    );

    return () => {
      cancelled = true;
      socket.disconnect();
    };
  }, []);

  return { events, connected };
}
