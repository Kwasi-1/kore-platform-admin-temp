import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  subDays, 
  format, 
  startOfDay, 
  endOfDay 
} from 'date-fns';
import { 
  getDetailedTransactionAnalytics, 
} from '@/api/platform';
import { useCurrency } from '@/hooks/useCurrency';
import { DateRangePicker, DateRangeValue } from '@/components/ui/date-range-picker';
import { BarChart } from '@/components/ui/bar-chart';
import { DataTable } from '@/components/ui/data-table';
import DashboardCard from '@/components/ui/dashboard-card';
import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/ui/data-table';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { getPlanConfig } from '@/config/plans';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import { 
  ArrowLeftRight, 
  Coins, 
  ShieldAlert, 
  CheckCircle,
} from 'lucide-react';
import clsx from 'clsx';
import PageLayout from '@/components/layout/PageLayout';

// Payment method display map
const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  mobile_money: 'Mobile Money',
  momo: 'Mobile Money',
  card: 'Card',
  credit: 'Store Credit',
  online: 'Online (Ecom)',
};
const METHOD_COLORS: Record<string, string> = {
  cash: '#10B981',
  mobile_money: '#F59E0B',
  momo: '#F59E0B',
  card: '#3B82F6',
  credit: '#6366F1',
  online: '#8B5CF6',
};
const FALLBACK_COLORS = ['#10B981', '#F59E0B', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'];

export default function Transactions() {
  const { formatGHS } = useCurrency();

  // 1. Controls state: default last 30 days
  const [dateRange, setDateRange] = React.useState<DateRangeValue>(() => {
    const today = new Date();
    return {
      startDate: startOfDay(subDays(today, 29)),
      endDate: endOfDay(today),
    };
  });

  // 2. Local chart view state: count or volume
  const [chartView, setChartView] = React.useState<'volume' | 'count'>('volume');

  // 3. Query hook
  const startDateStr = format(dateRange.startDate, 'yyyy-MM-dd');
  const endDateStr = format(dateRange.endDate, 'yyyy-MM-dd');

  const { data: serverData, isLoading } = useQuery({
    queryKey: ['platform-transactions-detailed', startDateStr, endDateStr],
    queryFn: () => getDetailedTransactionAnalytics(startDateStr, endDateStr),
    retry: false,
  });

  // Donut chart variables
  const donutData = React.useMemo(() => {
    if (!serverData?.payment_method_breakdown) return [];
    return serverData.payment_method_breakdown.map((item) => ({
      name: METHOD_LABELS[item.method] ?? item.method,
      value: item.count,
      volume: item.volume,
      percentage: item.percentage,
      method: item.method,
    }));
  }, [serverData]);

  // Active series for the togglable BarChart
  const activeSeries = React.useMemo(() => {
    return chartView === 'volume' 
      ? [{ dataKey: 'volume', name: 'Transaction Volume (GHS)', color: '#10B981' }]
      : [{ dataKey: 'count', name: 'Transaction Count', color: '#3B82F6' }];
  }, [chartView]);

  const summary = serverData?.summary;
  const chart_data = serverData?.chart_data ?? [];
  const top_tenants = serverData?.top_tenants ?? [];
  const failed_transactions = serverData?.failed_transactions ?? [];

  // Tenant table columns
  const tenantColumns: ColumnDef<typeof top_tenants[0]>[] = [
    {
      accessorKey: 'tenant_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Merchant Name" />
      ),
      cell: ({ row }) => (
        <span className="font-bold text-foreground">
          {row.original.tenant_name}
        </span>
      ),
    },
    {
      accessorKey: 'plan',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Plan" />
      ),
      cell: ({ row }) => {
        const cfg = getPlanConfig(row.original.plan);
        return <Badge className={cfg.badgeClassName}>{cfg.label}</Badge>;
      },
    },
    {
      accessorKey: 'transaction_count',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Transactions" />
      ),
      cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.transaction_count.toLocaleString()}</span>,
    },
    {
      accessorKey: 'total_volume',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total Volume" />
      ),
      cell: ({ row }) => <span className="font-bold text-foreground">{formatGHS(row.original.total_volume)}</span>,
    },
    {
      accessorKey: 'avg_transaction_value',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Avg Ticket" />
      ),
      cell: ({ row }) => <span className="text-muted-foreground">{formatGHS(row.original.avg_transaction_value)}</span>,
    },
  ];

  return (
    <PageLayout
      title="Transaction Analytics"
      subtitle="Monitor processing rates, payment channels, volumes, and checkout performance across all merchants."
      actions={
        <div className="w-full sm:w-[280px]">
          <DateRangePicker
            value={dateRange}
            onChange={(val) => val && setDateRange(val)}
            labelPlacement="outside"
            label="Selected Period"
          />
        </div>
      }
    >
      <div className="space-y-6">

        {/* 1. Stat Cards Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 min-h-[120px] flex items-center justify-center shadow-sm">
                <Spinner />
              </div>
            ))
          ) : (
            <>
              <DashboardCard
                title="Total Transactions"
                value={(summary?.total_transactions ?? 0).toLocaleString()}
                subvalue="Logged charges across all channels"
                action={<ArrowLeftRight className="h-5 w-5 text-blue-500" />}
              />
              <DashboardCard
                title="Total Volume"
                value={formatGHS(summary?.total_volume ?? 0)}
                subvalue="Processed transaction values"
                action={<Coins className="h-5 w-5 text-emerald-500" />}
              />
              <DashboardCard
                title="Success Rate"
                value={`${summary?.success_rate ?? 0}%`}
                subvalue="Successful checkouts ratio"
                action={<CheckCircle className="h-5 w-5 text-teal-600" />}
              />
              <DashboardCard
                title="Failed Payments"
                value={(summary?.failed_payments ?? 0).toLocaleString()}
                subvalue="Charges declined or abandoned"
                action={<ShieldAlert className="h-5 w-5 text-red-500" />}
              />
            </>
          )}
        </div>

        {/* 2. Volume Chart & Method Breakdown */}
        <div className="grid gap-6 md:grid-cols-3">

          {/* Togglable Volume Chart (Left, wider) */}
          <div className="md:col-span-2 bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground font-header">
                  Transaction Trends
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {chartView === 'volume'
                    ? 'Daily transaction volume (GHS) across POS & online channels.'
                    : 'Daily transaction count across POS & online channels.'}
                </p>
              </div>

              {/* Toggle view selector */}
              <div className="flex bg-secondary p-1 rounded-lg h-9 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setChartView('volume')}
                  className={clsx(
                    "px-3 rounded-md font-semibold transition-all duration-200",
                    chartView === 'volume' 
                      ? "bg-card text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Volume (GHS)
                </button>
                <button
                  type="button"
                  onClick={() => setChartView('count')}
                  className={clsx(
                    "px-3 rounded-md font-semibold transition-all duration-200",
                    chartView === 'count' 
                      ? "bg-card text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Count
                </button>
              </div>
            </div>

            <div className="pt-2 flex-1">
              {isLoading ? (
                <div className="h-[260px] flex items-center justify-center">
                  <Spinner />
                </div>
              ) : (
                <BarChart
                  data={chart_data}
                  xKey="date"
                  height={260}
                  series={activeSeries}
                />
              )}
            </div>
          </div>

          {/* Donut Payment Breakdown (Right) */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm flex flex-col">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground font-header">
                Payment Methods
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Distribution by transaction channel.
              </p>
            </div>

            {/* Donut Chart */}
            <div className="flex items-center justify-center py-2">
              {isLoading ? (
                <div className="h-[160px] flex items-center justify-center">
                  <Spinner />
                </div>
              ) : (
                <div className="w-full">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {donutData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={METHOD_COLORS[entry.method] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: any, name: any, props: any) => [
                          `${Number(value).toLocaleString()} txs (${props.payload.percentage}%)`, 
                          name
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Custom legend */}
            <div className="space-y-2 pt-2 border-t border-border/50 text-xs">
              {isLoading ? (
                <div className="flex justify-center py-2"><Spinner /></div>
              ) : (
                donutData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span 
                        className="h-2.5 w-2.5 rounded-full shrink-0" 
                        style={{ backgroundColor: METHOD_COLORS[item.method] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length] }} 
                      />
                      <span className="font-medium text-foreground">{item.name}</span>
                    </div>
                    <div className="text-right space-x-2">
                      <span className="font-semibold text-foreground">{item.percentage}%</span>
                      <span className="text-muted-foreground">({formatGHS(item.volume)})</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* 3. Top Tenants by Volume Table */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground font-header">
              Top 10 Merchants by Volume
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Merchant leaderboard sorted by total transaction volume for the selected period.
            </p>
          </div>

          <DataTable
            columns={tenantColumns}
            data={top_tenants}
            enablePagination={true}
            enableColumnVisibility={false}
            enablePageSizeSelector={true}
            pageSize={10}
            loading={isLoading}
          />
        </div>

        {/* 4. Failed Transactions Debug Log */}
        {failed_transactions.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-red-500 font-header">
                Recent Failed Transactions
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Real-time validation log displaying failures and responses from Paystack integrations.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-semibold">
                    <th className="py-3 pr-4">Date & Time</th>
                    <th className="py-3 px-4">Merchant</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 pl-6">Failure Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {failed_transactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4 text-muted-foreground">{tx.date}</td>
                      <td className="py-3 px-4 font-semibold">{tx.tenant_name}</td>
                      <td className="py-3 px-4 text-right font-bold text-red-500">{formatGHS(tx.amount)}</td>
                      <td className="py-3 pl-6">
                        <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded text-[11px] font-semibold inline-block">
                          {tx.failure_reason}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </PageLayout>
  );
}
