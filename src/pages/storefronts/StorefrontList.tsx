import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getPlatformStorefronts, 
  updateStorefrontStatus, 
  StorefrontItem 
} from '@/api/platform';
import { useCurrency } from '@/hooks/useCurrency';
import PageLayout from '@/components/layout/PageLayout';
import DashboardCard from '@/components/ui/dashboard-card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { getPlanConfig } from '@/config/plans';
import ProvisionStorefrontModal from '@/components/storefronts/ProvisionStorefrontModal';
import { 
  Globe, 
  Store, 
  ExternalLink, 
  Search, 
  Sparkles, 
  Activity, 
  ShoppingBag, 
  CheckCircle, 
  AlertTriangle, 
  Power,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';

const unescapeName = (str: string) => {
  return (str || '').replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
};

export default function StorefrontList() {
  const navigate = useNavigate();
  const { formatGHS } = useCurrency();
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [provisionModalOpen, setProvisionModalOpen] = React.useState(false);
  const [selectedTenantForModal, setSelectedTenantForModal] = React.useState<string | undefined>(undefined);

  // Fetch Storefronts list & eligible tenants
  const { data: serverData, isLoading } = useQuery({
    queryKey: ['platform-storefronts', search, statusFilter],
    queryFn: () => getPlatformStorefronts({ search, status: statusFilter }),
    retry: false,
  });

  const summary = serverData?.summary;
  const storefronts = serverData?.storefronts ?? [];
  const eligibleTenants = serverData?.eligible_tenants ?? [];

  // Count pending storefront requests (tenants on Ecom/Business without storefronts)
  const pendingRequests = React.useMemo(() => {
    return eligibleTenants.filter((t) => !t.has_storefront && t.is_recommended);
  }, [eligibleTenants]);

  // Mutation to toggle status
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'maintenance' | 'unpublished' }) =>
      updateStorefrontStatus(id, status),
    onSuccess: () => {
      toast.success('Storefront status updated.');
      queryClient.invalidateQueries({ queryKey: ['platform-storefronts'] });
    },
    onError: () => {
      toast.error('Failed to update status.');
    },
  });

  const handleOpenProvision = (tenantId?: string) => {
    if (tenantId) {
      navigate(`/storefronts/generate?tenant_id=${tenantId}`);
    } else {
      navigate('/storefronts/generate');
    }
  };

  const statusOptions = [
    { label: 'All Stores', value: 'all' },
    { label: 'Active Live', value: 'active' },
    { label: 'Maintenance', value: 'maintenance' },
    { label: 'Unpublished', value: 'unpublished' },
  ];

  return (
    <PageLayout
      title="Storefront Management"
      subtitle="Deploy, configure, and monitor digital web storefronts and custom domains for merchants."
      actions={
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate('/storefronts/generate')}
            className="font-bold text-xs h-10 px-4 flex items-center gap-2 rounded-xl"
          >
            <Sparkles className="h-4 w-4" /> AI Generate Storefront
          </Button>
        </div>
      }
    >
      <div className="space-y-6">

        {/* Pending Requests Alert Banner */}
        {pendingRequests.length > 0 && (
          <div className="bg-card border border-border/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-muted text-foreground flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  {pendingRequests.length} Merchant Storefront {pendingRequests.length === 1 ? 'Upgrade Available' : 'Upgrades Available'}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Merchants on Business & Ecom plans ready for storefront deployment: {pendingRequests.map(t => unescapeName(t.business_name)).join(', ')}.
                </p>
              </div>
            </div>

            <Button
              onClick={() => navigate(`/storefronts/generate?tenant_id=${pendingRequests[0].tenant_id}`)}
              className="bg-foreground text-background hover:bg-foreground/90 rounded-lg text-xs font-bold px-3 h-8 shrink-0"
            >
              Generate for {unescapeName(pendingRequests[0].business_name)}
            </Button>
          </div>
        )}

        {/* 1. Stat Cards Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Total Storefronts"
            value={isLoading ? <Spinner /> : (summary?.total_storefronts ?? 0).toLocaleString()}
            // subvalue="Configured merchant web stores"
            action={<Store className="h-5 w-5 text-muted-foreground" />}
          />
          <DashboardCard
            title="Active Live Stores"
            value={isLoading ? <Spinner /> : (summary?.active_stores ?? 0).toLocaleString()}
            // subvalue="Storefronts accepting online orders"
            action={<CheckCircle className="h-5 w-5 text-muted-foreground" />}
          />
          <DashboardCard
            title="Custom Domains"
            value={isLoading ? <Spinner /> : (summary?.custom_domains_count ?? 0).toLocaleString()}
            // subvalue="Verified custom domains connected"
            action={<Globe className="h-5 w-5 text-muted-foreground" />}
          />
          <DashboardCard
            title="Total Web GMV"
            value={isLoading ? <Spinner /> : formatGHS(summary?.total_web_gmv ?? 0)}
            // subvalue="Sales volume via online store checkouts"
            action={<Activity className="h-5 w-5 text-muted-foreground" />}
          />
        </div>

        {/* 2. Controls & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="w-full sm:w-[320px] relative">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search storefront name, tenant, or domain…"
              startContent={<Search className="h-4 w-4 text-muted-foreground" />}
              className="rounded-xl h-10 text-xs"
            />
          </div>

          {/* Filter Status selector */}
          <div className="flex bg-secondary p-1 rounded-xl h-10">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={clsx(
                  "px-3 rounded-lg text-xs font-semibold transition-all duration-200",
                  statusFilter === opt.value
                    ? "bg-card text-foreground shadow-xs ring-1 ring-border/50"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Storefronts Cards Directory */}
        {isLoading ? (
          <div className="h-64 bg-card border border-border rounded-xl flex items-center justify-center">
            <Spinner />
          </div>
        ) : storefronts.length === 0 ? (
          <div className="bg-card border border-border/70 rounded-xl p-12 text-center space-y-3 shadow-xs">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-foreground font-header">No Deployed Storefronts Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Get started by provisioning a digital web storefront for an active merchant on the platform.
            </p>
            <Button
              onClick={() => handleOpenProvision()}
              variant="outline"
              className="rounded-xl font-bold text-xs h-9 px-4 mt-2 border-border"
            >
              <Plus className="h-4 w-4 mr-1" /> Provision First Storefront
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 bg-card border border-border/70 rounded-xl p-6">
            {storefronts.map((store) => {
              const planCfg = getPlanConfig(store.tenant_plan);
              const isLive = store.status === 'active';
              return (
                <div
                  key={store.id}
                  className="bg-card border border-border/70 rounded-xl p-5 space-y-4 shadow-xs flex flex-col justify-between hover:border-foreground/30 transition-all group"
                >
                  <div className="space-y-3">
                    {/* Header: Store Name & Plan */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-foreground font-header transition-colors">
                          {unescapeName(store.tenant_name)}
                        </h4>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {store.subdomain}
                        </p>
                      </div>

                      <Badge className={planCfg.badgeClassName}>{planCfg.label}</Badge>
                    </div>

                    {/* Status & Custom Domain Badges */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className={clsx(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        isLive 
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      )}>
                        <span className={clsx("h-1.5 w-1.5 rounded-full", isLive ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
                        {store.status}
                      </span>

                      {store.custom_domain ? (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-muted/60 text-foreground border border-border px-2.5 py-0.5 rounded-full font-medium">
                          <ShieldCheck className="h-3 w-3" /> {store.custom_domain}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground bg-muted/40 border border-border/50 px-2 py-0.5 rounded-full">
                          Template: {store.template_id}
                        </span>
                      )}
                    </div>

                    {/* Performance metrics row */}
                    <div className="grid grid-cols-2 gap-2 bg-muted/30 rounded-md p-2.5 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Web Orders</span>
                        <p className="font-bold text-foreground">{store.orders_count.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Online GMV</span>
                        <p className="font-bold text-foreground">{formatGHS(store.online_gmv)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                    <a
                      href={store.storefront_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:underline"
                    >
                      Visit Store <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          statusMutation.mutate({
                            id: store.id,
                            status: isLive ? 'maintenance' : 'active',
                          })
                        }
                        className="rounded-lg h-8 text-[11px] font-semibold px-2.5 border-border"
                      >
                        <Power className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                        {isLive ? 'Pause' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Provisioning Wizard Modal */}
        <ProvisionStorefrontModal
          isOpen={provisionModalOpen}
          onClose={() => setProvisionModalOpen(false)}
          eligibleTenants={eligibleTenants}
          defaultTenantId={selectedTenantForModal}
        />

      </div>
    </PageLayout>
  );
}
