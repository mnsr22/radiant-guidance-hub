// Stable hook names over the RTK Query (Redux) admin API. Components import
// from here; the Redux store/cache is in src/store. Each "*Mutations" hook
// returns objects with a react-query-like `.mutate(arg, { onSuccess, onError })`
// so route code stays uniform.
import type { MockUser } from "./mock-data";
import type { GetUsersArgs } from "@/store/admin-api";
import {
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
  useGetJourneySummaryQuery,
  useGetLogsQuery,
  useGetSettingsQuery,
  usePatchSettingsMutation,
  useGetConversationsQuery,
  useGetConversationMessagesQuery,
  useDeleteConversationMutation,
  useGetMatchesQuery,
  useGetLiveQuery,
} from "@/store/admin-api";
import {
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
  useGetWaliLinksQuery,
  useGetWaliSettingsQuery,
  usePatchWaliSettingsMutation,
  useUpdateWaliLinkMutation,
  useSetWaliStatusMutation,
  useResendWaliInviteMutation,
  useRemoveWaliLinkMutation,
} from "@/store/admin-api";
import type {
  TicketStatus, TasbihSettings, WaliLink, WaliSettings, WaliStatus,
} from "@/store/admin-api";

type MutOpts = { onSuccess?: () => void; onError?: (e: unknown) => void };

/// Adapt an RTK mutation trigger to a `.mutate(arg, opts)` / `.mutateAsync(arg)` API.
function wrap<T>(trigger: (arg: T) => { unwrap: () => Promise<unknown> }) {
  return {
    mutate: (arg: T, opts?: MutOpts) => {
      trigger(arg)
        .unwrap()
        .then(() => opts?.onSuccess?.())
        .catch((e) => opts?.onError?.(e));
    },
    mutateAsync: (arg: T) => trigger(arg).unwrap(),
  };
}

// ── Users ──────────────────────────────────────────────────────
export function useUsers(args?: GetUsersArgs, opts?: { skip?: boolean }) {
  const { data, isLoading, isFetching } = useGetUsersQuery(args ?? {}, {
    skip: opts?.skip ?? false,
  });
  return { data, isLoading, isFetching };
}
export function useUserMutations() {
  const [setStatus] = useSetUserStatusMutation();
  const [verify] = useVerifyUserMutation();
  const [message] = useSendUserMessageMutation();
  const [create] = useCreateUserMutation();
  const [update] = useUpdateUserMutation();
  const [resetSwipes] = useResetSwipesMutation();
  return {
    setStatus: wrap<{ id: string; status: MockUser["status"] }>(setStatus),
    verify: wrap<{ id: string; verified: boolean }>(verify),
    message: wrap<{ id: string; subject?: string; body: string }>(message),
    create: wrap<{
      name: string;
      email: string;
      password: string;
      role?: "user" | "admin";
      status?: string;
      gender?: "male" | "female";
    }>(create),
    update: wrap<{ id: string; body: Record<string, unknown> }>(update),
    resetSwipes: wrap<string>(resetSwipes),
  };
}

// ── Current admin (account) ────────────────────────────────────
export function useMe() {
  const { data, isLoading } = useGetMeQuery();
  return { data, isLoading };
}
export function useUpdateMe() {
  const [update] = useUpdateMeMutation();
  return wrap<{ name?: string; email?: string; password?: string }>(update);
}

// ── Reports / moderation ───────────────────────────────────────
export function useReports(status?: string) {
  const { data, isLoading } = useGetReportsQuery(status);
  return { data, isLoading };
}
export function useReportMutations() {
  const [resolve] = useResolveReportMutation();
  const [ban] = useBanReportMutation();
  return {
    resolve: wrap<{ id: string; status: "reviewed" | "resolved" | "dismissed"; note?: string }>(
      resolve,
    ),
    ban: wrap<string>(ban),
  };
}

// ── Messaging / broadcast ──────────────────────────────────────
export function useMessaging() {
  const [sendBulk] = useSendBulkMessageMutation();
  const [broadcast] = useBroadcastMutation();
  return {
    sendBulk: wrap<{ userIds?: string[]; audience?: string; subject?: string; body: string }>(
      sendBulk,
    ),
    broadcast: wrap<{ title: string; message: string; audience?: string }>(broadcast),
  };
}

export function useNotificationHistory() {
  const { data, isLoading } = useGetNotificationHistoryQuery();
  return { data, isLoading };
}
export function useAudienceCounts() {
  const { data, isLoading } = useGetAudienceCountsQuery();
  return { data, isLoading };
}

