import { useEffect, useState } from 'react';
import type { VerificationStatus, RejectionReason, VerificationAuditEntry } from '@/types/verification';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { verificationApi } from '@/lib/api/verification-api';
import { DocumentGallery, extractDocuments, documentTypeLabel } from './DocumentGallery';
import { toast } from 'sonner';

const REJECTION_REASONS: RejectionReason[] = [
  'Document unclear',
  'Suspicious',
  'Name mismatch',
  'Expired ID',
  'Other',
];

export interface VerificationDetailModalProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VerificationDetailModal({
  userId,
  open,
  onOpenChange,
}: VerificationDetailModalProps) {
  const [verification, setVerification] = useState<VerificationStatus | null>(null);
  const [auditHistory, setAuditHistory] = useState<VerificationAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<'phone' | 'identity' | 'photo' | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<RejectionReason | 'Other' | ''>('');
  const [customReason, setCustomReason] = useState('');

  useEffect(() => {
    if (open && userId) {
      fetchVerificationData();
    }
  }, [open, userId]);

  useEffect(() => () => {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
  }, [photoPreviewUrl]);

  const fetchVerificationData = async () => {
    try {
      setLoading(true);
      const [verData, auditData] = await Promise.all([
        verificationApi.getUserVerification(userId),
        verificationApi.getVerificationAuditHistory(userId),
      ]);
      setVerification(verData);
      setAuditHistory(auditData);
      const previewUrl = verData.photoSubmission
        ? await verificationApi.getPhotoPreview(userId)
        : null;
      setPhotoPreviewUrl(previewUrl);
    } catch (error) {
      console.error('Failed to load verification data:', error);
      toast.error('Failed to load verification details');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoReview = async (status: 'verified' | 'rejected') => {
    if (status === 'rejected' && (!rejectionReason || (rejectionReason === 'Other' && !customReason.trim()))) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    try {
      setReviewing('photo');
      const reason = rejectionReason === 'Other' ? customReason : rejectionReason;
      await verificationApi.reviewPhotoVerification(userId, status, reason);
      toast.success(`Profile photo ${status} successfully`);
      await fetchVerificationData();
      setRejectionReason('');
      setCustomReason('');
    } catch (error) {
      console.error('Photo review failed:', error);
      toast.error('Failed to process photo review');
    } finally {
      setReviewing(null);
    }
  };

  const handlePhoneReview = async (status: 'verified' | 'rejected') => {
    if (status === 'rejected' && !rejectionReason) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setReviewing('phone');
      const reason = rejectionReason === 'Other' ? customReason : rejectionReason;
      await verificationApi.reviewPhoneVerification(userId, status, reason);
      toast.success(`Phone ${status} successfully`);
      await fetchVerificationData();
      setRejectionReason('');
      setCustomReason('');
    } catch (error) {
      console.error('Phone review failed:', error);
      toast.error('Failed to process phone review');
    } finally {
      setReviewing(null);
    }
  };

  const handleIdentityReview = async (status: 'verified' | 'rejected' | 'resubmissionRequired') => {
    if ((status === 'rejected' || status === 'resubmissionRequired') && !rejectionReason) {
      toast.error('Please provide a reason');
      return;
    }

    try {
      setReviewing('identity');
      const reason = rejectionReason === 'Other' ? customReason : rejectionReason;
      await verificationApi.reviewIdentityVerification(userId, status, reason);
      toast.success(`Identity ${status} successfully`);
      await fetchVerificationData();
      setRejectionReason('');
      setCustomReason('');
    } catch (error) {
      console.error('Identity review failed:', error);
      toast.error('Failed to process identity review');
    } finally {
      setReviewing(null);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!verification) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Couldn't load this member</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The verification details could not be loaded from the server. Check your connection and try again.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button onClick={fetchVerificationData}>Try again</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    verified: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    notSubmitted: 'bg-gray-100 text-gray-800',
    resubmissionRequired: 'bg-orange-100 text-orange-800',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Verification Review</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Phone Verification */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Phone Verification</CardTitle>
                <Badge className={statusColors[verification.phoneStatus]}>
                  {verification.phoneStatus}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Phone Number</Label>
                <Input
                  type="text"
                  value={verification.phone || 'Not provided'}
                  disabled
                  className="mt-1"
                />
              </div>

              {verification.phoneStatus === 'pending' && (
                <div className="space-y-3 pt-4 border-t">
                  <div>
                    <Label htmlFor="phone-reason">Reason (if rejecting)</Label>
                    <Select value={rejectionReason} onValueChange={(v) => setRejectionReason(v as RejectionReason)}>
                      <SelectTrigger id="phone-reason" className="mt-1">
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {REJECTION_REASONS.map((reason) => (
                          <SelectItem key={reason} value={reason}>
                            {reason}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {rejectionReason === 'Other' && (
                    <div>
                      <Label htmlFor="phone-custom">Custom Reason</Label>
                      <Textarea
                        id="phone-custom"
                        placeholder="Explain the reason for rejection..."
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => handlePhoneReview('verified')}
                      disabled={reviewing === 'phone'}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Verify Phone
                    </Button>
                    <Button
                      onClick={() => handlePhoneReview('rejected')}
                      disabled={reviewing === 'phone'}
                      variant="destructive"
                    >
                      Reject Phone
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Identity Verification */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Identity Verification</CardTitle>
                <Badge className={statusColors[verification.identityStatus]}>
                  {verification.identityStatus}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {verification.identitySubmission && (
                <>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label>Submitted</Label>
                      <p className="text-gray-600">
                        {new Date(verification.identitySubmission.submittedAt).toLocaleString()}
                      </p>
                    </div>
                    {verification.identitySubmission.reviewedAt && (
                      <div>
                        <Label>Last Reviewed</Label>
                        <p className="text-gray-600">
                          {new Date(verification.identitySubmission.reviewedAt).toLocaleString()}
                          {verification.identitySubmission.reviewedBy && (
                            <> by {verification.identitySubmission.reviewedBy}</>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t space-y-3">
                    {(() => {
                      const data = verification.identitySubmission!.data;
                      const docs = extractDocuments(data);
                      const typeLabel = documentTypeLabel(data);
                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <Label>Uploaded documents</Label>
                            {typeLabel && <Badge variant="outline">{typeLabel}</Badge>}
                          </div>
                          {docs.length > 0 ? (
                            <DocumentGallery userId={userId} docs={docs} />
                          ) : (
                            <p className="text-sm text-muted-foreground">No document images were attached to this submission.</p>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {verification.identitySubmission.reason && (
                    <div className="bg-amber-50 p-3 rounded border border-amber-200">
                      <Label className="text-amber-900">Previous Review Reason</Label>
                      <p className="text-amber-900 text-sm mt-1">
                        {verification.identitySubmission.reason}
                      </p>
                    </div>
                  )}

                  {verification.identityStatus === 'pending' && (
                    <div className="space-y-3 pt-4 border-t">
                      <div>
                        <Label htmlFor="identity-reason">Reason (if rejecting/resubmitting)</Label>
                        <Select value={rejectionReason} onValueChange={(v) => setRejectionReason(v as RejectionReason)}>
                          <SelectTrigger id="identity-reason" className="mt-1">
                            <SelectValue placeholder="Select reason" />
                          </SelectTrigger>
                          <SelectContent>
                            {REJECTION_REASONS.map((reason) => (
                              <SelectItem key={reason} value={reason}>
                                {reason}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {rejectionReason === 'Other' && (
                        <div>
                          <Label htmlFor="identity-custom">Custom Reason</Label>
                          <Textarea
                            id="identity-custom"
                            placeholder="Explain the reason..."
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            className="mt-1"
                            rows={3}
                          />
                        </div>
                      )}

                      <div className="flex gap-2 pt-4">
                        <Button
                          onClick={() => handleIdentityReview('verified')}
                          disabled={reviewing === 'identity'}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Verify Identity
                        </Button>
                        <Button
                          onClick={() => handleIdentityReview('resubmissionRequired')}
                          disabled={reviewing === 'identity' || !rejectionReason}
                          variant="outline"
                        >
                          Request Resubmission
                        </Button>
                        <Button
                          onClick={() => handleIdentityReview('rejected')}
                          disabled={reviewing === 'identity'}
                          variant="destructive"
                        >
                          Reject Identity
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Profile Photo Verification</CardTitle>
                <Badge className={statusColors[verification.photoStatus]}>{verification.photoStatus}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {photoPreviewUrl && (
                <img src={photoPreviewUrl} alt="Submitted profile verification selfie" className="max-h-96 w-full rounded-md border object-contain" />
              )}
              {verification.photoSubmission?.reason && (
                <p className="text-sm text-muted-foreground">Previous review: {verification.photoSubmission.reason}</p>
              )}
              {verification.photoStatus === 'pending' && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="photo-reason">Reason (if rejecting)</Label>
                    <Select value={rejectionReason} onValueChange={(value) => setRejectionReason(value as RejectionReason)}>
                      <SelectTrigger id="photo-reason" className="mt-1"><SelectValue placeholder="Select reason" /></SelectTrigger>
                      <SelectContent>
                        {REJECTION_REASONS.map((reason) => <SelectItem key={reason} value={reason}>{reason}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {rejectionReason === 'Other' && (
                    <Textarea placeholder="Explain the reason..." value={customReason} onChange={(event) => setCustomReason(event.target.value)} rows={3} />
                  )}
                  <div className="flex gap-2">
                    <Button onClick={() => handlePhotoReview('verified')} disabled={reviewing === 'photo'} className="bg-green-600 hover:bg-green-700">
                      Approve Photo
                    </Button>
                    <Button onClick={() => handlePhotoReview('rejected')} disabled={reviewing === 'photo' || !rejectionReason || (rejectionReason === 'Other' && !customReason.trim())} variant="destructive">
                      Reject Photo
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit History */}
          {auditHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Audit History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {auditHistory.map((entry, idx) => (
                    <div key={idx} className="text-sm border-l-2 border-gray-300 pl-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{entry.reviewedBy}</span>
                        <span className="text-gray-500">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-600">
                        {entry.previousStatus} → {entry.newStatus}
                      </p>
                      {entry.reason && (
                        <p className="text-gray-500 text-xs mt-1">
                          Reason: {entry.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
