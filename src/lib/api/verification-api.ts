import type { VerificationStatus, AdminVerificationResponse, VerificationUser } from '@/types/verification';

const API_BASE = process.env.VITE_API_URL || 'http://localhost:3000/api';

export const verificationApi = {
  /**
   * Get verification status for a specific user
   */
  getUserVerification: async (userId: string): Promise<VerificationStatus> => {
    const response = await fetch(`${API_BASE}/admin/users/${userId}/verification`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch verification: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Get all users pending verification
   */
  getPendingVerifications: async (
    type?: 'phone' | 'identity',
    limit = 50,
    offset = 0
  ): Promise<{ users: VerificationUser[]; total: number }> => {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });

    if (type) {
      params.append('type', type);
    }

    const response = await fetch(`${API_BASE}/admin/verifications/pending?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
      },
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
      },
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
      },
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch audit history: ${response.statusText}`);
    }

    return response.json();
  },
};
