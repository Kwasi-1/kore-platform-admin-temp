import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  getPlatformTenantsPaginated, 
  Tenant 
} from '@/api/platform';
import { useCurrency } from '@/hooks/useCurrency';
import { formatShortDate } from '@/utils/date';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { getPlanConfig } from '@/config/plans';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { ColumnDef } from '@tanstack/react-table';
import { 
  Search, 
  Plus, 
  ExternalLink,
  ChevronDown,
  MoreHorizontal,
  Edit3,
  ShieldAlert,
  RefreshCw,
  X,
  Eye
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import EditPlanModal from '@/components/tenants/EditPlanModal';
import TenantStatusModal from '@/components/tenants/TenantStatusModal';
import clsx from 'clsx';
import PageLayout from '@/components/layout/PageLayout';

export default function TenantList() {
  const navigate = useNavigate();
  const { formatGHS } = useCurrency();

  // Filters & Pagination State
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchInput, setSearchInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pageIndex, setPageIndex] = useState<number>(0);
  const pageSize = 10;

  // Selected Tenant for Modals
  const [editPlanTenant, setEditPlanTenant] = useState<Tenant | null>(null);
  const [statusTenant, setStatusTenant] = useState<Tenant | null>(null);

  // 300ms Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setPageIndex(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPageIndex(0);
  };

  // React Query fetch
  const { data: serverData, isLoading, isFetching } = useQuery({
    queryKey: ['platform_tenants', planFilter, statusFilter, searchQuery, pageIndex],
    queryFn: () => getPlatformTenantsPaginated({
      page: pageIndex + 1,
      limit: pageSize,
      plan: planFilter === 'all' ? undefined : planFilter,
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: searchQuery || undefined,
    }),
    retry: false,
  });

  // Active data resolution
  const displayTenants = serverData?.tenants || [];
  const pageCount = serverData?.page_count || 1;

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
        const cfg = getPlanConfig(plan);
        return <Badge className={cfg.badgeClassName}>{cfg.label}</Badge>;
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
        return <span className="text-muted-foreground font-medium">{formatShortDate(dateStr)}</span>;
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const tenant = row.original;
        return (
          <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg hover:bg-muted/80 data-[state=open]:bg-muted"
                >
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={() => navigate(`/tenants/${tenant.id}`)}
                  className="cursor-pointer text-xs"
                >
                  <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setEditPlanTenant(tenant)}
                  className="cursor-pointer text-xs"
                >
                  <Edit3 className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  Edit Plan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setStatusTenant(tenant)}
                  className={clsx(
                    "cursor-pointer text-xs font-medium",
                    tenant.is_active ? "text-red-600 focus:text-red-600 focus:bg-red-500/10" : "text-green-600 focus:text-green-600 focus:bg-green-500/10"
                  )}
                >
                  {tenant.is_active ? (
                    <>
                      <ShieldAlert className="mr-2 h-3.5 w-3.5" />
                      Suspend Tenant
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-3.5 w-3.5" />
                      Reactivate Tenant
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <PageLayout
      title="Tenants"
      subtitle="Manage and provision business storefront merchants."
      actions={(
        <Button 
          onClick={() => navigate('/tenants/new')}
          className="bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add Tenant
        </Button>
      )}
    >
      <div className="space-y-6">
        {/* Filter Bar Card */}
        <div className="bg-card space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            
            {/* Plan Filter Tabs */}
            <div className="flex bg-secondary p-1 rounded-xl w-full sm:w-fit overflow-x-auto scrollbar-hide">
              {plans.map((p) => (
                <button
                  key={p.value}
                  onClick={() => { setPlanFilter(p.value); setPageIndex(0); }}
                  className={clsx(
                    "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap",
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
              {/* Minimalistic Debounced Search Input */}
              <Input
                type="text"
                placeholder="Search business name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                startContent={<Search className="h-3.5 w-3.5 text-muted-foreground/70" />}
                endContent={
                  isFetching && searchQuery ? (
                    <Spinner className="h-3 w-3" />
                  ) : searchInput ? (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Clear search"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  ) : null
                }
                className="h-9 text-xs w-full sm:w-64 rounded-full border border-input/60 focus:border-foreground bg-background/50 ring-0 transition-all"
              />

              {/* Status Select */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPageIndex(0); }}
                  className="h-9 px-3 pr-8 rounded-xl border border-input/60 bg-card text-foreground text-xs font-medium focus:outline-none w-32 appearance-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>

            </div>
          </div>
        </div>

        {/* Tenants Table Section */}
        <div className="bg-card border border-border rounded-xl p-4 relative min-h-[320px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Spinner className="py-2" />
              <p className="text-xs text-muted-foreground font-medium">Loading merchants list...</p>
            </div>
          ) : (
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
            />
          )}
        </div>
      </div>

      {/* Action Modals */}
      <EditPlanModal
        isOpen={Boolean(editPlanTenant)}
        onClose={() => setEditPlanTenant(null)}
        tenant={editPlanTenant}
      />

      <TenantStatusModal
        isOpen={Boolean(statusTenant)}
        onClose={() => setStatusTenant(null)}
        tenant={statusTenant}
      />
    </PageLayout>
  );
}
