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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { getPlanConfig } from '@/config/plans';
import ProvisionStorefrontModal from '@/components/storefronts/ProvisionStorefrontModal';
import EnhancedTableComponent, { TableColumn } from '@/components/shared/MainTableComponent';
import { 
  Globe, 
  Store, 
  ExternalLink, 
  Sparkles, 
  Activity, 
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

  const statusFilterOptions = [
    { name: 'All Stores', uid: 'all' },
    { name: 'Active Live', uid: 'active' },
    { name: 'Maintenance', uid: 'maintenance' },
    { name: 'Unpublished', uid: 'unpublished' },
  ];

  const columns: TableColumn[] = [
    { key: 'store', label: 'Store & Merchant' },
    { key: 'plan', label: 'Plan' },
    { key: 'storefront_url', label: 'Live Storefront' },
    { key: 'template', label: 'Template' },
    { key: 'orders_count', label: 'Web Orders' },
    { key: 'online_gmv', label: 'Online GMV' },
    { key: 'status', label: 'Status' },
  ];

  const defaultRowActions = [
    {
      key: 'visit',
      label: 'Visit Live Store',
      icon: 'heroicons:arrow-top-right-on-square',
    },
    {
      key: 'edit_ai',
      label: 'AI Re-Generate / Edit',
      icon: 'heroicons:sparkles',
    },
    {
      key: 'toggle_status',
      label: 'Toggle Status',
      icon: 'heroicons:power',
    },
  ];

  const rows = React.useMemo(() => {
    return storefronts.map((store: StorefrontItem) => {
      const planCfg = getPlanConfig(store.tenant_plan);
      const isLive = store.status === 'active';
      const isMaintenance = store.status === 'maintenance';
      const isLinea = store.template_id === 'linea-luxury';

      return {
        id: store.id,
        store: (
          <div className="flex flex-col py-0.5">
            <span className="font-bold text-foreground text-xs md:text-sm font-header">
              {unescapeName(store.tenant_name)}
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">
              {store.subdomain}
            </span>
          </div>
        ),
        plan: (
          <Badge className={clsx("text-[10px] px-2 py-0.5 font-bold uppercase", planCfg.badgeClassName)}>
            {planCfg.label}
          </Badge>
        ),
        storefront_url: (
          <div className="flex items-center gap-1.5 max-w-[240px]">
            {store.custom_domain ? (
              <a
                href={`https://${store.custom_domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono font-semibold text-muted-foreground hover:underline truncate inline-flex items-center gap-1"
                title={`https://${store.custom_domain}`}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">{store.custom_domain}</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
              </a>
            ) : (
              <a
                href={store.storefront_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono font-semibold text-muted-foreground  hover:underline truncate inline-flex items-center gap-1"
                title={store.storefront_url}
              >
                <span className="truncate">{store.storefront_url}</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
              </a>
            )}
          </div>
        ),
        template: (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted/60 text-foreground border border-border">
            <span className={clsx("h-2 w-2 rounded-full", isLinea ? "bg-amber-500" : "bg-blue-500")} />
            {isLinea ? 'Linea Luxe' : 'Vetshore Flow'}
          </div>
        ),
        orders_count: (
          <span className="font-bold text-xs text-foreground">
            {store.orders_count.toLocaleString()}
          </span>
        ),
        online_gmv: (
          <span className="font-bold text-xs text-foreground">
            {formatGHS(store.online_gmv)}
          </span>
        ),
        status: (
          <span className={clsx(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
            isLive 
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              : isMaintenance
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              : "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20"
          )}>
            <span className={clsx("h-1.5 w-1.5 rounded-full", isLive ? "bg-emerald-500 animate-pulse" : isMaintenance ? "bg-amber-500" : "bg-neutral-400")} />
            {store.status}
          </span>
        ),
        rowActions: [
          {
            key: 'visit',
            label: 'Visit Live Store',
            icon: 'heroicons:arrow-top-right-on-square',
          },
          {
            key: 'edit_ai',
            label: 'AI Re-Generate / Edit',
            icon: 'heroicons:sparkles',
          },
          {
            key: 'toggle_status',
            label: isLive ? 'Pause Storefront' : 'Activate Storefront',
            icon: 'heroicons:power',
            className: isLive ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400',
          },
        ],
        __record: store
      };
    });
  }, [storefronts, formatGHS]);

  const handleRowActionClick = (actionKey: string, row: any) => {
    const store = row.__record as StorefrontItem;
    if (actionKey === 'visit') {
      window.open(store.storefront_url, '_blank');
    } else if (actionKey === 'edit_ai') {
      navigate(`/storefronts/generate?tenant_id=${store.tenant_id}`);
    } else if (actionKey === 'toggle_status') {
      const isLive = store.status === 'active';
      statusMutation.mutate({
        id: store.id,
        status: isLive ? 'maintenance' : 'active',
      });
    }
  };

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
            action={<Store className="h-5 w-5 text-muted-foreground" />}
          />
          <DashboardCard
            title="Active Live Stores"
            value={isLoading ? <Spinner /> : (summary?.active_stores ?? 0).toLocaleString()}
            action={<CheckCircle className="h-5 w-5 text-muted-foreground" />}
          />
          <DashboardCard
            title="Custom Domains"
            value={isLoading ? <Spinner /> : (summary?.custom_domains_count ?? 0).toLocaleString()}
            action={<Globe className="h-5 w-5 text-muted-foreground" />}
          />
          <DashboardCard
            title="Total Web GMV"
            value={isLoading ? <Spinner /> : formatGHS(summary?.total_web_gmv ?? 0)}
            action={<Activity className="h-5 w-5 text-muted-foreground" />}
          />
        </div>

        {/* 2. Main Storefront Table with Dropdown Actions */}
        <EnhancedTableComponent
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          rowActions={defaultRowActions}
          onRowActionClick={handleRowActionClick}
          
          showTopContent={true}
          
          showSearch={true}
          searchPlaceholder="Search storefront, tenant, or domain…"
          searchValue={search}
          onSearchChange={setSearch}

          showFilter={true}
          filterLabel="Status"
          filterOptions={statusFilterOptions}
          filterValue={new Set([statusFilter])}
          onFilterChange={(keys) => {
            const val = Array.from(keys)[0] as string;
            setStatusFilter(val || 'all');
          }}

          showAddButton={true}
          addButtonText="Generate Storefront"
          addButtonIcon="ph:sparkle-bold"
          onAddButtonClick={() => navigate('/storefronts/generate')}

          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['platform-storefronts'] })}
        />

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

