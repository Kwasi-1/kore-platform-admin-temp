import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  subDays, 
  format, 
  startOfDay,
  endOfDay
} from 'date-fns';
import { 
  getDetailedRevenueAnalytics, 
  getYearlySubscriptionMRR,
} from '@/api/platform';
import { useCurrency } from '@/hooks/useCurrency';
import { DateRangePicker, DateRangeValue } from '@/components/ui/date-range-picker';
import { BarChart } from '@/components/ui/bar-chart';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { getPlanConfig } from '@/config/plans';
import DashboardCard from '@/components/ui/dashboard-card';
import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/ui/data-table';
import { Spinner } from '@/components/ui/spinner';
import { 
  TrendingUp, 
  Activity, 
  Award,
  Calendar,
} from 'lucide-react';
import clsx from 'clsx';
import PageLayout from '@/components/layout/PageLayout';

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
  const [chartMetric, setChartMetric] = React.useState<'gmv' | 'subscription'>('gmv');
  const [subYear] = React.useState<number>(new Date().getFullYear());

  // 2. GMV + summary query (respects date filter)
  const startDateStr = format(dateRange.startDate, 'yyyy-MM-dd');
  const endDateStr = format(dateRange.endDate, 'yyyy-MM-dd');

  const { data: serverData, isLoading: isGmvLoading } = useQuery({
    queryKey: ['platform-revenue-detailed', startDateStr, endDateStr, groupBy],
    queryFn: () => getDetailedRevenueAnalytics(startDateStr, endDateStr, groupBy),
    retry: false,
  });

  // 3. Yearly subscription MRR query (always 12 months, ignores date filter)
  const { data: subYearData, isLoading: isSubLoading } = useQuery({
    queryKey: ['platform-revenue-subscription-yearly', subYear],
    queryFn: () => getYearlySubscriptionMRR(subYear),
    retry: false,
    staleTime: 5 * 60 * 1000, // cache 5 mins
  });

  const summary = serverData?.summary;
  const gmvChartData = serverData?.chart_data ?? [];
  const plan_breakdown = serverData?.plan_breakdown;
  const tenant_breakdown = serverData?.tenant_breakdown ?? [];
  const subscriptionChartData = subYearData?.months ?? [];

  // 4. DataTable column definitions
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
        const cfg = getPlanConfig(plan);
        return <Badge className={cfg.badgeClassName}>{cfg.label}</Badge>;
      },
    },
    {
      accessorKey: 'total_revenue',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total Revenue" />
      ),
      cell: ({ row }) => <span className="font-medium text-foreground">{formatGHS(row.original.total_revenue)}</span>,
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

  // Group By options
  const groupByOptions = [
    { label: 'Day', value: 'day' as const },
    { label: 'Week', value: 'week' as const },
    { label: 'Month', value: 'month' as const },
  ];

  const isChartLoading = chartMetric === 'gmv' ? isGmvLoading : isSubLoading;
  // Cast to any[] to allow the two different data shapes (GMV vs Subscription) into BarChart
  const activeChartData = (chartMetric === 'gmv' ? gmvChartData : subscriptionChartData) as any[];
  const activeXKey = (chartMetric === 'gmv' ? 'date' : 'month') as string;

  return (
    <PageLayout
      title="Revenue Analytics"
      subtitle="Monitor platform subscription recurring revenue, merchant GMV, and store performance."
      actions={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Date Picker — only affects GMV data */}
          <div className="w-full sm:w-[280px]">
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
      }
    >
      <div className="space-y-6">

        {/* 1. Stat Cards Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isGmvLoading ? (
            // Skeleton shimmer for all 4 cards while loading
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 min-h-[120px] flex items-center justify-center shadow-sm">
                <Spinner />
              </div>
            ))
          ) : (
            <>
              <DashboardCard
                title="Platform Subscription MRR"
                value={formatGHS(summary?.platform_mrr ?? 0)}
                subvalue="Monthly recurring revenue from merchant plans"
                action={<TrendingUp className="h-5 w-5 text-primary" />}
              />
              <DashboardCard
                title="Merchant Gross Volume (GMV)"
                value={formatGHS(summary?.merchant_gmv ?? summary?.total_revenue ?? 0)}
                subvalue="Total sales processed by merchants"
                action={<Activity className="h-5 w-5 text-emerald-500" />}
              />
              <DashboardCard
                title="Avg Daily Merchant GMV"
                value={formatGHS(summary?.avg_daily_revenue ?? 0)}
                subvalue="Adjusted to selected period duration"
                action={<Calendar className="h-5 w-5 text-blue-500" />}
              />
              <DashboardCard
                title="Top Merchant"
                value={summary?.top_tenant_name ?? '—'}
                subvalue={`Generated ${formatGHS(summary?.top_tenant_revenue ?? 0)}`}
                action={<Award className="h-5 w-5 text-amber-500" />}
              />
            </>
          )}
        </div>

        {/* 2. Main Chart */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground font-header">
                {chartMetric === 'gmv' ? 'Merchant Transaction GMV Trend' : `Platform Subscription Revenue — ${subYear}`}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {chartMetric === 'gmv'
                  ? 'Total sales volume processed across all merchant stores for the selected period.'
                  : `Monthly recurring subscription earnings from all active merchant plans across ${subYear}.`}
              </p>
              {chartMetric === 'subscription' && (
                <p className="text-[10px] text-muted-foreground/60 mt-1 italic hidden">
                  Date filter does not apply — subscription view always shows the full year.
                </p>
              )}
            </div>

            {/* Toggle Metric Tabs */}
            <div className="flex bg-secondary p-1 rounded-lg h-9 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setChartMetric('gmv')}
                className={clsx(
                  "px-3 rounded-md font-semibold transition-all duration-200",
                  chartMetric === 'gmv'
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Merchant GMV
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('subscription')}
                className={clsx(
                  "px-3 rounded-md font-semibold transition-all duration-200",
                  chartMetric === 'subscription'
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Subscription MRR
              </button>
            </div>
          </div>

          <div className="pt-2 relative">
            {isChartLoading ? (
              <div className="h-[320px] flex items-center justify-center">
                <Spinner />
              </div>
            ) : (
              <BarChart
                data={activeChartData}
                xKey={activeXKey}
                height={320}
                series={
                  chartMetric === 'gmv'
                    ? [{ dataKey: 'revenue', name: 'Merchant GMV (GHS)', color: '#0F766E' }]
                    : [{ dataKey: 'subscription', name: 'Subscription MRR (GHS)', color: '#2563EB' }]
                }
              />
            )}
          </div>
        </div>

        {/* 3. Plan Breakdown Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isGmvLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 min-h-[140px] flex items-center justify-center shadow-sm">
                <Spinner />
              </div>
            ))
          ) : (
            <>
              <DashboardCard
                title="Starter Plan (GH¢199/mo)"
                value={formatGHS(plan_breakdown?.starter_revenue ?? 0)}
                subvalue="Single cashier basic POS tier MRR"
                action={<Badge className={getPlanConfig('starter').badgeClassName}>Starter</Badge>}
                className="min-h-[140px]"
              />
              <DashboardCard
                title="Ecom Only Plan (GH¢300/mo)"
                value={formatGHS(plan_breakdown?.ecom_only_revenue ?? 0)}
                subvalue="Digital store sellers tier MRR"
                action={<Badge className={getPlanConfig('ecom_only').badgeClassName}>Ecom Only</Badge>}
                className="min-h-[140px]"
              />
              <DashboardCard
                title="Standard Plan (GH¢500/mo)"
                value={formatGHS(plan_breakdown?.standard_revenue ?? 0)}
                subvalue="Multi-staff full POS tier MRR"
                action={<Badge className={getPlanConfig('standard').badgeClassName}>Standard</Badge>}
                className="min-h-[140px]"
              />
              <DashboardCard
                title="Business Plan (GH¢900/mo)"
                value={formatGHS(plan_breakdown?.business_revenue ?? 0)}
                subvalue="Full suite POS + E-commerce tier MRR"
                action={<Badge className={getPlanConfig('business').badgeClassName}>Business</Badge>}
                className="min-h-[140px]"
              />
            </>
          )}
        </div>

        {/* 4. Merchant Breakdown Table */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground font-header">
              Merchant Revenue Performance
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
              loading={isGmvLoading}
            />
          </div>
        </div>

      </div>
    </PageLayout>
  );
}