// ── Admin ↔ user inbox (support chat) ──────────────────────────
export function useInboxThreads() {
  const { data, isLoading } = useGetInboxThreadsQuery(undefined, { pollingInterval: 15000 });
  return { data, isLoading };
}
export function useInboxThread(userId: string | null) {
  const { data, isLoading, isFetching } = useGetInboxThreadQuery(userId ?? "", {
    skip: !userId,
    pollingInterval: 8000,
  });
  return { data, isLoading, isFetching };
}
export function useInboxSend() {
  const [send] = useSendInboxMessageMutation();
  return wrap<{ userId: string; body: string; subject?: string }>(send);
}

// ── Ads ────────────────────────────────────────────────────────
export function useAds() {
  const { data, isLoading } = useGetAdsQuery();
  return { data, isLoading };
}
export function useAdMutations() {
  const [create] = useCreateAdMutation();
  const [update] = useUpdateAdMutation();
  const [remove] = useDeleteAdMutation();
  return {
    create: wrap<any>(create),
    update: wrap<{ id: string; body: any }>(update),
    remove: wrap<string>(remove),
  };
}

// ── Plans (subscription packages) ──────────────────────────────
export function usePlans() {
  const { data, isLoading } = useGetPlansQuery();
  return { data, isLoading };
}
export function usePlanMutations() {
  const [create] = useCreatePlanMutation();
  const [update] = useUpdatePlanMutation();
  const [remove] = useDeletePlanMutation();
  return {
    create: wrap<Record<string, unknown>>(create),
    update: wrap<{ id: string; body: any }>(update),
    remove: wrap<string>(remove),
  };
}

// ── Subscriptions ──────────────────────────────────────────────
export function useSubscriptions() {
  const { data, isLoading, isFetching } = useGetSubscriptionsQuery();
  return { data, isLoading, isFetching };
}
export function useSubscriptionMutations() {
  const [attach] = useAttachSubscriptionMutation();
  const [update] = useUpdateSubscriptionMutation();
  const [remove] = useDeleteSubscriptionMutation();
  return {
    attach: wrap<Record<string, unknown>>(attach),
    update: wrap<{ id: string; body: Record<string, unknown> }>(update),
    remove: wrap<string>(remove),
  };
}

// ── Islamic settings ───────────────────────────────────────────
export function useIslamicSettings() {
  const { data, isLoading } = useGetIslamicSettingsQuery();
  return { data, isLoading };
}
export function useIslamicMutation() {
  const [update] = useUpdateIslamicSettingsMutation();
  return wrap<any>(update);
}

// ── Stats + analytics ──────────────────────────────────────────
export function useStats() {
  const { data, isLoading } = useGetStatsQuery();
  return { data, isLoading };
}
export function useGrowth() {
  const { data, isLoading } = useGetGrowthQuery();
  return { data, isLoading };
}
export function useGenderRatio() {
  const { data, isLoading } = useGetGenderRatioQuery();
  return { data, isLoading };
}
export function usePractice() {
  const { data, isLoading } = useGetPracticeQuery();
  return { data, isLoading };
}
export function useWeeklyActivity() {
  const { data, isLoading } = useGetWeeklyActivityQuery();
  return { data, isLoading };
}

// ── Billing analytics ──────────────────────────────────────────
export function useBillingStats() {
  const { data, isLoading } = useGetBillingStatsQuery();
  return { data, isLoading };
}
export function useBillingRevenue() {
  const { data, isLoading } = useGetBillingRevenueQuery();
  return { data, isLoading };
}
export function useTransactions() {
  const { data, isLoading } = useGetTransactionsQuery();
  return { data, isLoading };
}

// ── Match analytics ────────────────────────────────────────────
export function useMatchStats() {
  const { data, isLoading } = useGetMatchStatsQuery();
  return { data, isLoading };
}
export function useMatchGrowth() {
  const { data, isLoading } = useGetMatchGrowthQuery();
  return { data, isLoading };
}

export function useJourneySummary() {
  const { data, isLoading } = useGetJourneySummaryQuery();
  return { data, isLoading };
}

// ── Logs ───────────────────────────────────────────────────────
export function useLogs() {
  const { data, isLoading } = useGetLogsQuery();
  return { data, isLoading };
}

// ── Settings ───────────────────────────────────────────────────
export function useSettings() {
  const { data, isLoading } = useGetSettingsQuery();
  return { data, isLoading };
}
export function useSettingsMutation() {
  const [patch] = usePatchSettingsMutation();
  return wrap<Record<string, unknown>>(patch);
}

