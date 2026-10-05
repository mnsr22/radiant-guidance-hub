import { useState } from 'react';
import type { VerificationUser } from '@/types/verification';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VerificationDetailModal } from './VerificationDetailModal';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  verified: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  notSubmitted: 'bg-gray-100 text-gray-800',
  resubmissionRequired: 'bg-orange-100 text-orange-800',
};

export interface VerificationQueueTableProps {
  users: VerificationUser[];
  loading?: boolean;
  onRefresh?: () => void;
}

export function VerificationQueueTable({
  users,
  loading = false,
  onRefresh,
}: VerificationQueueTableProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const maskPhone = (phone?: string) => {
    if (!phone) return '-';
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-****');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Phone Status</TableHead>
              <TableHead>Identity Status</TableHead>
              <TableHead>Photo Status</TableHead>
              <TableHead>Last Submitted</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No users to verify
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {maskPhone(user.phone)}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[user.phoneVerificationStatus]}>
                      {user.phoneVerificationStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[user.identityVerificationStatus]}>
                      {user.identityVerificationStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[user.photoVerificationStatus]}>
                      {user.photoVerificationStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {user.lastSubmittedAt
                      ? formatDate(user.lastSubmittedAt)
                      : 'Never'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUserId(user.id)}
                      disabled={loading}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedUserId && (
        <VerificationDetailModal
          userId={selectedUserId}
          open={!!selectedUserId}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedUserId(null);
              onRefresh?.();
            }
          }}
        />
      )}
    </>
  );
}
