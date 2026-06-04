import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  subDays, 
  differenceInDays, 
  format, 
  eachDayOfInterval, 
  eachWeekOfInterval, 
  eachMonthOfInterval,
  startOfDay,
  endOfDay
} from 'date-fns';
import { 
  getDetailedRevenueAnalytics, 
  PlatformRevenueDetails 
} from '@/api/platform';
import { useCurrency } from '@/hooks/useCurrency';
import { DateRangePicker, DateRangeValue } from '@/components/ui/date-range-picker';
import { BarChart } from '@/components/ui/bar-chart';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import DashboardCard from '@/components/ui/dashboard-card';
import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/ui/data-table';
import { 
  TrendingUp, 
  Percent, 
  Activity, 
  Building, 
  Award,
  Calendar,
  Layers,
  ChevronDown
} from 'lucide-react';
import clsx from 'clsx';

// Dynamic mock generator for Demo Mode
function generateMockRevenue(startDate: Date, endDate: Date, groupBy: string): PlatformRevenueDetails {
  const daysDiff = Math.max(1, differenceInDays(endDate, startDate) + 1);

  // Generate chart data based on group_by
  let chartData: { date: string; revenue: number; fees: number }[] = [];
  
  if (groupBy === 'month') {
    const intervals = eachMonthOfInterval({ start: startDate, end: endDate });
    chartData = intervals.map(date => {
      const rev = Math.floor(180000 + Math.random() * 120000);
      return {
        date: format(date, 'MMM yyyy'),
        revenue: rev,
        fees: Math.round(rev * 0.015), // 1.5% fee
      };
    });
  } else if (groupBy === 'week') {
    const intervals = eachWeekOfInterval({ start: startDate, end: endDate });
    chartData = intervals.map(date => {
      const rev = Math.floor(45000 + Math.random() * 25000);
      return {
        date: `Wk of ${format(date, 'MMM dd')}`,
        revenue: rev,
        fees: Math.round(rev * 0.015),
      };
    });
  } else {
    // default: day
    const intervals = eachDayOfInterval({ start: startDate, end: endDate });
    chartData = intervals.map(date => {
      const rev = Math.floor(4500 + Math.random() * 6500);
      return {
        date: format(date, 'MMM dd'),
        revenue: rev,
        fees: Math.round(rev * 0.015),
      };
    });
  }

  // Calculate stats aggregates
  const totalRevenue = chartData.reduce((acc, curr) => acc + curr.revenue, 0);
  const platformFees = Math.round(totalRevenue * 0.015);
  const avgDailyRevenue = Math.round(totalRevenue / daysDiff);

  // Tenant breakdown details
  const tenantsList = [
    { name: "Kofi's Provisions", plan: 'full_suite' as const, revenueFactor: 0.38, transFactor: 1.1 },
    { name: "Accra Groceries", plan: 'pos_only' as const, revenueFactor: 0.22, transFactor: 0.8 },
    { name: "Osu Fashion Hub", plan: 'ecommerce_only' as const, revenueFactor: 0.16, transFactor: 0.6 },
    { name: "Kumasi Tech Store", plan: 'full_suite' as const, revenueFactor: 0.14, transFactor: 0.9 },
    { name: "Tema Logistics", plan: 'full_suite' as const, revenueFactor: 0.10, transFactor: 0.7 },
  ];

  const tenantBreakdown = tenantsList.map((t, idx) => {
    const tenantRev = Math.round(totalRevenue * t.revenueFactor);
    const transCount = Math.max(1, Math.round(tenantRev / (65 + Math.random() * 35)));
    const avgTrans = Math.round((tenantRev / transCount) * 100) / 100;
    return {
      tenant_id: `tn-mock-${idx + 1}`,
      tenant_name: t.name,
      plan: t.plan,
      total_revenue: tenantRev,
      transaction_count: transCount,
      avg_transaction_value: avgTrans,
    };
  });

  // Top tenant identification
  const sortedTenants = [...tenantBreakdown].sort((a, b) => b.total_revenue - a.total_revenue);
  const topTenant = sortedTenants[0] || { tenant_name: 'None', total_revenue: 0 };

  // Plan revenue distributions
  const planBreakdown = {
    pos_only_revenue: tenantBreakdown.filter(t => t.plan === 'pos_only').reduce((a, b) => a + b.total_revenue, 0),
    ecommerce_only_revenue: tenantBreakdown.filter(t => t.plan === 'ecommerce_only').reduce((a, b) => a + b.total_revenue, 0),
    full_suite_revenue: tenantBreakdown.filter(t => t.plan === 'full_suite').reduce((a, b) => a + b.total_revenue, 0),
  };

  return {
    chart_data: chartData,
    summary: {
      total_revenue: totalRevenue,
      platform_fees: platformFees,
      avg_daily_revenue: avgDailyRevenue,
      top_tenant_name: topTenant.tenant_name,
      top_tenant_revenue: topTenant.total_revenue,
    },
    plan_breakdown: planBreakdown,
    tenant_breakdown: tenantBreakdown,
  };
}

