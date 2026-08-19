// RTK Query — the single Redux-backed data layer for every /api/admin endpoint.
// Cache lives in the Redux store; components use the generated hooks (re-exported
// with stable names via lib/admin-hooks.ts).
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { getToken, clearToken } from "@/lib/api";
import type { MockUser, Report, Conversation, AuditLog } from "@/lib/mock-data";
import { mapUser, mapReport, mapConversation, mapLog, toApiStatus } from "@/lib/mappers";

export type GetUsersArgs = {
  page?: number;
  limit?: number;
  search?: string;
  status?: MockUser["status"] | "all";
  practice?: string;
};

const BASE_URL =
  (import.meta.env as Record<string, string | undefined>).VITE_API_URL?.replace(/\/$/, "") ??
  // "http://localhost:3001/api";
  "https://admin.halalconnect.space/api";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers) => {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

// Drop the token on auth failures so the route guard bounces to /login.
const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  store,
  extra,
) => {
  const result = await rawBaseQuery(args, store, extra);
  if (result.error && (result.error.status === 401 || result.error.status === 403)) {
    clearToken();
  }
  return result;
};

export const adminApi = createApi({
  reducerPath: "adminApi",
  baseQuery,
  tagTypes: ["Users", "Reports", "Ads", "Plans", "Subscriptions", "Islamic", "Logs", "Settings", "Conversations", "Me", "Broadcasts", "Inbox", "Tickets", "Deletions", "Tasbih"],
  endpoints: (b) => ({
    // ── Users ──────────────────────────────────────────────
    getUsers: b.query<
      { users: MockUser[]; total: number; page: number; limit: number },
      GetUsersArgs | void
    >({
      query: (args) => {
        const a = (args ?? {}) as GetUsersArgs;
        const params: Record<string, string | number> = {
          page: a.page ?? 1,
          limit: a.limit ?? 20,
        };
        if (a.search) params.search = a.search;
        if (a.status && a.status !== "all") params.status = toApiStatus(a.status);
        if (a.practice && a.practice !== "all") params.practice = a.practice;
        return { url: "/admin/users", params };
      },
      transformResponse: (res: { results: any[]; total: number; page: number; limit: number }) => ({
        users: res.results.map(mapUser),
        total: res.total,
        page: res.page,
        limit: res.limit,
      }),
      providesTags: ["Users"],
    }),
    createUser: b.mutation<
      unknown,
      { name: string; email: string; password: string; role?: "user" | "admin"; status?: string; gender?: "male" | "female" }
    >({
      query: (body) => ({ url: "/admin/users", method: "POST", body }),
      invalidatesTags: ["Users"],
    }),
    updateUser: b.mutation<unknown, { id: string; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({ url: `/admin/users/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Users", "Subscriptions"],
    }),
    resetSwipes: b.mutation<{ id: string; cleared: number }, string>({
      query: (id) => ({ url: `/admin/users/${id}/reset-swipes`, method: "POST" }),
    }),
    setUserStatus: b.mutation<unknown, { id: string; status: MockUser["status"] }>({
      query: ({ id, status }) => ({
        url: `/admin/users/${id}/status`,
        method: "PATCH",
        body: { status: toApiStatus(status) },
      }),
      invalidatesTags: ["Users"],
    }),
    verifyUser: b.mutation<unknown, { id: string; verified: boolean }>({
      query: ({ id, verified }) => ({
        url: `/admin/users/${id}/verify`,
        method: "PATCH",
        body: { verified },
      }),
      invalidatesTags: ["Users"],
    }),
    sendUserMessage: b.mutation<unknown, { id: string; subject?: string; body: string }>({
      query: ({ id, subject, body }) => ({
        url: `/admin/users/${id}/message`,
        method: "POST",
        body: { subject, body },
      }),
    }),

    // ── Reports / moderation ───────────────────────────────
    getReports: b.query<Report[], string | undefined>({
      query: (status) => ({ url: "/admin/reports", params: status ? { status } : undefined }),
      transformResponse: (res: any[]) => res.map(mapReport),
      providesTags: ["Reports"],
    }),
    resolveReport: b.mutation<
      unknown,
      { id: string; status: "reviewed" | "resolved" | "dismissed"; note?: string }
    >({
      query: ({ id, status, note }) => ({
        url: `/admin/reports/${id}/resolve`,
        method: "POST",
        body: { status, note },
      }),
      invalidatesTags: ["Reports"],
    }),
    banReport: b.mutation<unknown, string>({
      query: (id) => ({ url: `/admin/reports/${id}/ban`, method: "POST" }),
      invalidatesTags: ["Reports", "Users"],
    }),

    // ── Messaging / broadcast ──────────────────────────────
    sendBulkMessage: b.mutation<
      { sent: number },
      { userIds?: string[]; audience?: string; subject?: string; body: string }
    >({
      query: (body) => ({ url: "/admin/messaging", method: "POST", body }),
    }),
    broadcast: b.mutation<{ sent: number }, { title: string; message: string; audience?: string }>({
      query: (body) => ({ url: "/admin/notifications/broadcast", method: "POST", body }),
      invalidatesTags: ["Broadcasts"],
    }),
    getNotificationHistory: b.query<any[], void>({
      query: () => "/admin/notifications/history",
      providesTags: ["Broadcasts"],
    }),
    getAudienceCounts: b.query<{ all: number; active: number; premium: number; new: number }, void>({
      query: () => "/admin/notifications/audiences",
    }),

    // ── Admin ↔ user inbox (support chat) ──────────────────
    getInboxThreads: b.query<any[], void>({
      query: () => "/admin/inbox/threads",
      providesTags: ["Inbox"],
    }),
    getInboxThread: b.query<any, string>({
      query: (userId) => `/admin/inbox/threads/${userId}`,
      providesTags: (_r, _e, userId) => [{ type: "Inbox" as const, id: userId }],
    }),
    sendInboxMessage: b.mutation<any, { userId: string; body: string; subject?: string }>({
      query: ({ userId, body, subject }) => ({
        url: `/admin/inbox/threads/${userId}`,
        method: "POST",
        body: { body, subject },
      }),
      invalidatesTags: (_r, _e, { userId }) => ["Inbox", { type: "Inbox" as const, id: userId }],
    }),

    // ── Ads ────────────────────────────────────────────────
    getAds: b.query<any[], void>({
      query: () => "/admin/ads",
      providesTags: ["Ads"],
    }),
    createAd: b.mutation<unknown, any>({
      query: (body) => ({ url: "/admin/ads", method: "POST", body }),
      invalidatesTags: ["Ads"],
    }),
    updateAd: b.mutation<unknown, { id: string; body: any }>({
      query: ({ id, body }) => ({ url: `/admin/ads/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Ads"],
    }),
    deleteAd: b.mutation<unknown, string>({
      query: (id) => ({ url: `/admin/ads/${id}`, method: "DELETE" }),
      invalidatesTags: ["Ads"],
    }),

    // ── Plans (subscription packages) ──────────────────────
    getPlans: b.query<any[], void>({
      query: () => "/admin/plans",
      providesTags: ["Plans"],
    }),
    createPlan: b.mutation<unknown, Record<string, unknown>>({
      query: (body) => ({ url: "/admin/plans", method: "POST", body }),
      invalidatesTags: ["Plans"],
    }),
    updatePlan: b.mutation<unknown, { id: string; body: any }>({
      query: ({ id, body }) => ({ url: `/admin/plans/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Plans"],
    }),
    deletePlan: b.mutation<unknown, string>({
      query: (id) => ({ url: `/admin/plans/${id}`, method: "DELETE" }),
      invalidatesTags: ["Plans"],
    }),

    // ── Subscriptions ──────────────────────────────────────
    getSubscriptions: b.query<any[], void>({
      query: () => "/admin/subscriptions",
      providesTags: ["Subscriptions"],
    }),
    attachSubscription: b.mutation<unknown, Record<string, unknown>>({
      query: (body) => ({ url: "/admin/subscriptions", method: "POST", body }),
      invalidatesTags: ["Subscriptions", "Users"],
    }),
    updateSubscription: b.mutation<unknown, { id: string; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({ url: `/admin/subscriptions/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Subscriptions", "Users"],
    }),
    deleteSubscription: b.mutation<unknown, string>({
      query: (id) => ({ url: `/admin/subscriptions/${id}`, method: "DELETE" }),
      invalidatesTags: ["Subscriptions", "Users"],
    }),

    // ── Islamic settings ───────────────────────────────────
    getIslamicSettings: b.query<any, void>({
      query: () => "/admin/islamic/settings",
      providesTags: ["Islamic"],
    }),
    updateIslamicSettings: b.mutation<unknown, any>({
      query: (body) => ({ url: "/admin/islamic/settings", method: "PATCH", body }),
      invalidatesTags: ["Islamic"],
    }),

    // ── Stats + analytics ──────────────────────────────────
    getStats: b.query<any, void>({ query: () => "/admin/stats" }),
    getGrowth: b.query<any[], void>({ query: () => "/admin/analytics/growth" }),
    getGenderRatio: b.query<any[], void>({ query: () => "/admin/analytics/gender" }),
    getPractice: b.query<any[], void>({ query: () => "/admin/analytics/practice" }),
    getWeeklyActivity: b.query<any[], void>({ query: () => "/admin/analytics/weekly-activity" }),

    // ── Billing analytics ──────────────────────────────────
    getBillingStats: b.query<any, void>({ query: () => "/admin/billing/stats" }),
    getBillingRevenue: b.query<any[], void>({ query: () => "/admin/billing/revenue" }),
    getTransactions: b.query<any[], void>({ query: () => "/admin/billing/transactions" }),

    // ── Match analytics ────────────────────────────────────
    getMatchStats: b.query<any, void>({ query: () => "/admin/matches/stats" }),
    getMatchGrowth: b.query<any[], void>({ query: () => "/admin/analytics/match-growth" }),

    // ── Logs ───────────────────────────────────────────────
    getLogs: b.query<AuditLog[], void>({
      query: () => "/admin/logs",
      transformResponse: (res: any[]) => res.map(mapLog),
      providesTags: ["Logs"],
    }),

    // ── Settings (key/value) ───────────────────────────────
    getSettings: b.query<Record<string, unknown>, void>({
      query: () => "/admin/settings",
      providesTags: ["Settings"],
    }),
    patchSettings: b.mutation<unknown, Record<string, unknown>>({
      query: (body) => ({ url: "/admin/settings", method: "PATCH", body }),
      invalidatesTags: ["Settings"],
    }),

    // ── Conversations / matches / live ─────────────────────
    getConversations: b.query<Conversation[], boolean | void>({
      query: (flagged) => ({
        url: "/admin/conversations",
        params: flagged ? { flagged: "true" } : undefined,
      }),
      transformResponse: (res: any[]) => res.map(mapConversation),
      providesTags: ["Conversations"],
    }),
    getConversationMessages: b.query<any[], string>({
      query: (id) => `/admin/conversations/${id}/messages`,
    }),
    deleteConversation: b.mutation<unknown, string>({
      query: (id) => ({ url: `/admin/conversations/${id}`, method: "DELETE" }),
      invalidatesTags: ["Conversations"],
    }),
    getMatches: b.query<any, void>({ query: () => "/admin/matches" }),
    getLive: b.query<any, void>({ query: () => "/admin/live" }),

    // ── Current admin (account) ────────────────────────────
    getMe: b.query<{ id: string; name: string; email: string; role: string }, void>({
      query: () => "/admin/me",
      providesTags: ["Me"],
    }),
    updateMe: b.mutation<unknown, { name?: string; email?: string; password?: string }>({
      query: (body) => ({ url: "/admin/me", method: "PATCH", body }),
      invalidatesTags: ["Me"],
    }),

    // ── Support tickets ────────────────────────────────────
    getTickets: b.query<
      SupportTicket[],
      { status?: string; category?: string; search?: string } | void
    >({
      query: (args) => {
        const a = (args ?? {}) as { status?: string; category?: string; search?: string };
        const params: Record<string, string> = {};
        if (a.status && a.status !== "all") params.status = a.status;
        if (a.category && a.category !== "all") params.category = a.category;
        if (a.search) params.search = a.search;
        return { url: "/admin/support/tickets", params };
      },
      transformResponse: (res: any) => (Array.isArray(res) ? res : (res?.tickets ?? [])),
      providesTags: ["Tickets"],
    }),
    getTicket: b.query<SupportTicketDetail, string>({
      query: (id) => `/admin/support/tickets/${id}`,
      providesTags: ["Tickets"],
    }),
    replyTicket: b.mutation<unknown, { id: string; body: string; close?: boolean }>({
      query: ({ id, body, close }) => ({
        url: `/admin/support/tickets/${id}/reply`,
        method: "POST",
        body: { body, close: close ?? false },
      }),
      invalidatesTags: ["Tickets"],
    }),
    updateTicketStatus: b.mutation<unknown, { id: string; status: TicketStatus }>({
      query: ({ id, status }) => ({
        url: `/admin/support/tickets/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["Tickets"],
    }),

    // ── Account deletion requests ──────────────────────────
    getDeletionRequests: b.query<DeletionRequest[], string | void>({
      query: (status) => ({
        url: "/admin/deletion-requests",
        params: status && status !== "all" ? { status } : undefined,
      }),
      transformResponse: (res: any) => (Array.isArray(res) ? res : (res?.requests ?? [])),
      providesTags: ["Deletions"],
    }),
    confirmDeletion: b.mutation<unknown, { id: string; hardDelete?: boolean }>({
      query: ({ id, hardDelete }) => ({
        url: `/admin/deletion-requests/${id}/confirm`,
        method: "POST",
        body: { hardDelete: hardDelete ?? true },
      }),
      invalidatesTags: ["Deletions", "Users"],
    }),
    rejectDeletion: b.mutation<unknown, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `/admin/deletion-requests/${id}/reject`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: ["Deletions"],
    }),

    // ── Tasbih & streaks ───────────────────────────────────
    getTasbihStats: b.query<TasbihStats, void>({
      query: () => "/admin/tasbih/stats",
      providesTags: ["Tasbih"],
    }),
    getTasbihWeekly: b.query<{ day: string; sessions: number; users: number }[], void>({
      query: () => "/admin/tasbih/weekly",
      transformResponse: (res: any) => (Array.isArray(res) ? res : (res?.days ?? [])),
      providesTags: ["Tasbih"],
    }),
    getTasbihLeaderboard: b.query<TasbihLeader[], number | void>({
      query: (limit) => ({ url: "/admin/tasbih/leaderboard", params: { limit: limit ?? 20 } }),
      transformResponse: (res: any) => (Array.isArray(res) ? res : (res?.users ?? [])),
      providesTags: ["Tasbih"],
    }),
    getTasbihBadges: b.query<TasbihBadge[], void>({
      query: () => "/admin/tasbih/badges",
      transformResponse: (res: any) => (Array.isArray(res) ? res : (res?.badges ?? [])),
      providesTags: ["Tasbih"],
    }),
    createTasbihBadge: b.mutation<unknown, { name: string; type: "streak" | "count"; threshold: number }>({
      query: (body) => ({ url: "/admin/tasbih/badges", method: "POST", body }),
      invalidatesTags: ["Tasbih"],
    }),
    updateTasbihBadge: b.mutation<unknown, { id: string; active?: boolean; name?: string; threshold?: number }>({
      query: ({ id, ...body }) => ({ url: `/admin/tasbih/badges/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Tasbih"],
    }),
    getTasbihSettings: b.query<TasbihSettings, void>({
      query: () => "/admin/tasbih/settings",
      providesTags: ["Tasbih"],
    }),
    patchTasbihSettings: b.mutation<unknown, Partial<TasbihSettings>>({
      query: (body) => ({ url: "/admin/tasbih/settings", method: "PATCH", body }),
      invalidatesTags: ["Tasbih"],
    }),
    adjustTasbihStreak: b.mutation<unknown, { userId: string; currentStreak: number; reason?: string }>({
      query: ({ userId, ...body }) => ({
        url: `/admin/tasbih/users/${userId}/streak`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Tasbih"],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useResetSwipesMutation,
  useGetMeQuery,
  useUpdateMeMutation,
  useSetUserStatusMutation,
  useVerifyUserMutation,
  useSendUserMessageMutation,
  useGetReportsQuery,
  useResolveReportMutation,
  useBanReportMutation,
  useSendBulkMessageMutation,
  useBroadcastMutation,
  useGetNotificationHistoryQuery,
  useGetAudienceCountsQuery,
  useGetInboxThreadsQuery,
  useGetInboxThreadQuery,
  useSendInboxMessageMutation,
  useGetAdsQuery,
  useCreateAdMutation,
  useUpdateAdMutation,
  useDeleteAdMutation,
  useGetPlansQuery,
  useCreatePlanMutation,
  useUpdatePlanMutation,
  useDeletePlanMutation,
  useGetSubscriptionsQuery,
  useAttachSubscriptionMutation,
  useUpdateSubscriptionMutation,
  useDeleteSubscriptionMutation,
  useGetIslamicSettingsQuery,
  useUpdateIslamicSettingsMutation,
  useGetStatsQuery,
  useGetGrowthQuery,
  useGetGenderRatioQuery,
  useGetPracticeQuery,
  useGetWeeklyActivityQuery,
  useGetBillingStatsQuery,
  useGetBillingRevenueQuery,
  useGetTransactionsQuery,
  useGetMatchStatsQuery,
  useGetMatchGrowthQuery,
  useGetLogsQuery,
  useGetSettingsQuery,
  usePatchSettingsMutation,
  useGetConversationsQuery,
  useGetConversationMessagesQuery,
  useDeleteConversationMutation,
  useGetMatchesQuery,
  useGetLiveQuery,
} = adminApi;

export const {
  useGetTicketsQuery,
  useGetTicketQuery,
  useReplyTicketMutation,
  useUpdateTicketStatusMutation,
  useGetDeletionRequestsQuery,
  useConfirmDeletionMutation,
  useRejectDeletionMutation,
  useGetTasbihStatsQuery,
  useGetTasbihWeeklyQuery,
  useGetTasbihLeaderboardQuery,
  useGetTasbihBadgesQuery,
  useCreateTasbihBadgeMutation,
  useUpdateTasbihBadgeMutation,
  useGetTasbihSettingsQuery,
  usePatchTasbihSettingsMutation,
  useAdjustTasbihStreakMutation,
} = adminApi;
