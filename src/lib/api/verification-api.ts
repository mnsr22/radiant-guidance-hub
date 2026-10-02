import type {
  VerificationStatus,
  AdminVerificationResponse,
  VerificationUser,
  VerificationAuditEntry,
} from '@/types/verification';
import { api } from '@/lib/api';

// Paths follow docs/API-CONTRACT.md §3. Responses are normalised because the
// backend returns `{ items, total }` lists while the UI expects `{ users }`.

function normaliseUser(u: any): VerificationUser {
  return {
    id: String(u.id ?? u.userId),
    username: u.username ?? u.name ?? u.user?.name ?? u.email ?? 'Unnamed member',
    email: u.email ?? u.user?.email ?? '',
    phone: u.phone ?? u.user?.phone,
    phoneVerificationStatus: u.phoneVerificationStatus ?? u.phoneStatus ?? u.phone_status ?? 'notSubmitted',
    identityVerificationStatus:
      u.identityVerificationStatus ?? u.identityStatus ?? u.identity_status ?? 'notSubmitted',
    lastSubmittedAt: u.lastSubmittedAt ?? u.submittedAt ?? u.updatedAt,
    createdAt: u.createdAt ?? new Date().toISOString(),
  };
}

export const verificationApi = {
  getUserVerification: async (userId: string): Promise<VerificationStatus> => {
    const d: any = await api(`/admin/verifications/${userId}`);
    return {
      phoneStatus: d.phoneStatus ?? d.phone?.status ?? d.phoneVerificationStatus ?? 'notSubmitted',
      identityStatus:
        d.identityStatus ?? d.identity?.status ?? d.identityVerificationStatus ?? 'notSubmitted',
      identitySubmission: d.identitySubmission ?? d.identity?.submission,
      phone: typeof d.phone === 'string' ? d.phone : d.phone?.number ?? d.phoneNumber,
    };
  },

  getPendingVerifications: async (opts: {
    type?: 'phone' | 'identity';
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ users: VerificationUser[]; total: number }> => {
    const d: any = await api('/admin/verifications', {
      query: {
        type: opts.type,
        status: opts.status === 'all' ? undefined : opts.status,
        search: opts.search,
        limit: opts.limit ?? 50,
        offset: opts.offset ?? 0,
      },
    });
    const list: any[] = Array.isArray(d) ? d : d?.items ?? d?.users ?? [];
    return { users: list.map(normaliseUser), total: d?.total ?? list.length };
  },

  reviewPhoneVerification: (userId: string, status: 'verified' | 'rejected', reason?: string) =>
    api<AdminVerificationResponse>(`/admin/verifications/${userId}`, {
      method: 'PATCH',
      body: { type: 'phone', status, reason },
    }),

  reviewIdentityVerification: (
    userId: string,
    status: 'verified' | 'rejected' | 'resubmissionRequired',
    reason?: string,
  ) =>
    api<AdminVerificationResponse>(`/admin/verifications/${userId}`, {
      method: 'PATCH',
      body: { type: 'identity', status, reason },
    }),

  getVerificationAuditHistory: async (userId: string): Promise<VerificationAuditEntry[]> => {
    try {
      const d: any = await api(`/admin/verifications/${userId}/audit`);
      return Array.isArray(d) ? d : d?.items ?? [];
    } catch {
      return []; // audit is secondary — never block the review screen on it
    }
  },
};