export default function Revenue() {
  const { formatGHS } = useCurrency();

  // 1. Controls state: default last 30 days
  const [dateRange, setDateRange] = React.useState<DateRangeValue>(() => {
    const today = new Date();
    return {
      startDate: startOfDay(subDays(today, 29)),
      endDate: endOfDay(today),
    };
  });

  const [groupBy, setGroupBy] = React.useState<'day' | 'week' | 'month'>('day');

  // 2. Query Hook
  const startDateStr = format(dateRange.startDate, 'yyyy-MM-dd');
  const endDateStr = format(dateRange.endDate, 'yyyy-MM-dd');

  const { data: serverData, isLoading } = useQuery({
    queryKey: ['platform-revenue-detailed', startDateStr, endDateStr, groupBy],
    queryFn: () => getDetailedRevenueAnalytics(startDateStr, endDateStr, groupBy),
    retry: false,
  });

  const isDemoMode = !serverData;

  // Resolve active data
  const localData = React.useMemo(() => {
    if (serverData) return serverData;
    return generateMockRevenue(dateRange.startDate, dateRange.endDate, groupBy);
  }, [serverData, dateRange.startDate, dateRange.endDate, groupBy]);

  const { summary, chart_data, plan_breakdown, tenant_breakdown } = localData;

  // 3. DataTable column definitions
  const columns: ColumnDef<typeof tenant_breakdown[0]>[] = [
    {
      accessorKey: 'tenant_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Merchant Name" />
      ),
      cell: ({ row }) => (
        <span className="font-bold text-foreground group-hover:text-primary transition-colors">
          {row.original.tenant_name}
        </span>
      ),
    },
    {
      accessorKey: 'plan',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Plan Tier" />
      ),
      cell: ({ row }) => {
        const plan = row.original.plan;
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
      accessorKey: 'total_revenue',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total Revenue" />
      ),
      cell: ({ row }) => <span className="font-semibold text-foreground">{formatGHS(row.original.total_revenue)}</span>,
    },
    {
      accessorKey: 'transaction_count',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Transactions" />
      ),
      cell: ({ row }) => <span className="text-muted-foreground font-medium">{row.original.transaction_count.toLocaleString()}</span>,
    },
    {
      accessorKey: 'avg_transaction_value',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Avg Ticket Size" />
      ),
      cell: ({ row }) => <span className="text-muted-foreground font-medium">{formatGHS(row.original.avg_transaction_value)}</span>,
    },
  ];

  // Map group selections
  const groupByOptions = [
    { label: 'Day', value: 'day' as const },
    { label: 'Week', value: 'week' as const },
    { label: 'Month', value: 'month' as const },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold font-header tracking-tight text-foreground">Revenue Analytics</h2>
            {isDemoMode && (
              <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Demo Mode
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor transaction volumes, commission earnings, and merchant performance.
          </p>
        </div>

        {/* Date controls and grouping */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Date Picker */}
          <div className="w-full sm:w-[320px]">
            <DateRangePicker
              value={dateRange}
              onChange={(val) => val && setDateRange(val)}
              labelPlacement="outside"
              label="Selected Period"
            />
          </div>

          {/* Group By selector */}
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-foreground mb-2">Interval</span>
            <div className="flex bg-secondary p-1 rounded-xl border border-border h-10 w-full sm:w-auto">
              {groupByOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setGroupBy(opt.value)}
                  className={clsx(
                    "px-4 rounded-lg text-xs font-semibold transition-all duration-200",
                    groupBy === opt.value 
                      ? "bg-card text-foreground shadow-sm ring-1 ring-border/50" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 1. Stat Cards Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Total Revenue"
          value={formatGHS(summary.total_revenue)}
          subvalue="Sum of cash + mobile money + card checkouts"
          action={<TrendingUp className="h-5 w-5 text-primary" />}
        />
        <DashboardCard
          title="Platform Fees (GHS)"
          value={formatGHS(summary.platform_fees)}
          subvalue="Accrued from 1.5% network fee split"
          action={<Percent className="h-5 w-5 text-amber-500" />}
        />
        <DashboardCard
          title="Avg Daily Revenue"
          value={formatGHS(summary.avg_daily_revenue)}
          subvalue="Adjusted to date range duration"
          action={<Calendar className="h-5 w-5 text-blue-500" />}
        />
        <DashboardCard
          title="Top Tenant"
          value={summary.top_tenant_name}
          subvalue={`Generated ${formatGHS(summary.top_tenant_revenue)}`}
          action={<Award className="h-5 w-5 text-emerald-500" />}
        />
      </div>

      {/* 2. Main Chart */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground font-header">
            Revenue Trend Overview
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Visual distribution of platform volumes and commission cuts.
          </p>
        </div>

        <div className="pt-2">
          {isLoading ? (
            <div className="h-[320px] flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border-4 border-muted border-t-primary animate-spin" />
            </div>
          ) : (
            <BarChart
              data={chart_data}
              xKey="date"
              height={320}
              series={[
                { dataKey: 'revenue', name: 'Total Revenue (GHS)', color: '#0F766E' },
                { dataKey: 'fees', name: 'Platform Commission (GHS)', color: '#F59E0B' },
              ]}
            />
          )}
        </div>
      </div>

      {/* 3. Plan Breakdown Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <DashboardCard
          title="POS Only Revenue"
          value={formatGHS(plan_breakdown.pos_only_revenue)}
          subvalue="Subscription revenue from register terminals"
          action={<Badge variant="info">POS Only</Badge>}
          className="min-h-[140px] border-l-4 border-l-blue-500"
        />
        <DashboardCard
          title="Ecommerce Only Revenue"
          value={formatGHS(plan_breakdown.ecommerce_only_revenue)}
          subvalue="Subscription revenue from digital shops"
          action={
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-transparent">
              Ecommerce Only
            </Badge>
          }
          className="min-h-[140px] border-l-4 border-l-purple-500"
        />
        <DashboardCard
          title="Full Suite Revenue"
          value={formatGHS(plan_breakdown.full_suite_revenue)}
          subvalue="Subscription revenue from unified merchants"
          action={<Badge variant="success">Full Suite</Badge>}
          className="min-h-[140px] border-l-4 border-l-emerald-500"
        />
      </div>

      {/* 4. Merchant Breakdown Table */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground font-header">
            Merchant Revenue performance
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Detailed view of transaction counts, total volume, and average order value per tenant.
          </p>
        </div>

        <div>
          <DataTable
            columns={columns}
            data={tenant_breakdown}
            enablePagination={true}
            enableColumnVisibility={false}
            enablePageSizeSelector={true}
            pageSize={10}
            loading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
