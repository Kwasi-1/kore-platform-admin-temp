import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  getPlatformTenantsPaginated, 
  updateTenant, 
  Tenant 
} from '@/api/platform';
import { useCurrency } from '@/hooks/useCurrency';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ColumnDef } from '@tanstack/react-table';
import { 
  Search, 
  Plus, 
  Filter, 
  ExternalLink,
  ChevronDown 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';
import PageLayout from '@/components/layout/PageLayout';

export default function TenantList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatGHS } = useCurrency();

  // Filters & Pagination State
  const [planFilter, setPlanFilter] = React.useState<string>('all');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [pageIndex, setPageIndex] = React.useState<number>(0);
  const pageSize = 10;
  const isDemoMode = import.meta.env.VITE_USE_MOCK_API === 'true';

  // React Query fetch
  const { data: serverData, isLoading } = useQuery({
    queryKey: ['platform-tenants', planFilter, statusFilter, searchQuery, pageIndex],
    queryFn: () => getPlatformTenantsPaginated({
      page: pageIndex + 1,
      limit: pageSize,
      plan: planFilter === 'all' ? undefined : planFilter,
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: searchQuery || undefined,
    }),
    retry: false,
  });

  // Mutator for tenant status updates
  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => 
      updateTenant(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
    },
  });

  // Active data resolution
  const displayTenants = serverData?.tenants || [];
  const pageCount = serverData?.page_count || 1;

  // Toggle activation status
  const handleToggleStatus = (tenant: Tenant) => {
    const newStatus = !tenant.is_active;

    toggleMutation.mutate({ id: tenant.id, is_active: newStatus }, {
      onSuccess: () => {
        toast.success(`Tenant '${tenant.business_name}' status updated to ${newStatus ? 'Active' : 'Suspended'}.`);
      },
      onError: () => {
        toast.error('Failed to update tenant status.');
      }
    });
  };

  // Plan filtering tab options
  const plans = [
    { label: 'All', value: 'all' },
    { label: 'Starter', value: 'starter' },
    { label: 'Standard', value: 'standard' },
    { label: 'Business', value: 'business' },
    { label: 'Ecom Only', value: 'ecom_only' },
  ];


  // Column definitions for the DataTable
  const columns: ColumnDef<Tenant>[] = [
    {
      accessorKey: 'business_name',
      header: 'Business Name',
      cell: ({ row }) => {
        const tenant = row.original;
        return (
          <span className="font-bold text-foreground group-hover:text-primary transition-colors">
            {tenant.business_name}
          </span>
        );
      },
    },
    {
      accessorKey: 'plan',
      header: 'Plan',
      cell: ({ row }) => {
        const plan = row.getValue('plan') as string;
        const planConfig: Record<string, { label: string; className: string }> = {
          starter:  { label: 'Starter',  className: 'bg-blue-100/30 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-transparent' },
          standard: { label: 'Standard', className: 'bg-yellow-100/30 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-transparent' },
          business: { label: 'Business', className: 'bg-green-100/30 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-transparent' },
          ecom_only: { label: 'Ecom Only', className: 'bg-purple-100/30 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-transparent' },
        };
        const cfg = planConfig[plan] || { label: plan, className: 'bg-muted text-muted-foreground border-transparent' };
        return <Badge className={cfg.className}>{cfg.label}</Badge>;
      },

    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.getValue('is_active') as boolean;
        return (
          <Badge variant={isActive ? 'success' : 'danger'}>
            {isActive ? 'Active' : 'Suspended'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'api_key_prefix',
      header: 'API Prefix',
      cell: ({ row }) => {
        const prefix = row.getValue('api_key_prefix') as string || 'ab12';
        return (
          <code className="text-xs font-mono text-muted-foreground/80">
            hpos_live_{prefix}...
          </code>
        );
      },
    },
    {
      accessorKey: 'monthly_revenue',
      header: 'Monthly Revenue',
      cell: ({ row }) => {
        const amount = row.getValue('monthly_revenue') as number || 0;
        return <span className="font-medium">{formatGHS(amount)}</span>;
      },
    },
    {
      accessorKey: 'transaction_count',
      header: 'Transactions',
      cell: ({ row }) => {
        const count = row.getValue('transaction_count') as number || 0;
        return <span className="text-muted-foreground">{count.toLocaleString()}</span>;
      },
    },
    {
      accessorKey: 'date_created',
      header: 'Created',
      cell: ({ row }) => {
        const dateStr = row.getValue('date_created') as string;
        return <span className="text-muted-foreground">{dateStr}</span>;
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const tenant = row.original;
        return (
          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/tenants/${tenant.id}`)}
              className="h-8 flex items-center gap-1"
            >
              View <ExternalLink className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleStatus(tenant)}
              className={clsx(
                "h-8 font-medium min-w-[90px]",
                tenant.is_active 
                  ? "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20" 
                  : "text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20"
              )}
            >
              {tenant.is_active ? 'Suspend' : 'Activate'}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <PageLayout title="Tenants" subtitle="Manage and provision business storefront merchants." actions={ (
        <Button 
          onClick={() => navigate('/tenants/new')}
          className="bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-1"
        >
          <Plus className="h-4 w-4" /> Add Tenant
        </Button>
      )} >
    <div className="space-y-6">

      {/* Filter Bar Card */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          
          {/* Plan Filter Tabs */}
          <div className="flex bg-secondary p-1 rounded-xl w-full sm:w-fit overflow-x-auto scrollbar-hide">
            {plans.map((p) => (
              <button
                key={p.value}
                onClick={() => { setPlanFilter(p.value); setPageIndex(0); }}
                className={clsx(
                  "px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap",
                  planFilter === p.value 
                    ? "bg-card text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Search & Status Filters */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by business name..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPageIndex(0); }}
                className="pl-10 h-10 rounded-xl"
              />
            </div>

            {/* Status Dropdown */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPageIndex(0); }}
                className="h-10 px-3 pr-8 rounded-xl border border-input bg-card text-foreground text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary w-36 appearance-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>

          </div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-card border border-border rounded-xl p-4">
        <DataTable
          columns={columns}
          data={displayTenants}
          enablePagination={true}
          enableColumnVisibility={false}
          manualPagination={true}
          pageIndex={pageIndex}
          pageSize={pageSize}
          pageCount={pageCount}
          onPageIndexChange={setPageIndex}
          onRowClick={(row) => navigate(`/tenants/${row.id}`)}
          loading={isLoading}
        />
      </div>
    </div>
    </PageLayout>
  );
}
