import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getPlatformTenantDetail, 
  rotateTenantApiKey, 
  TenantDetailResponse 
} from '@/api/platform';
import { useCurrency } from '@/hooks/useCurrency';
import { formatShortDate, formatDateTime } from '@/utils/date';
import { getPlanConfig } from '@/config/plans';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Spinner } from '@/components/ui/spinner';
import DashboardCard from '@/components/ui/dashboard-card';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import ApiKeyRevealModal from '@/components/tenants/ApiKeyRevealModal';
import EditPlanModal from '@/components/tenants/EditPlanModal';
import TenantStatusModal from '@/components/tenants/TenantStatusModal';
import { 
  ChevronLeft, 
  Edit3, 
  RotateCw, 
  ShieldAlert, 
  ShieldCheck, 
  ExternalLink, 
  Globe,
  Building,
  User,
  Activity,
  BarChart3,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { toast } from 'react-hot-toast';
import PageLayout from '@/components/layout/PageLayout';

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const isDemoMode = import.meta.env.VITE_USE_MOCK_API === 'true';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatGHS } = useCurrency();

  // Modal states
  const [isRotateConfirmOpen, setIsRotateConfirmOpen] = useState(false);
  const [isRevealOpen, setIsRevealOpen] = useState(false);
  const [isEditPlanOpen, setIsEditPlanOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Generated Key Reveal
  const [newApiKey, setNewApiKey] = useState('');

  // Fetch tenant details
  const { data: serverDetailData, isLoading, error } = useQuery({
    queryKey: ['platform_tenant_detail', id],
    queryFn: () => getPlatformTenantDetail(id || ''),
    enabled: !!id,
    retry: false,
  });

  const rotateKeyMutation = useMutation({
    mutationFn: () => rotateTenantApiKey(id || ''),
    onSuccess: (data) => {
      setNewApiKey(data.api_key);
      setIsRevealOpen(true);
      queryClient.invalidateQueries({ queryKey: ['platform_tenant_detail', id] });
    },
    onError: () => {
      toast.error('Failed to rotate API Key.');
    }
  });

  const handleRotateKey = async () => {
    rotateKeyMutation.mutate();
    setIsRotateConfirmOpen(false);
  };

  if (isLoading || !serverDetailData) {
    return (
      <PageLayout
        title="Tenant Overview"
        subtitle="Loading merchant details..."
      >
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center min-h-[360px] gap-3">
          <Spinner className="py-2" />
          <p className="text-xs text-muted-foreground font-medium">Fetching merchant profile & telemetry data...</p>
        </div>
      </PageLayout>
    );
  }

  const { tenant, metrics, owner, recent_transactions, storefront_deployment, staff } = serverDetailData;

  return (
    <PageLayout
      title={tenant.business_name}
      subtitle={`Tenant ID: ${tenant.id}`}
      actions={(
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditPlanOpen(true)}
            className="h-9 flex items-center gap-1.5 text-xs font-semibold"
          >
            <Edit3 className="h-3.5 w-3.5" /> Edit Plan
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRotateConfirmOpen(true)}
            className="h-9 flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 border-amber-500/20"
          >
            <RotateCw className="h-3.5 w-3.5" /> Rotate API Key
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsStatusModalOpen(true)}
            className={tenant.is_active 
              ? "h-9 flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 border-red-500/20"
              : "h-9 flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400 hover:bg-green-500/10 border-green-500/20"
            }
          >
            {tenant.is_active ? (
              <>
                <ShieldAlert className="h-3.5 w-3.5" /> Suspend
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" /> Reactivate
              </>
            )}
          </Button>

          {/* Quick Actions Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-lg">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setIsEditPlanOpen(true)} className="cursor-pointer text-xs">
                <Edit3 className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                Change Subscription Plan
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsRotateConfirmOpen(true)} className="cursor-pointer text-xs">
                <RotateCw className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                Rotate Credentials
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setIsStatusModalOpen(true)} 
                className={tenant.is_active ? "cursor-pointer text-xs text-red-600 focus:text-red-600" : "cursor-pointer text-xs text-green-600 focus:text-green-600"}
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
      )}
    >
      <div className="space-y-6">
        {/* Back Header & Title Row */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => navigate('/tenants')}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors w-fit"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Tenants
          </button>

          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold font-header tracking-tight text-foreground">
              {tenant.business_name}
            </h2>
            <Badge className={getPlanConfig(tenant.plan).badgeClassName}>
              {getPlanConfig(tenant.plan).label}
            </Badge>
            <Badge variant={tenant.is_active ? 'success' : 'danger'}>
              {tenant.is_active ? 'Active' : 'Suspended'}
            </Badge>
            {isDemoMode && (
              <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Demo
              </span>
            )}
          </div>
        </div>

        {/* 1. Stat Cards Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="All Time Revenue"
            value={formatGHS(metrics.total_revenue)}
            subvalue="Accrued from online + POS terminals"
            action={<Building className="h-5 w-5 text-muted-foreground" />}
          />
          <DashboardCard
            title="Total Transactions"
            value={metrics.total_transactions}
            subvalue="Completed checkouts logged"
            action={<Activity className="h-5 w-5 text-muted-foreground" />}
          />
          <DashboardCard
            title="Staff Count"
            value={metrics.staff_count}
            subvalue="Assigned cashier & admin roles"
            action={<User className="h-5 w-5 text-muted-foreground" />}
          />
          <DashboardCard
            title="Revenue This Month"
            value={formatGHS(metrics.monthly_revenue)}
            subvalue="Current calendar month volume"
            action={<BarChart3 className="h-5 w-5 text-muted-foreground" />}
          />
        </div>

        {/* 2. Two Column Section */}
        <div className="grid gap-6 md:grid-cols-7">
          
          {/* Left Column: Info Cards */}
          <div className="space-y-6 md:col-span-3">
            
            {/* Business Details Card */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground font-header pb-2 border-b border-border">
                Business Profile
              </h3>
              
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Business Name:</span>
                  <span className="font-semibold text-foreground">{tenant.business_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Plan:</span>
                  <span className="font-semibold text-foreground">{getPlanConfig(tenant.plan).label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">System Status:</span>
                  <span className="font-semibold">
                    {tenant.is_active ? (
                      <span className="text-green-600 dark:text-green-400 font-semibold">Active</span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400 font-semibold">Suspended</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created Date:</span>
                  <span className="font-semibold text-foreground">{formatShortDate(tenant.date_created)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">API Prefix:</span>
                  <code className="font-mono text-foreground font-semibold">
                    hpos_live_{tenant.api_key_prefix}...
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paystack Subaccount:</span>
                  <span className="font-mono text-foreground font-semibold">
                    {tenant.paystack_subaccount_code || 'None Configured'}
                  </span>
                </div>
              </div>
            </div>

            {/* Owner Info Card */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground font-header pb-2 border-b border-border">
                Owner Details
              </h3>
              
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Owner Name:</span>
                  <span className="font-semibold text-foreground">{owner.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email Address:</span>
                  <span className="font-semibold text-foreground">{owner.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone Number:</span>
                  <span className="font-semibold text-foreground">{owner.phone || 'N/A'}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Deployment & Transactions */}
          <div className="space-y-6 md:col-span-4">
            
            {/* Storefront Deployment Card */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground font-header pb-2 border-b border-border">
                Storefront Deployment
              </h3>

              {storefront_deployment ? (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Live Endpoint:</span>
                    <a 
                      href={storefront_deployment.vercel_url}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      {storefront_deployment.vercel_url} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Template ID:</span>
                    <span className="font-semibold text-foreground">{storefront_deployment.template_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deployed At:</span>
                    <span className="font-semibold text-foreground">{formatDateTime(storefront_deployment.deployed_at)}</span>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">No storefront generated yet</p>
                  <p className="text-[11px] text-muted-foreground/70 max-w-xs mx-auto">
                    Provision a headless Vue/React storefront for this tenant.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2 text-xs h-8">
                    <Globe className="h-3.5 w-3.5 mr-1" /> Generate Storefront
                  </Button>
                </div>
              )}
            </div>

            {/* Recent Transactions Table */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground font-header pb-2 border-b border-border">
                Recent Transactions
              </h3>

              {recent_transactions.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground bg-muted/10 rounded-lg border border-dashed border-border">
                  No transactions recorded yet for this tenant.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground font-semibold">
                        <th className="py-2.5 pr-2">Date</th>
                        <th className="py-2.5 px-2">Amount</th>
                        <th className="py-2.5 px-2">Channel</th>
                        <th className="py-2.5 px-2">Method</th>
                        <th className="py-2.5 pl-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-foreground">
                      {recent_transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 pr-2 text-muted-foreground font-medium">{formatShortDate(tx.date)}</td>
                          <td className="py-2.5 px-2 font-semibold">{formatGHS(tx.amount)}</td>
                          <td className="py-2.5 px-2 uppercase font-medium">{tx.channel}</td>
                          <td className="py-2.5 px-2 capitalize">{tx.payment_method.replace('_', ' ')}</td>
                          <td className="py-2.5 pl-2 text-right">
                            <StatusBadge status={tx.status} className="rounded" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* 3. Staff List Section */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground font-header pb-2 border-b border-border">
              Registered Staff Members
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1">
              Read-only list of active merchant operators and terminal roles.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-semibold">
                  <th className="py-3 pr-4">Staff Name</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 pl-4 text-right">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {staff.map((st) => (
                  <tr key={st.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 pr-4 font-semibold">{st.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{st.email}</td>
                    <td className="py-3 px-4">
                      <Badge variant={st.role === 'owner' ? 'outline-primary' : st.role === 'manager' ? 'info' : 'secondary'}>
                        {st.role.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={st.is_active ? 'success' : 'cancelled'} />
                    </td>
                    <td className="py-3 pl-4 text-right text-muted-foreground font-medium">
                      {st.last_login ? formatDateTime(st.last_login) : 'Never logged in'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rotate Key Confirmation Dialog */}
        <ConfirmDialog
          isOpen={isRotateConfirmOpen}
          onClose={() => setIsRotateConfirmOpen(false)}
          onConfirm={handleRotateKey}
          title="Confirm API Key Rotation"
          description="This will immediately invalidate the current key. Any systems using it will stop working until updated. Continue?"
          confirmLabel="Rotate Key"
          isDanger={true}
          isLoading={rotateKeyMutation.isPending}
        />

        {/* Key Reveal Modal */}
        <ApiKeyRevealModal
          isOpen={isRevealOpen}
          onClose={() => setIsRevealOpen(false)}
          apiKey={newApiKey}
          tenantName={tenant.business_name}
          tenantPlan={tenant.plan}
        />

        {/* Reusable Action Modals */}
        <EditPlanModal
          isOpen={isEditPlanOpen}
          onClose={() => setIsEditPlanOpen(false)}
          tenant={tenant}
        />

        <TenantStatusModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          tenant={tenant}
        />
      </div>
    </PageLayout>
  );
}
