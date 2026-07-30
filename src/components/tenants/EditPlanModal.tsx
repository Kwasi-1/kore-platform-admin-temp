import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateTenant } from '@/api/platform';
import { getPlanConfig } from '@/config/plans';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { Spinner } from '@/components/ui/spinner';
import { Check, ShieldAlert, Sparkles } from 'lucide-react';

interface EditPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: {
    id: string;
    business_name: string;
    plan: string;
  } | null;
}

const PLAN_KEYS = ['starter', 'standard', 'business', 'ecom_only'];

export const EditPlanModal: React.FC<EditPlanModalProps> = ({ isOpen, onClose, tenant }) => {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  useEffect(() => {
    if (tenant) {
      setSelectedPlan(tenant.plan || 'starter');
    }
  }, [tenant]);

  const updateMutation = useMutation({
    mutationFn: ({ tenantId, plan }: { tenantId: string; plan: string }) =>
      updateTenant(tenantId, { plan }),
    onSuccess: () => {
      toast.success(`Plan updated successfully to ${getPlanConfig(selectedPlan).label}`);
      queryClient.invalidateQueries({ queryKey: ['platform_tenants'] });
      queryClient.invalidateQueries({ queryKey: ['platform_tenant_detail'] });
      queryClient.invalidateQueries({ queryKey: ['platform_summary'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to update tenant plan');
    },
  });

  if (!tenant) return null;

  const currentConfig = getPlanConfig(tenant.plan);
  const isChanged = selectedPlan !== tenant.plan;

  const handleSave = () => {
    if (!isChanged) return;
    updateMutation.mutate({ tenantId: tenant.id, plan: selectedPlan });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle className="text-lg font-bold font-header">Edit Subscription Plan</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Manage billing tier & feature access for <strong className="text-foreground">{tenant.business_name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border text-xs">
            <span className="text-muted-foreground font-medium">Current Active Tier:</span>
            <Badge className={currentConfig.badgeClassName}>
              {currentConfig.label}
            </Badge>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Select New Plan
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {PLAN_KEYS.map((planKey) => {
                const cfg = getPlanConfig(planKey);
                const isSelected = selectedPlan === planKey;
                const isCurrent = tenant.plan === planKey;

                return (
                  <button
                    key={planKey}
                    type="button"
                    onClick={() => setSelectedPlan(planKey)}
                    className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border bg-card hover:bg-muted/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-foreground">{cfg.label}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight line-clamp-2">
                        {cfg.description}
                      </p>
                    </div>

                    {isCurrent && (
                      <span className="mt-2 text-[10px] font-semibold text-primary uppercase tracking-wider">
                        (Current Plan)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {isChanged && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                Changing the plan will immediately adjust endpoint rate limits and module provisioning for this merchant.
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={updateMutation.isPending}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!isChanged || updateMutation.isPending} className="min-w-[100px]">
            {updateMutation.isPending ? <Spinner className="py-1" /> : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditPlanModal;
