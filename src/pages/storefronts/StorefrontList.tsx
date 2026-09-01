import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getPlatformStorefronts, 
  updateStorefrontStatus, 
  deleteStorefront,
  bulkUpdateStorefrontStatus,
  bulkDeleteStorefronts,
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
import EnhancedTableComponent, { TableColumn, TopContentAction } from '@/components/shared/MainTableComponent';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
  Trash2,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';

const unescapeName = (str: string) => {
  return (str || '').replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
};

interface ConfirmModalState {
  isOpen: boolean;
  type: 'pause' | 'activate' | 'delete' | 'bulk_pause' | 'bulk_activate' | 'bulk_delete';
  targetStore?: StorefrontItem;
  targetIds?: string[];
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  variant: 'default' | 'danger' | 'warning';
}

export default function StorefrontList() {
  const navigate = useNavigate();
  const { formatGHS } = useCurrency();
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [selectedKeys, setSelectedKeys] = React.useState<any>(new Set([]));
  const [provisionModalOpen, setProvisionModalOpen] = React.useState(false);
  const [selectedTenantForModal, setSelectedTenantForModal] = React.useState<string | undefined>(undefined);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = React.useState<ConfirmModalState>({
    isOpen: false,
    type: 'pause',
    title: '',
    description: null,
    confirmLabel: 'Confirm',
    variant: 'default',
  });

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

  // Mutation to toggle single status
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'maintenance' | 'unpublished' }) =>
      updateStorefrontStatus(id, status),
    onSuccess: () => {
      toast.success('Storefront status updated.');
      queryClient.invalidateQueries({ queryKey: ['platform-storefronts'] });
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to update status.');
    },
  });

  // Mutation to delete single storefront
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteStorefront(id),
    onSuccess: (msg) => {
      toast.success(typeof msg === 'string' ? msg : 'Storefront decommissioned successfully. POS remains active.');
      queryClient.invalidateQueries({ queryKey: ['platform-storefronts'] });
      setSelectedKeys(new Set([]));
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to delete storefront.');
    },
  });

  // Mutation for bulk status update
  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: 'active' | 'maintenance' | 'unpublished' }) =>
      bulkUpdateStorefrontStatus(ids, status),
    onSuccess: (msg) => {
      toast.success(typeof msg === 'string' ? msg : 'Selected storefronts updated.');
      queryClient.invalidateQueries({ queryKey: ['platform-storefronts'] });
      setSelectedKeys(new Set([]));
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to update selected storefronts.');
    },
  });

  // Mutation for bulk delete
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteStorefronts(ids),
    onSuccess: (msg) => {
      toast.success(typeof msg === 'string' ? msg : 'Selected storefronts decommissioned.');
      queryClient.invalidateQueries({ queryKey: ['platform-storefronts'] });
      setSelectedKeys(new Set([]));
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to delete selected storefronts.');
    },
  });

  // Helper to extract selected IDs
  const getSelectedStoreIds = React.useCallback((): string[] => {
    if (selectedKeys === 'all') {
      return storefronts.map((s) => s.id);
    }
    if (selectedKeys instanceof Set) {
      return Array.from(selectedKeys).map(String);
    }
    return [];
  }, [selectedKeys, storefronts]);

  // Export selected / all storefronts to CSV
  const exportStorefrontsCSV = (selectedIds?: string[]) => {
    const itemsToExport = selectedIds && selectedIds.length > 0
      ? storefronts.filter((s) => selectedIds.includes(s.id))
      : storefronts;

    if (itemsToExport.length === 0) {
      toast.error('No storefronts available to export');
      return;
    }

    const headers = ['Merchant Name', 'Slug', 'Plan', 'Template', 'Subdomain', 'Custom Domain', 'Live URL', 'Orders Count', 'Online GMV (GHS)', 'Status'];
    const csvRows = itemsToExport.map((s) => [
      `"${unescapeName(s.tenant_name).replace(/"/g, '""')}"`,
      `"${s.tenant_slug}"`,
      `"${s.tenant_plan}"`,
      `"${s.template_id}"`,
      `"${s.subdomain}"`,
      `"${s.custom_domain || ''}"`,
      `"${s.storefront_url}"`,
      s.orders_count,
      s.online_gmv.toFixed(2),
      `"${s.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `storefronts_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${itemsToExport.length} storefront(s) to CSV`);
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
    {
      key: 'delete_storefront',
      label: 'Delete Storefront Only',
      icon: 'heroicons:trash',
      className: 'text-danger',
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
                className="text-xs font-mono font-semibold text-muted-foreground hover:underline truncate inline-flex items-center gap-1"
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
          {
            key: 'delete_storefront',
            label: 'Delete Storefront Only',
            icon: 'heroicons:trash',
            className: 'text-danger font-medium',
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
      if (isLive) {
        setConfirmModal({
          isOpen: true,
          type: 'pause',
          targetStore: store,
          title: `Pause Storefront for ${unescapeName(store.tenant_name)}?`,
          description: `Are you sure you want to put this storefront into Maintenance Mode? Online visitors to ${store.subdomain} will temporarily not be able to browse or place orders.`,
          confirmLabel: "Pause Storefront",
          variant: "warning",
        });
      } else {
        statusMutation.mutate({
          id: store.id,
          status: 'active',
        });
      }
    } else if (actionKey === 'delete_storefront') {
      setConfirmModal({
        isOpen: true,
        type: 'delete',
        targetStore: store,
        title: `Delete Online Storefront for ${unescapeName(store.tenant_name)}?`,
        description: (
          <div className="space-y-3 text-xs text-muted-foreground">
            <p>
              This will decommission and delete the digital web storefront deployment (<strong className="text-foreground font-mono">{store.subdomain}</strong>).
            </p>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-400 font-medium">
              ✅ <strong>Safe Decommission</strong>: The merchant&apos;s in-person POS registers, product catalog, sales receipts, staff, and inventory will remain 100% active and untouched.
            </div>
          </div>
        ),
        confirmLabel: "Delete Storefront Only",
        variant: "danger",
      });
    }
  };

  // Dynamic Floating Action Bar actions for multi-row selection
  const selectionActions: TopContentAction[] = React.useMemo(() => {
    const selectedIds = getSelectedStoreIds();
    if (selectedIds.length === 0) return [];

    const selectedStores = storefronts.filter((s) => selectedIds.includes(s.id));
    const activeStores = selectedStores.filter((s) => s.status === 'active');
    const inactiveStores = selectedStores.filter((s) => s.status !== 'active');

    const actions: TopContentAction[] = [];

    // Show 'Activate' only if there are inactive/maintenance stores selected
    if (inactiveStores.length > 0) {
      actions.push({
        title: inactiveStores.length === selectedStores.length ? "Activate" : `Activate (${inactiveStores.length})`,
        icon: "ph:check-circle-bold",
        onPress: () => {
          const idsToActivate = inactiveStores.map((s) => s.id);
          setConfirmModal({
            isOpen: true,
            type: 'bulk_activate',
            targetIds: idsToActivate,
            title: `Activate ${idsToActivate.length} Storefront(s)?`,
            description: `This will bring ${idsToActivate.length} selected merchant storefront(s) to live Active status.`,
            confirmLabel: "Activate Stores",
            variant: "default",
          });
        },
      });
    }

    // Show 'Pause' only if there are active live stores selected
    if (activeStores.length > 0) {
      actions.push({
        title: activeStores.length === selectedStores.length ? "Pause" : `Pause (${activeStores.length})`,
        icon: "ph:pause-circle-bold",
        onPress: () => {
          const idsToPause = activeStores.map((s) => s.id);
          setConfirmModal({
            isOpen: true,
            type: 'bulk_pause',
            targetIds: idsToPause,
            title: `Pause ${idsToPause.length} Storefront(s)?`,
            description: `Are you sure you want to put ${idsToPause.length} selected storefront(s) into Maintenance mode? Customers will temporarily be unable to browse or place orders.`,
            confirmLabel: "Pause Stores",
            variant: "warning",
          });
        },
      });
    }

    // Always provide Export CSV
    actions.push({
      title: "Export CSV",
      icon: "ph:download-simple-bold",
      onPress: () => {
        exportStorefrontsCSV(selectedIds);
      },
    });

    // Delete
    actions.push({
      title: "Delete",
      icon: "ph:trash-bold",
      onPress: () => {
        setConfirmModal({
          isOpen: true,
          type: 'bulk_delete',
          targetIds: selectedIds,
          title: `Decommission ${selectedIds.length} Storefront(s)?`,
          description: (
            <div className="space-y-3 text-xs text-muted-foreground">
              <p>
                This will permanently delete the online storefront deployments for {selectedIds.length} selected store(s).
              </p>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-400 font-medium">
                ✅ Physical in-store POS, cashiers, stock, and sales records will continue operating without interruption.
              </div>
            </div>
          ),
          confirmLabel: "Decommission Stores",
          variant: "danger",
        });
      },
    });

    return actions;
  }, [selectedKeys, storefronts, getSelectedStoreIds]);

  const handleConfirmAction = () => {
    if (confirmModal.type === 'pause' && confirmModal.targetStore) {
      statusMutation.mutate({
        id: confirmModal.targetStore.id,
        status: 'maintenance',
      });
    } else if (confirmModal.type === 'delete' && confirmModal.targetStore) {
      deleteMutation.mutate(confirmModal.targetStore.id);
    } else if (confirmModal.type === 'bulk_activate' && confirmModal.targetIds) {
      bulkStatusMutation.mutate({
        ids: confirmModal.targetIds,
        status: 'active',
      });
    } else if (confirmModal.type === 'bulk_pause' && confirmModal.targetIds) {
      bulkStatusMutation.mutate({
        ids: confirmModal.targetIds,
        status: 'maintenance',
      });
    } else if (confirmModal.type === 'bulk_delete' && confirmModal.targetIds) {
      bulkDeleteMutation.mutate(confirmModal.targetIds);
    }
  };

  const isActionPending =
    statusMutation.isPending ||
    deleteMutation.isPending ||
    bulkStatusMutation.isPending ||
    bulkDeleteMutation.isPending;

  return (
    <PageLayout
      title="Storefront Management"
      subtitle="Deploy, configure, and monitor digital web storefronts and custom domains for merchants."
      actions={
        <div className="flex items-center gap-2">
          <Button
            onClick={() => exportStorefrontsCSV()}
            variant="outline"
            className="font-semibold text-xs h-10 px-3.5 flex items-center gap-2 rounded-xl border-border"
          >
            Export All
          </Button>
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

        {/* 2. Main Storefront Table with Dropdown Actions & Multi-select Floating Bar */}
        <EnhancedTableComponent
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          rowActions={defaultRowActions}
          onRowActionClick={handleRowActionClick}
          
          selectionMode="multiple"
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          selectionActions={selectionActions}
          
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

        {/* Confirmation Modal */}
        <Dialog open={confirmModal.isOpen} onOpenChange={(open) => setConfirmModal((prev) => ({ ...prev, isOpen: open }))}>
          <DialogContent className="sm:max-w-md bg-card border border-border/80 rounded-2xl p-6 shadow-xl">
            <DialogHeader className="space-y-2">
              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                    confirmModal.variant === 'danger'
                      ? "bg-rose-500/10 text-rose-500"
                      : confirmModal.variant === 'warning'
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  {confirmModal.variant === 'danger' ? (
                    <Trash2 className="h-5 w-5" />
                  ) : confirmModal.variant === 'warning' ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                </div>
                <DialogTitle className="text-base font-bold font-header text-foreground text-left">
                  {confirmModal.title}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground pt-1 text-left">
                {confirmModal.description}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
              <Button
                variant="outline"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={isActionPending}
                className="rounded-xl text-xs font-semibold h-9 px-4 border-border"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmAction}
                disabled={isActionPending}
                className={clsx(
                  "rounded-xl text-xs font-bold h-9 px-4 gap-1.5",
                  confirmModal.variant === 'danger'
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : confirmModal.variant === 'warning'
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
                )}
              >
                {isActionPending ? <Spinner /> : confirmModal.confirmLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </PageLayout>
  );
}


