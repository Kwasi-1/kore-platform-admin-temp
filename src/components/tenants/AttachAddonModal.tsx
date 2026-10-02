import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { attachTenantAddon, TenantAddon, Tenant } from '@/api/platform';
import { GLOBAL_ADDONS_CATALOG, AddonDefinition, isAddonIncludedInPlan } from '@/config/addons';
import { getPlanConfig } from '@/config/plans';
import { useCurrency } from '@/hooks/useCurrency';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { Spinner } from '@/components/ui/spinner';
import { 
  Puzzle, 
  Search, 
  Check, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  Info,
  DollarSign,
  Zap,
  Calendar
} from 'lucide-react';

interface AttachAddonModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: (Tenant & { api_key_prefix?: string }) | null;
  currentAddons: TenantAddon[];
  onSuccess?: () => void;
}

export const AttachAddonModal: React.FC<AttachAddonModalProps> = ({
  isOpen,
  onClose,
  tenant,
  currentAddons,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { formatGHS } = useCurrency();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAddonKey, setSelectedAddonKey] = useState<string | null>(null);

  // Form customisation state
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly' | 'complimentary' | 'one_time'>('monthly');
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [status, setStatus] = useState<'active' | 'trial'>('active');

  const activeAddonKeys = useMemo(() => {
    return new Set(
      currentAddons
        .filter((a) => a.status === 'active' || a.status === 'trial')
        .map((a) => a.addon_key.toLowerCase())
    );
  }, [currentAddons]);

  const selectedAddonDef = useMemo(() => {
    return GLOBAL_ADDONS_CATALOG.find((a) => a.key === selectedAddonKey) || null;
  }, [selectedAddonKey]);

  // Pro-rating calculation based on tenant billing anchor (date_created)
  const createdDate = useMemo(() => {
    return tenant?.date_created ? new Date(tenant.date_created) : new Date();
  }, [tenant?.date_created]);

  const renewalSchedule = useMemo(() => {
    const today = new Date();
    const renewalDay = createdDate.getDate() || 1;
    let nextRenewal = new Date(today.getFullYear(), today.getMonth(), renewalDay);
    if (nextRenewal <= today) {
      nextRenewal = new Date(today.getFullYear(), today.getMonth() + 1, renewalDay);
    }
    const msPerDay = 1000 * 60 * 60 * 24;
    const remainingDays = Math.max(1, Math.ceil((nextRenewal.getTime() - today.getTime()) / msPerDay));
    const daysInCycle = 30; // standard 30-day month
    const basePlanPrice = getPlanConfig(tenant?.plan).priceMonthly;
    const effectivePrice = billingCycle === 'complimentary' ? 0 : customPrice;

    // Pro-rated immediate charge: Price * (remainingDays / 30)
    const proRatedToday = billingCycle === 'monthly'
      ? Math.round((effectivePrice * (remainingDays / daysInCycle)) * 100) / 100
      : billingCycle === 'one_time' || billingCycle === 'complimentary'
      ? effectivePrice
      : effectivePrice;

    // Next unified monthly invoice: Base plan + Add-on
    const nextUnifiedInvoice = billingCycle === 'monthly'
      ? basePlanPrice + effectivePrice
      : basePlanPrice;

    return {
      nextRenewal,
      renewalDay,
      remainingDays,
      daysInCycle,
      proRatedToday,
      nextUnifiedInvoice,
      basePlanPrice,
    };
  }, [createdDate, tenant?.plan, billingCycle, customPrice]);

  // Handle selecting an add-on
  const handleSelectAddon = (addon: AddonDefinition) => {
    if (activeAddonKeys.has(addon.key) || isAddonIncludedInPlan(addon.key, tenant?.plan || '')) {
      return;
    }
    setSelectedAddonKey(addon.key);
    setBillingCycle(addon.billingCycle === 'one_time' ? 'one_time' : 'monthly');
    setCustomPrice(addon.priceMonthly);
    setStatus('active');
  };

  // Mutation
  const attachMutation = useMutation({
    mutationFn: async () => {
      if (!tenant || !selectedAddonKey) throw new Error('Missing tenant or add-on');
      return attachTenantAddon(tenant.id, {
        addon_key: selectedAddonKey,
        billing_cycle: billingCycle,
        price: billingCycle === 'complimentary' ? 0 : customPrice,
        status,
      });
    },
    onSuccess: () => {
      toast.success(
        `Add-on '${selectedAddonDef?.name || selectedAddonKey}' attached to ${tenant?.business_name}`
      );
      queryClient.invalidateQueries({ queryKey: ['platform_tenant_detail', tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ['platform_tenants'] });
      if (onSuccess) onSuccess();
      handleClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to attach add-on');
    },
  });

  const handleClose = () => {
    setSelectedAddonKey(null);
    setSearchQuery('');
    setSelectedCategory('all');
    onClose();
  };

  // Filtered addons
  const filteredAddons = useMemo(() => {
    return GLOBAL_ADDONS_CATALOG.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.key.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  if (!tenant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border/30 bg-card">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Puzzle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold font-header">
                Attach Add-on to Tenant
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Enable modular capabilities for <strong className="text-foreground">{tenant.business_name}</strong> ({tenant.plan} plan).
              </DialogDescription>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search add-on catalog..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
              {[
                { key: 'all', label: 'All' },
                { key: 'modules', label: 'Modules' },
                { key: 'capacity', label: 'Capacity' },
                { key: 'infrastructure', label: 'Infra' },
                { key: 'support', label: 'Support' },
              ].map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors shrink-0 ${
                    selectedCategory === cat.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable Add-ons List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {filteredAddons.map((addon) => {
            const isIncluded = isAddonIncludedInPlan(addon.key, tenant.plan);
            const isActive = activeAddonKeys.has(addon.key);
            const isSelected = selectedAddonKey === addon.key;
            const isDisabled = isIncluded || isActive;

            return (
              <div
                key={addon.key}
                onClick={() => !isDisabled && handleSelectAddon(addon)}
                className={`p-3.5 rounded-xl border text-xs transition-all relative ${
                  isDisabled
                    ? 'bg-muted/20 border-border/40 opacity-70 cursor-not-allowed'
                    : isSelected
                    ? 'bg-primary/5 border-primary shadow-sm cursor-pointer ring-1 ring-primary'
                    : 'bg-card border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm font-header tracking-tight">
                        {addon.name}
                      </span>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0">
                        {addon.category}
                      </Badge>
                      {isIncluded && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] px-1.5 py-0">
                          Included in {tenant.plan}
                        </Badge>
                      )}
                      {isActive && (
                        <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] px-1.5 py-0">
                          Currently Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      {addon.description}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                      {addon.benefits.slice(0, 3).map((benefit, i) => (
                        <div key={i} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-foreground">
                      {formatGHS(addon.priceMonthly)}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      /{addon.billingCycle === 'one_time' ? 'setup' : 'mo'}
                    </span>
                  </div>
                </div>

                {/* Sub-form when selected */}
                {isSelected && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 pt-3 border-t border-primary/20 space-y-3 bg-background/50 p-3 rounded-lg"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 font-header">
                          Billing Cycle
                        </label>
                        <select
                          value={billingCycle}
                          onChange={(e) => setBillingCycle(e.target.value as any)}
                          className="w-full text-xs bg-muted/40 border border-border rounded px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="monthly">Monthly Subscription</option>
                          <option value="yearly">Yearly Subscription</option>
                          <option value="complimentary">Complimentary (GH₵ 0.00)</option>
                          <option value="one_time">One-Time Setup Fee</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 font-header">
                          Monthly Rate (GH₵)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="5"
                          disabled={billingCycle === 'complimentary'}
                          value={billingCycle === 'complimentary' ? 0 : customPrice}
                          onChange={(e) => setCustomPrice(Number(e.target.value))}
                          className="w-full text-xs bg-muted/40 border border-border rounded px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 font-header">
                          Activation Status
                        </label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value as any)}
                          className="w-full text-xs bg-muted/40 border border-border rounded px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="active">Active (Instant Access)</option>
                          <option value="trial">Trial Period</option>
                        </select>
                      </div>
                    </div>

                    {/* Pro-rated Billing Calculation Breakdown */}
                    {billingCycle === 'monthly' && customPrice > 0 && (
                      <div className="p-3 rounded-lg bg-muted/40 border border-border/80 text-xs space-y-2">
                        <div className="flex items-center justify-between font-semibold text-foreground">
                          <span className="flex items-center gap-1.5 font-header">
                            <Zap className="h-3.5 w-3.5 text-primary" />
                            Pro-rated Billing Schedule
                          </span>
                          <span className="text-[11px] text-muted-foreground font-normal">
                            Cycle renews on the {renewalSchedule.renewalDay}th ({renewalSchedule.remainingDays} days left)
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-border/40 text-xs">
                          <div className="p-2 rounded bg-background/60 border border-border/40">
                            <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block font-header">
                              Charge Today (Pro-rated):
                            </span>
                            <span className="font-bold text-foreground text-sm">
                              {formatGHS(renewalSchedule.proRatedToday)}
                            </span>
                            <span className="text-[10px] text-muted-foreground block mt-0.5">
                              Calculated as {formatGHS(customPrice)} × ({renewalSchedule.remainingDays}/30 days)
                            </span>
                          </div>

                          <div className="p-2 rounded bg-background/60 border border-border/40">
                            <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block font-header">
                              Next Unified Monthly Invoice:
                            </span>
                            <span className="font-bold text-foreground text-sm">
                              {formatGHS(renewalSchedule.nextUnifiedInvoice)} / mo
                            </span>
                            <span className="text-[10px] text-muted-foreground block mt-0.5">
                              Base ({formatGHS(renewalSchedule.basePlanPrice)}) + Add-on ({formatGHS(customPrice)})
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {billingCycle === 'complimentary' && (
                      <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>Complimentary Add-on: Merchant receives full access at GH₵ 0.00 without impacting recurring billing.</span>
                      </div>
                    )}

                    {billingCycle === 'one_time' && (
                      <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2">
                        <Info className="h-4 w-4 shrink-0" />
                        <span>One-time Setup Fee: Billed once at {formatGHS(customPrice)}. Will not be added to monthly invoices.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filteredAddons.length === 0 && (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No add-ons matching "{searchQuery}" found.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/30 bg-card flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {selectedAddonDef ? (
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Selected: <strong>{selectedAddonDef.name}</strong> ·{' '}
                {billingCycle === 'monthly' ? (
                  <>
                    Charge Today:{' '}
                    <strong className="text-foreground font-mono">
                      {formatGHS(renewalSchedule.proRatedToday)}
                    </strong>{' '}
                    (Pro-rated) · Next Invoice:{' '}
                    <strong className="text-foreground font-mono">
                      {formatGHS(renewalSchedule.nextUnifiedInvoice)}/mo
                    </strong>
                  </>
                ) : billingCycle === 'complimentary' ? (
                  <strong className="text-emerald-600">Complimentary (GH₵ 0.00)</strong>
                ) : (
                  <strong className="text-foreground font-mono">{formatGHS(customPrice)} one-time</strong>
                )}
              </span>
            ) : (
              <span>Select an available add-on above to configure</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleClose} disabled={attachMutation.isPending}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => attachMutation.mutate()}
              disabled={!selectedAddonKey || attachMutation.isPending}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {attachMutation.isPending ? (
                <>
                  <Spinner className="h-3 w-3 mr-1.5" />
                  Attaching...
                </>
              ) : (
                'Attach to Tenant'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
