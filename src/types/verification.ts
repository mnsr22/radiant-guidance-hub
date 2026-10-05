export type PhoneVerificationStatus = 'notSubmitted' | 'pending' | 'verified' | 'rejected';
export type IdentityVerificationStatus = 'notSubmitted' | 'pending' | 'verified' | 'rejected' | 'resubmissionRequired';

export interface VerificationStatus {
  phoneStatus: PhoneVerificationStatus;
  identityStatus: IdentityVerificationStatus;
  photoStatus: IdentityVerificationStatus;
  identitySubmission?: IdentitySubmission;
  photoSubmission?: IdentitySubmission;
  phone?: string;
}

export interface IdentitySubmission {
  id: string;
  userId: string;
  submittedAt: string;
  data: Record<string, unknown>;
  status: IdentityVerificationStatus;
  reviewedAt?: string;
  reviewedBy?: string;
  reason?: string;
  updatedAt: string;
}

export interface VerificationAuditEntry {
  timestamp: string;
  reviewedBy: string;
  previousStatus: string;
  newStatus: string;
  reason: string;
}

export interface VerificationUser {
  id: string;
  username: string;
  email: string;
  phone?: string;
  phoneVerificationStatus: PhoneVerificationStatus;
  identityVerificationStatus: IdentityVerificationStatus;
  photoVerificationStatus: IdentityVerificationStatus;
  lastSubmittedAt?: string;
  createdAt: string;
}

export interface AdminVerificationResponse {
  success: boolean;
  data?: VerificationStatus;
  error?: string;
}

export type RejectionReason = 'Document unclear' | 'Suspicious' | 'Name mismatch' | 'Expired ID' | 'Other';
