import { useEffect, useState, useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import type { VerificationUser } from '@/types/verification';
import { verificationApi } from '@/lib/api/verification-api';
import { VerificationFilters } from '@/components/verification/VerificationFilters';
import { VerificationQueueTable } from '@/components/verification/VerificationQueueTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/layout';

export const Route = createFileRoute('/admin/verification')({
  component: VerificationPage,
});

function VerificationPage() {
  const [users, setUsers] = useState<VerificationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: 'pending',
    type: undefined as 'phone' | 'identity' | undefined,
    search: undefined as string | undefined,
  });

  const ITEMS_PER_PAGE = 50;

  const fetchVerifications = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const offset = (page - 1) * ITEMS_PER_PAGE;
      const result = await verificationApi.getPendingVerifications({
        type: filters.type,
        status: filters.status,
        search: filters.search,
        limit: ITEMS_PER_PAGE,
        offset,
      });
      setUsers(result.users);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to fetch verifications:', error);
      setLoadError(error instanceof Error ? error.message : 'Unknown error');
      setUsers([]);
      toast.error(error instanceof Error ? error.message : 'Failed to load verification queue');
    } finally {
      setLoading(false);
    }
  }, [page, filters.type, filters.status, filters.search]);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <AdminLayout>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Verification Queue</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve user phone and identity verifications
          </p>
        </div>
        <Button
          onClick={() => {
            setPage(1);
            fetchVerifications();
          }}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Page
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {page} of {totalPages || 1}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Users on Page
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <VerificationFilters
        onFilterChange={handleFilterChange}
        loading={loading}
      />

      {loadError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-destructive">Couldn't load the queue: {loadError}</p>
            <Button size="sm" variant="outline" onClick={() => fetchVerifications()}>Try again</Button>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <VerificationQueueTable
        users={users}
        loading={loading}
        onRefresh={() => fetchVerifications()}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * ITEMS_PER_PAGE + 1} to{' '}
            {Math.min(page * ITEMS_PER_PAGE, total)} of {total} users
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              variant="outline"
            >
              Previous
            </Button>
            <Button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
    </AdminLayout>
  );
}
