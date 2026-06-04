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

  // Mock Fallback Data (Demo / Offline mode)
  const fallbackTenantsList: Tenant[] = [
    { id: 'tn-01', business_name: "Kofi's Provisions", plan: 'full_suite', is_active: true, date_created: '2026-06-01', api_key_prefix: 'ab12', monthly_revenue: 12500, transaction_count: 340 },
    { id: 'tn-02', business_name: 'Accra Groceries', plan: 'pos_only', is_active: true, date_created: '2026-05-28', api_key_prefix: 'cd34', monthly_revenue: 8400, transaction_count: 210 },
    { id: 'tn-03', business_name: 'Osu Fashion Hub', plan: 'ecommerce_only', is_active: true, date_created: '2026-05-25', api_key_prefix: 'ef56', monthly_revenue: 6200, transaction_count: 150 },
    { id: 'tn-04', business_name: 'Kumasi Tech Store', plan: 'full_suite', is_active: true, date_created: '2026-05-20', api_key_prefix: 'gh78', monthly_revenue: 15400, transaction_count: 420 },
    { id: 'tn-05', business_name: 'Apex Pharmacy', plan: 'pos_only', is_active: false, date_created: '2026-05-18', api_key_prefix: 'ij90', monthly_revenue: 0, transaction_count: 0 },
    { id: 'tn-06', business_name: 'Tema Logistics', plan: 'full_suite', is_active: true, date_created: '2026-05-15', api_key_prefix: 'kl12', monthly_revenue: 22000, transaction_count: 510 },
    { id: 'tn-07', business_name: 'Spintex Bakery', plan: 'pos_only', is_active: true, date_created: '2026-05-12', api_key_prefix: 'mn34', monthly_revenue: 4300, transaction_count: 110 },
    { id: 'tn-08', business_name: 'East Legon Cafe', plan: 'ecommerce_only', is_active: true, date_created: '2026-05-10', api_key_prefix: 'op56', monthly_revenue: 9500, transaction_count: 280 },
    { id: 'tn-09', business_name: 'Labadi Beach Rentals', plan: 'pos_only', is_active: true, date_created: '2026-05-08', api_key_prefix: 'qr78', monthly_revenue: 3100, transaction_count: 85 },
    { id: 'tn-10', business_name: 'Cantonments Boutique', plan: 'full_suite', is_active: false, date_created: '2026-05-05', api_key_prefix: 'st90', monthly_revenue: 0, transaction_count: 0 },
    { id: 'tn-11', business_name: 'Airport Residential MiniMart', plan: 'pos_only', is_active: true, date_created: '2026-05-02', api_key_prefix: 'uv12', monthly_revenue: 11200, transaction_count: 305 },
    { id: 'tn-12', business_name: 'Ridge Dental Clinic', plan: 'ecommerce_only', is_active: true, date_created: '2026-04-28', api_key_prefix: 'wx34', monthly_revenue: 7200, transaction_count: 195 },
    { id: 'tn-13', business_name: 'West Hills Supermarket', plan: 'full_suite', is_active: true, date_created: '2026-04-25', api_key_prefix: 'yz56', monthly_revenue: 28400, transaction_count: 670 },
    { id: 'tn-14', business_name: 'Dansoman Bookshop', plan: 'pos_only', is_active: true, date_created: '2026-04-22', api_key_prefix: 'ab56', monthly_revenue: 2900, transaction_count: 70 },
    { id: 'tn-15', business_name: 'Madina Electronics', plan: 'ecommerce_only', is_active: true, date_created: '2026-04-18', api_key_prefix: 'cd78', monthly_revenue: 5600, transaction_count: 140 },
  ];

  const [localMockTenants, setLocalMockTenants] = React.useState<Tenant[]>(fallbackTenantsList);

  const isDemoMode = !serverData;

  // Locally apply filter/search for Demo Mode
  const filteredMockTenants = localMockTenants.filter((t) => {
    const matchesSearch = t.business_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = planFilter === 'all' || t.plan === planFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && t.is_active) || 
      (statusFilter === 'suspended' && !t.is_active);
    
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const pageCountMock = Math.ceil(filteredMockTenants.length / pageSize);
  const paginatedMockTenants = filteredMockTenants.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  // Active data resolution
  const displayTenants = serverData?.tenants || paginatedMockTenants;
  const pageCount = serverData ? (serverData.page_count || 1) : pageCountMock;

  // Toggle activation status
  const handleToggleStatus = (tenant: Tenant) => {
    const newStatus = !tenant.is_active;
    
    if (isDemoMode) {
      setLocalMockTenants(prev => 
        prev.map(t => t.id === tenant.id ? { ...t, is_active: newStatus } : t)
      );
      toast.success(`Tenant '${tenant.business_name}' status updated to ${newStatus ? 'Active' : 'Suspended'}.`);
      return;
    }

    toggleMutation.mutate({ id: tenant.id, is_active: newStatus }, {
      onSuccess: () => {
        toast.success(`Tenant '${tenant.business_name}' status updated.`);
      },
      onError: () => {
        toast.error('Failed to update tenant status.');
      }
    });
  };

  // Plan filtering tab options
  const plans = [
    { label: 'All', value: 'all' },
    { label: 'POS Only', value: 'pos_only' },
    { label: 'Ecommerce Only', value: 'ecommerce_only' },
    { label: 'Full Suite', value: 'full_suite' },
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
        if (plan === 'full_suite') return <Badge variant="success">Full Suite</Badge>;
        if (plan === 'ecommerce_only') {
          return (
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-transparent hover:bg-purple-200 dark:hover:bg-purple-800/40">
              Ecommerce Only
            </Badge>
          );
        }
        return <Badge variant="info">POS Only</Badge>;
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
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold font-header tracking-tight text-foreground">Tenants</h2>
            {isDemoMode && (
              <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Demo Mode
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Manage and provision business storefront merchants.</p>
        </div>
        <Button 
          onClick={() => navigate('/tenants/new')}
          className="bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-1"
        >
          <Plus className="h-4 w-4" /> Add Tenant
        </Button>
      </div>

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
  );
}
