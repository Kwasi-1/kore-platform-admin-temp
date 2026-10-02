import React, { useState, useMemo } from 'react';
import { Tenant, TenantAddon } from '@/api/platform';
import { 
  getPlanConfig, 
  BASE_PLAN_MODULES, 
  ALL_SYSTEM_MODULES, 
  SystemModuleMetadata 
} from '@/config/plans';
import { getAddonDefinition } from '@/config/addons';
import { useCurrency } from '@/hooks/useCurrency';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  Check, 
  Search, 
  Layers, 
  Plus,
  Server
} from 'lucide-react';

interface TenantEntitlementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: (Tenant & { api_key_prefix?: string }) | null;
  addons?: TenantAddon[];
  onOpenAttachAddon?: () => void;
}

type EntitlementSource = 'base_plan' | 'addon' | 'locked';

export const TenantEntitlementsModal: React.FC<TenantEntitlementsModalProps> = ({
  isOpen,
  onClose,
  tenant,
  addons = [],
  onOpenAttachAddon,
}) => {
  const { formatGHS } = useCurrency();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'addon_only' | 'locked'>('all');

  const planKey = (tenant?.plan || 'starter').toLowerCase();
  const planConfig = getPlanConfig(planKey);
  const baseModules = useMemo(() => {
    return BASE_PLAN_MODULES[planKey] || BASE_PLAN_MODULES['starter'] || [];
  }, [planKey]);

  const activeAddons = useMemo(() => {
    return addons.filter((a) => a.status === 'active' || a.status === 'trial');
  }, [addons]);

  const activeAddonKeys = useMemo(() => {
    return new Set(activeAddons.map((a) => a.addon_key.toLowerCase()));
  }, [activeAddons]);

  // Total add-on cost
  const totalAddonMonthlyCost = useMemo(() => {
    return activeAddons.reduce((sum, a) => {
      if (a.billing_cycle === 'complimentary' || !a.price) return sum;
      if (a.billing_cycle === 'one_time') return sum;
      return sum + Number(a.price);
    }, 0);
  }, [activeAddons]);

  // Total monthly recurring commitment
  const totalMonthlyCommitment = planConfig.priceMonthly + totalAddonMonthlyCost;

  // Effective modules calculation
  const evaluatedModules = useMemo(() => {
    return ALL_SYSTEM_MODULES.map((mod) => {
      const isBaseIncluded = baseModules.includes(mod.key);
      const isAddonActive = activeAddonKeys.has(mod.key);

      let source: EntitlementSource = 'locked';
      if (isBaseIncluded) {
        source = 'base_plan';
      } else if (isAddonActive) {
        source = 'addon';
      }

      const matchingAddon = isAddonActive
        ? activeAddons.find((a) => a.addon_key.toLowerCase() === mod.key.toLowerCase())
        : undefined;

      return {
        ...mod,
        source,
        isUnlocked: source !== 'locked',
        matchingAddon,
      };
    });
  }, [baseModules, activeAddonKeys, activeAddons]);

  // Non-module add-ons (Capacity, Infrastructure, SLA)
  const capacityAndInfraAddons = useMemo(() => {
    const coreModuleKeys = new Set(ALL_SYSTEM_MODULES.map((m) => m.key.toLowerCase()));
    return activeAddons.filter((a) => !coreModuleKeys.has(a.addon_key.toLowerCase()));
  }, [activeAddons]);

  // Filtered module list
  const filteredModules = useMemo(() => {
    return evaluatedModules.filter((mod) => {
      const matchesSearch =
        mod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mod.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mod.key.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' || mod.category === selectedCategory;

      let matchesStatus = true;
      if (statusFilter === 'unlocked') matchesStatus = mod.isUnlocked;
      if (statusFilter === 'addon_only') matchesStatus = mod.source === 'addon';
      if (statusFilter === 'locked') matchesStatus = mod.source === 'locked';

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [evaluatedModules, searchQuery, selectedCategory, statusFilter]);

  const unlockedCount = evaluatedModules.filter((m) => m.isUnlocked).length;
  const addonUnlockedCount = evaluatedModules.filter((m) => m.source === 'addon').length;
  const totalModuleCount = evaluatedModules.length;

  if (!tenant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[88vh] flex flex-col p-0 overflow-hidden bg-card border border-border">
        {/* Clean Header */}
        <div className="p-5 border-b border-border/10 bg-card">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base font-bold font-header text-foreground">
                    Access & Entitlements
                  </DialogTitle>
                  <Badge className={planConfig.badgeClassName}>
                    {planConfig.label} Plan
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Effective module permissions for <strong className="text-foreground">{tenant.business_name}</strong>
                </DialogDescription>
              </div>
            </div>

            {onOpenAttachAddon && (
              <Button
                size="sm"
                variant="outline"
                radius='default'
                onClick={() => {
                  onClose();
                  onOpenAttachAddon();
                }}
                className="h-8 px-2.5 text-xs font-semibold flex items-center gap-1.5 mr-8 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Understated Minimalist Financial & Scope Summary Strip */}
          <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/70 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-5">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block font-header">
                  Base Subscription
                </span>
                <span className="font-semibold text-foreground">
                  {planConfig.label} ({formatGHS(planConfig.priceMonthly)}/mo)
                </span>
              </div>
              <div className="h-6 w-[1px] bg-border/60" />
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block font-header">
                  Active Add-ons
                </span>
                <span className="font-semibold text-foreground">
                  {activeAddons.length > 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      +{formatGHS(totalAddonMonthlyCost)}/mo ({activeAddons.length} active)
                    </span>
                  ) : (
                    <span className="text-muted-foreground">None attached</span>
                  )}
                </span>
              </div>
              <div className="h-6 w-[1px] bg-border/60" />
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block font-header">
                  Total Monthly
                </span>
                <span className="font-mono font-bold text-foreground">
                  {formatGHS(totalMonthlyCommitment)}/mo
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block font-header">
                Module Coverage
              </span>
              <span className="font-semibold text-foreground">
                <strong>{unlockedCount}</strong> of {totalModuleCount} Unlocked
              </span>
            </div>
          </div>

          {/* Clean Filter Controls */}
          <div className="mt-3.5 flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by feature name or keyword..."
                className="h-9 w-full pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
              />
            </div>

            {/* Filter pills */}
            <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
              {[
                { key: 'all', label: `All (${totalModuleCount})` },
                { key: 'unlocked', label: `Unlocked (${unlockedCount})` },
                { key: 'addon_only', label: `Add-ons (${addonUnlockedCount})` },
                { key: 'locked', label: `Locked (${totalModuleCount - unlockedCount})` },
              ].map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setStatusFilter(filter.key as any)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors shrink-0 ${
                    statusFilter === filter.key
                      ? 'bg-foreground text-background font-bold'
                      : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Minimalist Table View (Similar to Recent Transactions in Image 3) */}
        <div className="flex-1 overflow-y-auto p-5 pt-0 space-y-4">
          <div className="border border-border rounded-md overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold text-[11px]">
                    <th className="py-2.5 px-4 font-header uppercase tracking-wider">Feature / Module</th>
                    <th className="py-2.5 px-4 font-header uppercase tracking-wider w-28">Category</th>
                    <th className="py-2.5 px-4 font-header uppercase tracking-wider w-28">Access</th>
                    <th className="py-2.5 px-4 font-header uppercase tracking-wider text-right w-44">Source & Billing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredModules.map((module) => {
                    const isBase = module.source === 'base_plan';
                    const isAddon = module.source === 'addon';
                    const isLocked = module.source === 'locked';

                    return (
                      <tr 
                        key={module.key} 
                        className={`hover:bg-muted/20 transition-colors ${
                          isAddon ? 'bg-emerald-500/[0.02]' : isLocked ? 'opacity-65' : ''
                        }`}
                      >
                        {/* Feature Name & Description */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">
                            {module.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground leading-normal mt-0.5 line-clamp-1">
                            {module.description}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4 text-muted-foreground">
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted/60 border border-border/40">
                            {module.categoryLabel}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          {isUnlocked(module.source) ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                              <Check className="h-3.5 w-3.5" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-muted-foreground font-medium">
                              <Lock className="h-3 w-3" />
                              Locked
                            </span>
                          )}
                        </td>

                        {/* Source / Entitlement */}
                        <td className="py-3 px-4 text-right">
                          {isBase && (
                            <span className="text-[11px] text-muted-foreground font-medium">
                              Included in {planConfig.label}
                            </span>
                          )}
                          {isAddon && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <Sparkles className="h-3 w-3" />
                              Add-on ({module.matchingAddon?.billing_cycle === 'complimentary' || !module.matchingAddon?.price ? 'Free' : formatGHS(module.matchingAddon?.price || 0)})
                            </span>
                          )}
                          {isLocked && (
                            <span className="text-[11px] text-muted-foreground/80">
                              Requires {getPlanConfig(module.minTier).label}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredModules.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No features matching the search criteria.
              </div>
            )}
          </div>

          {/* Infrastructure & Capacity Add-ons */}
          {capacityAndInfraAddons.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-header mb-2.5 flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5" /> Active Capacity & Infrastructure Add-ons ({capacityAndInfraAddons.length})
              </h4>

              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold text-[11px]">
                      <th className="py-2.5 px-4 font-header uppercase tracking-wider">Add-on Item</th>
                      <th className="py-2.5 px-4 font-header uppercase tracking-wider">Status</th>
                      <th className="py-2.5 px-4 font-header uppercase tracking-wider text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {capacityAndInfraAddons.map((addon) => {
                      const def = getAddonDefinition(addon.addon_key);
                      const displayName = def?.name || addon.addon_key.replace(/_/g, ' ');
                      const isComplimentary = addon.billing_cycle === 'complimentary' || !addon.price;

                      return (
                        <tr key={addon.id || addon.addon_key} className="hover:bg-muted/20">
                          <td className="py-2.5 px-4">
                            <span className="font-semibold text-foreground">{displayName}</span>
                            <span className="text-[11px] text-muted-foreground block">
                              {def?.description || 'Active capacity subscription extension.'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] px-1.5 py-0">
                              {addon.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-semibold text-foreground">
                            {isComplimentary
                              ? 'Complimentary'
                              : `${formatGHS(addon.price || 0)} / ${addon.billing_cycle === 'one_time' ? 'setup' : 'mo'}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Clean Neutral Footer */}
        <div className="p-4 border-t border-border/20 bg-card flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            Changes to plan or add-ons propagate immediately to store registers.
          </span>
          <Button variant="outline" size="sm" onClick={onClose} className="px-5 text-xs font-semibold">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  function isUnlocked(source: EntitlementSource): boolean {
    return source !== 'locked';
  }
};
