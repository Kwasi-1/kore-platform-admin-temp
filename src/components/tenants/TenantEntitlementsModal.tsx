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
  CheckCircle2, 
  Search, 
  Puzzle, 
  Plus, 
  Layers, 
  Info,
  Server,
  Zap,
  SlidersHorizontal
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
      // Search filter
      const matchesSearch =
        mod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mod.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mod.key.toLowerCase().includes(searchQuery.toLowerCase());

      // Category filter
      const matchesCategory =
        selectedCategory === 'all' || mod.category === selectedCategory;

      // Status filter
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
  const coveragePercent = Math.round((unlockedCount / totalModuleCount) * 100);

  if (!tenant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[88vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border bg-card">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base font-bold font-header tracking-tight text-foreground">
                    Access & Entitlements Audit
                  </DialogTitle>
                  <Badge className={planConfig.badgeClassName}>
                    {planConfig.label} Plan
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Unified view of all operational modules unlocked for{' '}
                  <strong className="text-foreground">{tenant.business_name}</strong> via base plan and custom add-ons.
                </DialogDescription>
              </div>
            </div>

            {onOpenAttachAddon && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onClose();
                  onOpenAttachAddon();
                }}
                className="h-8 px-2.5 text-xs font-semibold flex items-center gap-1.5 border-primary/30 text-primary hover:border-primary shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                Attach Add-on
              </Button>
            )}
          </div>

          {/* KPI Snapshot Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-header">
                  Base Plan Tier
                </span>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono">
                  {formatGHS(planConfig.priceMonthly)}/mo
                </Badge>
              </div>
              <div className="text-sm font-bold text-foreground mt-1 font-header">
                {planConfig.label}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Includes {baseModules.length} core default modules
              </p>
            </div>

            <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-header">
                  Custom Add-ons
                </span>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] px-1.5 py-0 font-mono">
                  +{formatGHS(totalAddonMonthlyCost)}/mo
                </Badge>
              </div>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-header flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                {activeAddons.length} Active {activeAddons.length === 1 ? 'Add-on' : 'Add-ons'}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Unlocks {addonUnlockedCount} tier-gated features
              </p>
            </div>

            <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-header">
                  Effective Modules
                </span>
                <span className="text-xs font-mono font-bold text-foreground">
                  {coveragePercent}% Suite
                </span>
              </div>
              <div className="text-sm font-bold text-foreground mt-1 font-header">
                {unlockedCount} / {totalModuleCount} Unlocked
              </div>
              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-1.5 mt-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${coveragePercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Search & Filtering Strip */}
          <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules or features (e.g. pos, payroll, supplier)..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/40 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
              />
            </div>

            {/* Status pills */}
            <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
              {[
                { key: 'all', label: `All (${totalModuleCount})` },
                { key: 'unlocked', label: `Unlocked (${unlockedCount})` },
                { key: 'addon_only', label: `From Add-on (${addonUnlockedCount})` },
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Core Modules Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-header flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Core Feature Modules ({filteredModules.length})
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredModules.map((module) => {
                const isBase = module.source === 'base_plan';
                const isAddon = module.source === 'addon';
                const isLocked = module.source === 'locked';

                return (
                  <div
                    key={module.key}
                    className={`p-3.5 rounded-xl border text-xs transition-all relative flex flex-col justify-between gap-2.5 ${
                      isAddon
                        ? 'bg-emerald-500/[0.04] border-emerald-500/30 ring-1 ring-emerald-500/20'
                        : isBase
                        ? 'bg-card border-border/80'
                        : 'bg-muted/15 border-border/40 opacity-70'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {isAddon ? (
                            <div className="p-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <Sparkles className="h-4 w-4" />
                            </div>
                          ) : isBase ? (
                            <div className="p-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                              <CheckCircle2 className="h-4 w-4" />
                            </div>
                          ) : (
                            <div className="p-1 rounded bg-muted text-muted-foreground">
                              <Lock className="h-4 w-4" />
                            </div>
                          )}
                          <div>
                            <h5 className="font-bold text-foreground text-xs font-header !tracking-normal">
                              {module.name}
                            </h5>
                            <code className="text-[10px] text-muted-foreground font-mono">
                              moduleKey: {module.key}
                            </code>
                          </div>
                        </div>

                        <Badge variant="outline" className="text-[9px] uppercase px-1 py-0 shrink-0 text-muted-foreground">
                          {module.categoryLabel}
                        </Badge>
                      </div>

                      <p className="text-[11px] text-muted-foreground leading-relaxed pl-7">
                        {module.description}
                      </p>
                    </div>

                    {/* Source / Entitlement Tag */}
                    <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">Entitlement Status:</span>
                      {isBase && (
                        <span className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                          Included in {planConfig.label} Plan
                        </span>
                      )}
                      {isAddon && (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <Sparkles className="h-3 w-3" />
                          Unlocked by Add-on ({module.matchingAddon?.billing_cycle || 'active'})
                        </span>
                      )}
                      {isLocked && (
                        <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border">
                          Locked · Requires {getPlanConfig(module.minTier).label} or Add-on
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredModules.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                No modules matching the selected filters.
              </div>
            )}
          </div>

          {/* Infrastructure & Capacity Add-ons */}
          {capacityAndInfraAddons.length > 0 && (
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-header flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5" /> Additional Capacity & Infrastructure Add-ons ({capacityAndInfraAddons.length})
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {capacityAndInfraAddons.map((addon) => {
                  const def = getAddonDefinition(addon.addon_key);
                  const displayName = def?.name || addon.addon_key.replace(/_/g, ' ');
                  const isComplimentary = addon.billing_cycle === 'complimentary' || !addon.price;

                  return (
                    <div
                      key={addon.id || addon.addon_key}
                      className="p-3 rounded-xl bg-card border border-border text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground capitalize font-header">
                          {displayName}
                        </span>
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] px-1.5 py-0">
                          {addon.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {def?.description || 'Active capacity subscription extension.'}
                      </p>
                      <div className="text-[10px] text-muted-foreground font-mono pt-1 border-t border-border/40 flex justify-between">
                        <span>Cost:</span>
                        <strong className="text-foreground">
                          {isComplimentary
                            ? 'Complimentary'
                            : `${formatGHS(addon.price || 0)} / ${addon.billing_cycle === 'one_time' ? 'setup' : 'mo'}`}
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card flex items-center justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>
              Store front-ends automatically enforce these access gates in real-time via <code className="text-foreground font-mono">/tenant/features</code>.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onClose} className="px-4 text-xs font-semibold">
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
