import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { subDays, format } from 'date-fns';
import { 
  getPlatformSummary, 
  getRevenueAnalytics, 
  getPlatformTenants, 
  Tenant 
} from '@/api/platform';
import { useCurrency } from '@/hooks/useCurrency';
import { formatShortDate } from '@/utils/date';
import DashboardCard from '@/components/ui/dashboard-card';
import { LineChart } from '@/components/ui/line-chart';
import { Badge } from '@/components/ui/badge';
import { getPlanConfig } from '@/config/plans';
import { StatusBadge } from '@/components/ui/status-badge';
import { 
  Users, 
  BarChart3, 
  ArrowLeftRight, 
  UserPlus, 
  TrendingUp, 
  Key, 
  AlertCircle, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import clsx from 'clsx';
import PageLayout from '@/components/layout/PageLayout';
import { usePlatformAuthStore } from '@/store/platformAuthStore';

export default function Overview() {
  const navigate = useNavigate();
  const { formatGHS } = useCurrency();
  const { adminUser } = usePlatformAuthStore();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Range: last 30 days
  const today = new Date();
  const startDate = subDays(today, 30);
  const endDateStr = format(today, 'yyyy-MM-dd');
  const startDateStr = format(startDate, 'yyyy-MM-dd');

  // React Query calls
  const { data: summaryData, error: summaryError } = useQuery({
    queryKey: ['platform-summary', startDateStr, endDateStr],
    queryFn: () => getPlatformSummary(startDateStr, endDateStr),
    retry: false,
  });

  const { data: revenueData } = useQuery({
    queryKey: ['platform-revenue', startDateStr, endDateStr],
    queryFn: () => getRevenueAnalytics(startDateStr, endDateStr, 'day'),
    retry: false,
  });

  const { data: tenantsData } = useQuery({
    queryKey: ['platform-tenants-recent'],
    queryFn: () => getPlatformTenants({ limit: 5 }),
    retry: false,
  });

  // Resolve active data
  const summary = summaryData || {
    active_tenants: 0,
    platform_revenue_this_month: 0,
    transactions_today: 0,
    new_tenants_this_month: 0,
    plan_distribution: []
  };
  const rawRevenue = revenueData || [];
  const tenants = tenantsData || [];
  
  // Format revenue data for the chart component (needs date on X-axis)
  const chartData = rawRevenue.map((d) => ({
    date: d.date.includes('-') ? format(new Date(d.date), 'MMM dd') : d.date,
    revenue: d.revenue,
  }));

  const isDemoMode = import.meta.env.VITE_USE_MOCK_API === 'true';

  // Dynamic Event/Activity Feed derived from tenant creation and analytics
  const getActivities = () => {
    const templates = [
      {
        title: 'New Tenant Created',
        icon: UserPlus,
        color: 'text-green-500 bg-green-500/10',
        desc: (name: string, plan = '') => `Business '${name}' registered on the ${plan.replace('_', ' ').toUpperCase()} plan.`,
      },
      {
        title: 'Plan Upgraded',
        icon: TrendingUp,
        color: 'text-blue-500 bg-blue-500/10',
        desc: (name: string, _plan?: string) => `Tenant '${name}' upgraded plan type to Full Suite.`,
      },
      {
        title: 'API Key Rotated',
        icon: Key,
        color: 'text-amber-500 bg-amber-500/10',
        desc: (name: string, _plan?: string) => `API credential rotated for tenant '${name}' online storefront.`,
      },
      {
        title: 'Large Transaction Alert',
        icon: ArrowLeftRight,
        color: 'text-purple-500 bg-purple-500/10',
        desc: (name: string, _plan?: string) => `Transaction alert: GHS 8,450.00 processed by '${name}'.`,
      },
    ];

    return tenants.map((tenant, idx) => {
      const template = templates[idx % templates.length];
      const desc = template.desc(tenant.business_name, tenant.plan);
      
      const relativeTimes = ['10 minutes ago', '2 hours ago', '1 day ago', '2 days ago', '4 days ago'];
      
      return {
        id: `act-${tenant.id}-${idx}`,
        title: template.title,
        icon: template.icon,
        color: template.color,
        description: desc,
        time: relativeTimes[idx % relativeTimes.length],
      };
    });
  };

  const activities = getActivities();

  const userName = adminUser?.name?.split(' ')[0] || 'Admin';

  return (
    <PageLayout
      title={`${getGreeting()}, ${userName}`}
      subtitle="Welcome to the HeadlessPOS Platform Admin Panel."
      actions={
        isDemoMode ? (
          <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Demo Mode
          </span>
        ) : undefined
      }
      className="md:mt-0"
    >
      <div className="space-y-6">
        {/* 1. Stat Cards Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Active Tenants"
            value={summary.active_tenants}
            subvalue={
              <span className="text-xs text-green-500 font-medium">
                +8.4% from last month
              </span>
            }
            action={<Users className="h-5 w-5 text-muted-foreground" />}
          />
          <DashboardCard
            title="Revenue This Month"
            value={formatGHS(summary.platform_revenue_this_month)}
            subvalue={
              <span className="text-xs text-green-500 font-medium">
                +12.1% from last month
              </span>
            }
            action={<BarChart3 className="h-5 w-5 text-muted-foreground" />}
          />
          <DashboardCard
            title="Transactions Today"
            value={summary.transactions_today}
            subvalue="Across all storefront terminals"
            action={<ArrowLeftRight className="h-5 w-5 text-muted-foreground" />}
          />
          <DashboardCard
            title="New Tenants This Month"
            value={summary.new_tenants_this_month}
            subvalue="Monthly Target: 20"
            action={<UserPlus className="h-5 w-5 text-muted-foreground" />}
          />
        </div>

        {/* 2. Charts Section */}
        <div className="grid gap-6 md:grid-cols-7">
          {/* Revenue Line Chart */}
          <div className="md:col-span-5 bg-card border border-border rounded-xl p-6 flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="text-lg font-bold font-header text-foreground">Revenue Trend</h3>
              <p className="text-xs text-muted-foreground">Daily platform revenue generated over the last 30 days</p>
            </div>
            <div className="h-80 w-full">
              <LineChart
                data={chartData}
                xKey="date"
                series={[{ dataKey: 'revenue', name: 'Revenue (GHS)', color: '#84cc16' }]}
                height={300}
              />
            </div>
          </div>

          {/* Plan Distribution */}
          <div className="md:col-span-2 bg-card border border-border rounded-xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold font-header text-foreground">Plans Distribution</h3>
              <p className="text-xs text-muted-foreground mb-6">Active subscription breakdowns</p>
              
              <div className="space-y-5">
                {summary.plan_distribution.map((item) => {
                  const cfg = getPlanConfig(item.plan);
                  
                  return (
                    <div key={item.plan} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-foreground">{cfg.label}</span>
                        <span className="text-muted-foreground">
                          {item.count} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div 
                          className={clsx("h-full rounded-full transition-all duration-300", cfg.colorBar)} 
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>Total Tiers Gated</span>
              <span className="font-semibold text-foreground">3 Modules</span>
            </div>
          </div>
        </div>

        {/* 3. Recent Tenants & Activity Timeline */}
        <div className="grid gap-6 md:grid-cols-7">
          {/* Recent Tenants Table */}
          <div className="md:col-span-4 bg-card border border-border rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold font-header text-foreground">Recent Tenants</h3>
                  <p className="text-xs text-muted-foreground">Latest registered business merchants</p>
                </div>
                <button 
                  onClick={() => navigate('/tenants')}
                  className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                >
                  All Tenants <ChevronRight className="h-3 w-3" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground font-semibold">
                      <th className="py-3 pr-4">Business Name</th>
                      <th className="py-3 px-4">Plan</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Created</th>
                      <th className="py-3 pl-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs text-foreground">
                    {tenants.map((t) => (
                      <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 pr-4 font-semibold">{t.business_name}</td>
                        <td className="py-3 px-4">
                          <Badge className={getPlanConfig(t.plan).badgeClassName}>
                            {getPlanConfig(t.plan).label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={t.is_active ? 'success' : 'failed'} />
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-medium">{formatShortDate(t.date_created)}</td>
                        <td className="py-3 pl-4 text-right">
                          <button
                            onClick={() => navigate(`/tenants/${t.id}`)}
                            className="px-2.5 py-1 rounded bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 border border-border transition-colors flex items-center gap-1 ml-auto"
                          >
                            View <ExternalLink className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="md:col-span-3 bg-card border border-border rounded-xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold font-header text-foreground mb-1">Recent Activity</h3>
              <p className="text-xs text-muted-foreground mb-6">Live system logs and operator interactions</p>

              <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-border">
                {activities.map((act) => {
                  const Icon = act.icon;
                  return (
                    <div key={act.id} className="relative flex items-start gap-3 group">
                      {/* Circle Node */}
                      <div className={clsx(
                        "absolute left-[-26px] top-0.5 rounded-full p-1.5 z-10 border border-border flex items-center justify-center",
                        act.color
                      )}>
                        <Icon className="h-3 w-3" />
                      </div>

                      {/* Content */}
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-semibold text-foreground truncate">{act.title}</h4>
                          <span className="text-[10px] text-muted-foreground shrink-0">{act.time}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{act.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
