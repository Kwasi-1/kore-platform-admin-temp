import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getPlatformTenantDetail, 
  rotateTenantApiKey, 
  updateTenant, 
  TenantDetailResponse 
} from '@/api/platform';
import { useCurrency } from '@/hooks/useCurrency';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import DashboardCard from '@/components/ui/dashboard-card';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import ApiKeyRevealModal from '@/components/tenants/ApiKeyRevealModal';
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
  UserCheck,
  Check,
  X,
  BarChart3
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const isDemoMode = import.meta.env.VITE_USE_MOCK_API === 'true';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatGHS } = useCurrency();

  // Dialog & Modal states
  const [isRotateConfirmOpen, setIsRotateConfirmOpen] = React.useState(false);
  const [isSuspendConfirmOpen, setIsSuspendConfirmOpen] = React.useState(false);
  const [isReactivateConfirmOpen, setIsReactivateConfirmOpen] = React.useState(false);
  const [isRevealOpen, setIsRevealOpen] = React.useState(false);
  
  // Inline Plan editing
  const [isEditingPlan, setIsEditingPlan] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<string>('');

  // Generated Key Reveal
  const [newApiKey, setNewApiKey] = React.useState('');

  // Fetch tenant details
  const { data: serverDetailData, isLoading, error } = useQuery({
    queryKey: ['platform-tenant-detail', id],
    queryFn: () => getPlatformTenantDetail(id || ''),
    enabled: !!id,
    retry: false,
  });

  // Fallback Mock Data (Demo Mode)
  const fallbackDetail: TenantDetailResponse = {
    tenant: {
      id: id || 'tn-01',
      business_name: "Kofi's Provisions",
      plan: 'full_suite',
      is_active: true,
      date_created: '2026-06-01',
      api_key_prefix: 'ab12',
      paystack_subaccount_code: 'ACCT_890283x782',
    },
    metrics: {
      total_revenue: 148500,
      total_transactions: 3420,
      staff_count: 5,
      monthly_revenue: 12500,
    },
    owner: {
      name: 'Kofi Mensah',
      email: 'kofi.mensah@provisions.gh',
      phone: '+233241234567',
    },
    recent_transactions: [
      { id: 'tx-101', date: '2026-06-04 10:15', amount: 150, channel: 'pos', payment_method: 'cash', status: 'success' },
      { id: 'tx-102', date: '2026-06-04 09:30', amount: 480, channel: 'online', payment_method: 'mobile_money', status: 'success' },
      { id: 'tx-103', date: '2026-06-03 16:45', amount: 220, channel: 'pos', payment_method: 'card', status: 'success' },
      { id: 'tx-104', date: '2026-06-03 14:10', amount: 95, channel: 'pos', payment_method: 'cash', status: 'success' },
      { id: 'tx-105', date: '2026-06-03 11:20', amount: 1100, channel: 'online', payment_method: 'card', status: 'failed' },
      { id: 'tx-106', date: '2026-06-02 15:30', amount: 350, channel: 'pos', payment_method: 'mobile_money', status: 'success' },
      { id: 'tx-107', date: '2026-06-02 12:15', amount: 80, channel: 'pos', payment_method: 'cash', status: 'success' },
      { id: 'tx-108', date: '2026-06-01 17:00', amount: 940, channel: 'online', payment_method: 'mobile_money', status: 'success' },
      { id: 'tx-109', date: '2026-06-01 14:45', amount: 120, channel: 'pos', payment_method: 'cash', status: 'success' },
      { id: 'tx-110', date: '2026-06-01 10:30', amount: 280, channel: 'pos', payment_method: 'card', status: 'success' },
    ],
    storefront_deployment: {
      vercel_url: 'https://kofis-provisions.hpos.shop',
      template_name: 'Premium Minimalist Grocery',
      deployed_at: '2026-06-01 14:00',
    },
    staff: [
      { id: 'st-01', name: 'Kofi Mensah', email: 'kofi.mensah@provisions.gh', role: 'owner', is_active: true, last_login: '2026-06-04 08:30' },
      { id: 'st-02', name: 'Ama Serwaa', email: 'ama@provisions.gh', role: 'manager', is_active: true, last_login: '2026-06-04 07:15' },
      { id: 'st-03', name: 'Yaw Boateng', email: 'yaw@provisions.gh', role: 'cashier', is_active: true, last_login: '2026-06-03 18:00' },
      { id: 'st-04', name: 'Esi Ampah', email: 'esi@provisions.gh', role: 'cashier', is_active: true, last_login: '2026-06-03 14:45' },
      { id: 'st-05', name: 'Kojo Addo', email: 'kojo@provisions.gh', role: 'cashier', is_active: false, last_login: '2026-05-28 16:30' },
    ],
  };

  React.useEffect(() => {
    if (serverDetailData) {
      setSelectedPlan(serverDetailData.tenant.plan);
    }
  }, [serverDetailData]);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: (updates: Partial<typeof fallbackDetail.tenant>) => 
      updateTenant(id || '', updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-tenant-detail', id] });
    },
  });

  const rotateKeyMutation = useMutation({
    mutationFn: () => rotateTenantApiKey(id || ''),
    onSuccess: (data) => {
      setNewApiKey(data.api_key);
      setIsRevealOpen(true);
      queryClient.invalidateQueries({ queryKey: ['platform-tenant-detail', id] });
    },
    onError: () => {
      toast.error('Failed to rotate API Key.');
    }
  });

  // Action handlers
  const handleEditPlan = async () => {
    updateMutation.mutate({ plan: selectedPlan as any }, {
      onSuccess: () => {
        toast.success('Subscription plan updated.');
        setIsEditingPlan(false);
      },
      onError: () => {
        toast.error('Failed to update plan.');
      }
    });
  };

  const handleRotateKey = async () => {
    rotateKeyMutation.mutate();
    setIsRotateConfirmOpen(false);
  };

  const handleSuspend = async (reason?: string) => {
    updateMutation.mutate({ is_active: false }, {
      onSuccess: () => {
        toast.success('Tenant suspended successfully.');
        setIsSuspendConfirmOpen(false);
      },
      onError: () => {
        toast.error('Failed to suspend tenant.');
      }
    });
  };

  const handleReactivate = async () => {
    updateMutation.mutate({ is_active: true }, {
      onSuccess: () => {
        toast.success('Tenant reactivated successfully.');
        setIsReactivateConfirmOpen(false);
      },
      onError: () => {
        toast.error('Failed to reactivate tenant.');
      }
    });
  };

  const getPlanName = (plan: string) => {
    if (plan === 'full_suite') return 'Full Suite';
    if (plan === 'ecommerce_only') return 'Ecommerce Only';
    return 'POS Only';
  };

  const getPlanBadgeVariant = (plan: string) => {
    if (plan === 'full_suite') return 'outline-primary';
    if (plan === 'ecommerce_only') return 'info';
    return 'secondary';
  };

  if (isLoading || !serverDetailData) {
    return (
      <div className="flex h-72 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-muted border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-medium tracking-wide">Loading tenant details…</p>
        </div>
      </div>
    );
  }

  const { tenant, metrics, owner, recent_transactions, storefront_deployment, staff } = serverDetailData;

  return (
    <div className="space-y-6">
      {/* Back Header */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => navigate('/tenants')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors w-fit"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Tenants
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tenant Title & Badges */}
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold font-header tracking-tight text-foreground">
              {tenant.business_name}
            </h2>
            <Badge variant={getPlanBadgeVariant(tenant.plan)}>
              {getPlanName(tenant.plan)}
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

          {/* Action Row */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingPlan(true)}
              className="h-9 flex items-center gap-1.5"
            >
              <Edit3 className="h-4 w-4" /> Edit Plan
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRotateConfirmOpen(true)}
              className="h-9 flex items-center gap-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-500/5 dark:hover:bg-amber-500/10"
            >
              <RotateCw className="h-4 w-4" /> Rotate API Key
            </Button>

            {tenant.is_active ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSuspendConfirmOpen(true)}
                className="h-9 flex items-center gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-500/5 dark:hover:bg-red-500/10"
              >
                <ShieldAlert className="h-4 w-4" /> Suspend
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReactivateConfirmOpen(true)}
                className="h-9 flex items-center gap-1.5 text-green-500 hover:text-green-600 hover:bg-green-500/5 dark:hover:bg-green-500/10"
              >
                <ShieldCheck className="h-4 w-4" /> Reactivate
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Inline Plan Editor Overlay */}
      {isEditingPlan && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Select New Plan:</span>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="h-9 px-3 rounded-lg border border-input bg-card text-foreground text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary w-48 appearance-none cursor-pointer"
            >
              <option value="pos_only">POS Only</option>
              <option value="ecommerce_only">Ecommerce Only</option>
              <option value="full_suite">Full Suite</option>
            </select>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="ghost" size="sm" onClick={() => setIsEditingPlan(false)} className="h-8">
              <X className="h-4 w-4" /> Cancel
            </Button>
            <Button size="sm" onClick={handleEditPlan} className="bg-primary text-primary-foreground h-8 flex items-center gap-1">
              <Check className="h-4 w-4" /> Save Plan
            </Button>
          </div>
        </div>
      )}

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
        <div className="md:col-span-3 space-y-6">
          
          {/* Business Info Card */}
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
                <span className="font-semibold text-foreground">{getPlanName(tenant.plan)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">System Status:</span>
                <span className="font-semibold">
                  {tenant.is_active ? (
                    <span className="text-green-500">Active</span>
                  ) : (
                    <span className="text-red-500">Suspended</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created Date:</span>
                <span className="font-semibold text-foreground">{tenant.date_created}</span>
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

        {/* Right Column: Transactions & Deployments */}
        <div className="md:col-span-4 space-y-6">
          
          {/* Storefront Deployment */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground font-header pb-2 border-b border-border">
              Storefront Deployment
            </h3>

            {storefront_deployment ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-muted-foreground block">Production URL:</span>
                    <a 
                      href={storefront_deployment.vercel_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary font-semibold hover:underline flex items-center gap-1 text-sm font-header"
                    >
                      {storefront_deployment.vercel_url} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="text-muted-foreground block">Template:</span>
                    <span className="font-semibold text-foreground">{storefront_deployment.template_name}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] text-muted-foreground">
                    Deployed at: {storefront_deployment.deployed_at}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.success('Storefront regeneration triggered (Phase 3).')}
                    className="h-8 text-xs font-semibold"
                  >
                    Regenerate Storefront
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-foreground">No storefront generated yet</span>
                  <p className="text-[11px] text-muted-foreground">Provision a headless Vue/React storefront for this tenant.</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate(`/storefronts/generate?tenant_id=${tenant.id}`)}
                  className="bg-primary text-primary-foreground h-8 font-semibold text-xs"
                >
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
                      <td className="py-2.5 pr-2 text-muted-foreground">{tx.date}</td>
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
                  <td className="py-3 pl-4 text-right text-muted-foreground">
                    {st.last_login || 'Never logged in'}
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

      {/* Suspend Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isSuspendConfirmOpen}
        onClose={() => setIsSuspendConfirmOpen(false)}
        onConfirm={handleSuspend}
        title="Suspend Tenant Account"
        description="Provide a reason for suspending this tenant. They will lose access to register terminals and online checkouts immediately."
        confirmLabel="Suspend Tenant"
        showReasonInput={true}
        reasonPlaceholder="e.g. Delinquent account or plan violation..."
        isDanger={true}
        isLoading={updateMutation.isPending}
      />

      {/* Reactivate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isReactivateConfirmOpen}
        onClose={() => setIsReactivateConfirmOpen(false)}
        onConfirm={handleReactivate}
        title="Reactivate Tenant Account"
        description="Are you sure you want to reactivate Kwame's Provisions? Access to their POS and ecommerce storefronts will be restored immediately."
        confirmLabel="Reactivate Account"
        isDanger={false}
        isLoading={updateMutation.isPending}
      />

      {/* API Key Reveal Modal */}
      {newApiKey && (
        <ApiKeyRevealModal
          isOpen={isRevealOpen}
          apiKey={newApiKey}
          tenantName={tenant.business_name}
          tenantPlan={tenant.plan}
          onDone={() => {
            setIsRevealOpen(false);
            setNewApiKey('');
          }}
        />
      )}
    </div>
  );
}
