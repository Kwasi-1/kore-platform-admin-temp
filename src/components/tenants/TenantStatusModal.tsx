import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateTenant } from '@/api/platform';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-hot-toast';
import { Spinner } from '@/components/ui/spinner';
import { AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';

interface TenantStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: {
    id: string;
    business_name: string;
    is_active: boolean;
  } | null;
}

export const TenantStatusModal: React.FC<TenantStatusModalProps> = ({ isOpen, onClose, tenant }) => {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');

  const isSuspending = tenant?.is_active ?? true;

  const updateMutation = useMutation({
    mutationFn: ({ tenantId, is_active }: { tenantId: string; is_active: boolean }) =>
      updateTenant(tenantId, { is_active }),
    onSuccess: () => {
      toast.success(
        isSuspending
          ? `Tenant ${tenant?.business_name} suspended successfully.`
          : `Tenant ${tenant?.business_name} reactivated successfully.`
      );
      queryClient.invalidateQueries({ queryKey: ['platform_tenants'] });
      queryClient.invalidateQueries({ queryKey: ['platform_tenant_detail'] });
      queryClient.invalidateQueries({ queryKey: ['platform_summary'] });
      setReason('');
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to update tenant status');
    },
  });

  if (!tenant) return null;

  const handleConfirm = () => {
    updateMutation.mutate({ tenantId: tenant.id, is_active: !tenant.is_active });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {isSuspending ? (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            ) : (
              <RefreshCw className="h-5 w-5 text-green-500" />
            )}
            <DialogTitle className="text-lg font-bold font-header">
              {isSuspending ? 'Suspend Merchant Account' : 'Reactivate Merchant Account'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            {isSuspending
              ? `Are you sure you want to suspend `
              : `Are you sure you want to reactivate `}
            <strong className="text-foreground">{tenant.business_name}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          {isSuspending ? (
            <>
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  Suspending will immediately block POS terminal logins, storefront checkouts, and API request access for this merchant.
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Reason for Suspension (Optional)
                </label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Delinquent subscription payment or terms violation..."
                  className="text-xs h-20 resize-none"
                />
              </div>
            </>
          ) : (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-xs">
              Reactivating will restore POS register access, online checkout capabilities, and API request tokens for this merchant.
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={updateMutation.isPending}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={updateMutation.isPending}
            className={isSuspending ? 'bg-red-600 hover:bg-red-700 text-white min-w-[100px]' : 'bg-green-600 hover:bg-green-700 text-white min-w-[100px]'}
          >
            {updateMutation.isPending ? (
              <Spinner className="py-1" />
            ) : isSuspending ? (
              'Suspend Tenant'
            ) : (
              'Reactivate Tenant'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TenantStatusModal;