// ── Conversations / matches / live ─────────────────────────────
export function useConversations(flagged = false) {
  const { data, isLoading } = useGetConversationsQuery(flagged);
  return { data, isLoading };
}
export function useConversationMessages(id: string | null) {
  const { data, isLoading } = useGetConversationMessagesQuery(id ?? "", { skip: !id });
  return { data, isLoading };
}
export function useDeleteConversation() {
  const [del] = useDeleteConversationMutation();
  return wrap<string>(del);
}
export function useMatches() {
  const { data, isLoading } = useGetMatchesQuery();
  return { data, isLoading };
}
export function useLive() {
  const { data, isLoading } = useGetLiveQuery(undefined, { pollingInterval: 15000 });
  return { data, isLoading };
}

// ── Support tickets ────────────────────────────────────────────
export function useTickets(args?: { status?: string; category?: string; search?: string }) {
  const { data, isLoading, isFetching } = useGetTicketsQuery(args ?? {});
  return { data, isLoading, isFetching };
}
export function useTicket(id: string | null) {
  const { data, isLoading } = useGetTicketQuery(id as string, { skip: !id });
  return { data, isLoading };
}
export function useTicketMutations() {
  const [reply] = useReplyTicketMutation();
  const [setStatus] = useUpdateTicketStatusMutation();
  return {
    reply: wrap<{ id: string; body: string; close?: boolean }>(reply),
    setStatus: wrap<{ id: string; status: TicketStatus }>(setStatus),
  };
}

// ── Account deletion requests ──────────────────────────────────
export function useDeletionRequests(status?: string) {
  const { data, isLoading } = useGetDeletionRequestsQuery(status);
  return { data, isLoading };
}
export function useDeletionMutations() {
  const [confirm] = useConfirmDeletionMutation();
  const [reject] = useRejectDeletionMutation();
  return {
    confirm: wrap<{ id: string; hardDelete?: boolean }>(confirm),
    reject: wrap<{ id: string; reason?: string }>(reject),
  };
}

// ── Tasbih & streaks ───────────────────────────────────────────
export function useTasbihStats() {
  const { data, isLoading } = useGetTasbihStatsQuery();
  return { data, isLoading };
}
export function useTasbihWeekly() {
  const { data, isLoading } = useGetTasbihWeeklyQuery();
  return { data, isLoading };
}
export function useTasbihLeaderboard(limit = 20) {
  const { data, isLoading } = useGetTasbihLeaderboardQuery(limit);
  return { data, isLoading };
}
export function useTasbihBadges() {
  const { data, isLoading } = useGetTasbihBadgesQuery();
  return { data, isLoading };
}
export function useTasbihSettings() {
  const { data, isLoading } = useGetTasbihSettingsQuery();
  return { data, isLoading };
}
export function useTasbihMutations() {
  const [createBadge] = useCreateTasbihBadgeMutation();
  const [updateBadge] = useUpdateTasbihBadgeMutation();
  const [saveSettings] = usePatchTasbihSettingsMutation();
  const [adjustStreak] = useAdjustTasbihStreakMutation();
  return {
    createBadge: wrap<{ name: string; type: "streak" | "count"; threshold: number }>(createBadge),
    updateBadge: wrap<{ id: string; active?: boolean; name?: string; threshold?: number }>(
      updateBadge,
    ),
    saveSettings: wrap<Partial<TasbihSettings>>(saveSettings),
    adjustStreak: wrap<{ userId: string; currentStreak: number; reason?: string }>(adjustStreak),
  };
}

// ── Wali (guardian) oversight ──────────────────────────────────
export function useWaliLinks(args?: { status?: string; search?: string }) {
  const { data, isLoading, isFetching, isError } = useGetWaliLinksQuery(args ?? {});
  return { data, isLoading, isFetching, isError };
}
export function useWaliSettings() {
  const { data, isLoading } = useGetWaliSettingsQuery();
  return { data, isLoading };
}
export function useWaliMutations() {
  const [saveSettings] = usePatchWaliSettingsMutation();
  const [updateLink] = useUpdateWaliLinkMutation();
  const [setStatus] = useSetWaliStatusMutation();
  const [resendInvite] = useResendWaliInviteMutation();
  const [remove] = useRemoveWaliLinkMutation();
  return {
    saveSettings: wrap<Partial<WaliSettings>>(saveSettings),
    updateLink: wrap<{ id: string } & Partial<WaliLink>>(updateLink),
    setStatus: wrap<{ id: string; status: WaliStatus; reason?: string }>(setStatus),
    resendInvite: wrap<string>(resendInvite),
    remove: wrap<string>(remove),
  };
}
