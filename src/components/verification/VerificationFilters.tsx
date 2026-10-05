import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

export interface VerificationFiltersProps {
  onFilterChange: (filters: {
    status?: string;
    type?: 'phone' | 'identity' | 'photo';
    search?: string;
  }) => void;
  loading?: boolean;
}

export function VerificationFilters({
  onFilterChange,
  loading = false,
}: VerificationFiltersProps) {
  const [status, setStatus] = useState('pending');
  const [type, setType] = useState<'phone' | 'identity' | 'photo' | ''>('');
  const [search, setSearch] = useState('');

  const handleApplyFilters = () => {
    onFilterChange({
      status: status || undefined,
      type: type ? (type as 'phone' | 'identity' | 'photo') : undefined,
      search: search || undefined,
    });
  };

  const handleReset = () => {
    setStatus('pending');
    setType('');
    setSearch('');
    onFilterChange({
      status: 'pending',
      type: undefined,
      search: undefined,
    });
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium block mb-2">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="resubmissionRequired">Resubmission Required</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Type</label>
            <Select value={type} onValueChange={(v) => setType(v as 'identity' | 'phone' | 'photo' | '')}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                <SelectItem value="phone">Phone Only</SelectItem>
                <SelectItem value="identity">Identity Only</SelectItem>
                <SelectItem value="photo">Profile Photo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Search</label>
            <Input
              placeholder="Username or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex items-end gap-2">
            <Button
              onClick={handleApplyFilters}
              disabled={loading}
              className="w-full"
            >
              Apply
            </Button>
            <Button
              onClick={handleReset}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Quick filter buttons */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <span className="text-sm text-gray-600 self-center">Quick filters:</span>
          <Button
            size="sm"
            variant={status === 'pending' && !type ? 'default' : 'outline'}
            onClick={() => {
              setStatus('pending');
              setType('');
              handleApplyFilters();
            }}
            disabled={loading}
          >
            Pending Phone
          </Button>
          <Button
            size="sm"
            variant={status === 'pending' && type === 'identity' ? 'default' : 'outline'}
            onClick={() => {
              setStatus('pending');
              setType('identity');
              handleApplyFilters();
            }}
            disabled={loading}
          >
            Pending Identity
          </Button>
          <Button
            size="sm"
            variant={status === 'verified' && !type ? 'default' : 'outline'}
            onClick={() => {
              setStatus('verified');
              setType('');
              handleApplyFilters();
            }}
            disabled={loading}
          >
            Verified
          </Button>
          <Button
            size="sm"
            variant={status === 'rejected' && !type ? 'default' : 'outline'}
            onClick={() => {
              setStatus('rejected');
              setType('');
              handleApplyFilters();
            }}
            disabled={loading}
          >
            Rejected
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
