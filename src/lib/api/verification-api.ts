import type { VerificationStatus, AdminVerificationResponse, VerificationUser } from '@/types/verification';
import { BASE_URL, getToken } from '@/lib/api';

// Origin and token both come from lib/api so this client can't drift from the
// rest of the dashboard — it previously read `process.env` (undefined in a Vite
// bundle, so every call went to localhost) and a token key nothing ever wrote.
const API_BASE = BASE_URL;

function authHeaders(): Record<string, string> {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const verificationApi = {
  /**
   * Get verification status for a specific user
   */
  getUserVerification: async (userId: string): Promise<VerificationStatus> => {
    const response = await fetch(`${API_BASE}/admin/users/${userId}/verification`, {
      method: 'GET',
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch verification: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Get all users pending verification
   */
  getPendingVerifications: async (opts: {
    type?: 'phone' | 'identity';
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ users: VerificationUser[]; total: number }> => {
    const params = new URLSearchParams({
      limit: String(opts.limit ?? 50),
      offset: String(opts.offset ?? 0),
    });

    if (opts.type) params.append('type', opts.type);
    if (opts.status) params.append('status', opts.status);
    if (opts.search) params.append('search', opts.search);

    const response = await fetch(`${API_BASE}/admin/verifications/pending?${params}`, {
      method: 'GET',
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch pending verifications: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Approve or reject phone verification
   */
  reviewPhoneVerification: async (
    userId: string,
    status: 'verified' | 'rejected',
    reason?: string
  ): Promise<AdminVerificationResponse> => {
    const response = await fetch(`${API_BASE}/admin/users/${userId}/verification/phone`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status, reason }),
    });

    if (!response.ok) {
      throw new Error(`Failed to review phone verification: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Approve, reject, or request resubmission for identity verification
   */
  reviewIdentityVerification: async (
    userId: string,
    status: 'verified' | 'rejected' | 'resubmissionRequired',
    reason?: string
  ): Promise<AdminVerificationResponse> => {
    const response = await fetch(`${API_BASE}/admin/users/${userId}/verification/identity`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status, reason }),
    });

    if (!response.ok) {
      throw new Error(`Failed to review identity verification: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Get verification audit history for a user
   */
  getVerificationAuditHistory: async (userId: string) => {
    const response = await fetch(`${API_BASE}/admin/users/${userId}/verification/audit`, {
      method: 'GET',
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch audit history: ${response.statusText}`);
    }

    return response.json();
  },
};
