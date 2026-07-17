import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  subDays, 
  differenceInDays, 
  format, 
  eachDayOfInterval, 
  startOfDay, 
  endOfDay 
} from 'date-fns';
import { 
  getDetailedTransactionAnalytics, 
  PlatformTransactionDetails 
} from '@/api/platform';
import { useCurrency } from '@/hooks/useCurrency';
import { DateRangePicker, DateRangeValue } from '@/components/ui/date-range-picker';
import { BarChart } from '@/components/ui/bar-chart';
import { DataTable } from '@/components/ui/data-table';
import DashboardCard from '@/components/ui/dashboard-card';
import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/ui/data-table';
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
  Percent, 
  ShieldAlert, 
  CheckCircle,
  HelpCircle,
  Briefcase
} from 'lucide-react';
import clsx from 'clsx';

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

  const isDemoMode = import.meta.env.VITE_USE_MOCK_API === 'true';

  // Donut chart variables
  const donutData = React.useMemo(() => {
    if (!serverData || !serverData.payment_method_breakdown) return [];
    return serverData.payment_method_breakdown.map((item) => {
      let name = 'Cash';
      if (item.method === 'mobile_money') name = 'Mobile Money';
      if (item.method === 'card') name = 'Card';
      if (item.method === 'credit') name = 'Store Credit';
      return {
        name,
        value: item.count,
        volume: item.volume,
        percentage: item.percentage,
        method: item.method,
      };
    });
  }, [serverData]);

  // Active series for the togglable BarChart
  const activeSeries = React.useMemo(() => {
    return chartView === 'volume' 
      ? [{ dataKey: 'volume', name: 'Transaction Volume (GHS)', color: '#0F766E' }]
      : [{ dataKey: 'count', name: 'Transaction Count', color: '#3B82F6' }];
  }, [chartView]);

  if (isLoading || !serverData) {
    return (
      <div className="flex h-72 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-muted border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-medium tracking-wide">Loading transactions details…</p>
        </div>
      </div>
    );
  }

  const { summary, chart_data, payment_method_breakdown, top_tenants, failed_transactions } = serverData;

  // Color schemes for methods: Cash (emerald), MoMo (amber), Card (blue), Credit (indigo)
  const COLORS = ['#10B981', '#F59E0B', '#3B82F6', '#6366F1'];

  // 4. Columns for Top Tenants
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
        <DataTableColumnHeader column={column} title="Avg Ticket Value" />
      ),
      cell: ({ row }) => <span className="text-muted-foreground">{formatGHS(row.original.avg_transaction_value)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header controls bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold font-header tracking-tight text-foreground">Transaction Analytics</h2>
            {isDemoMode && (
              <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Demo Mode
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor processing rates, payment channels, volumes, and de-risk checkout integrations.
          </p>
        </div>

        {/* Date Selector */}
        <div className="w-full sm:w-[320px]">
          <DateRangePicker
            value={dateRange}
            onChange={(val) => val && setDateRange(val)}
            labelPlacement="outside"
            label="Selected Period"
          />
        </div>
      </div>

      {/* 1. Stat Cards Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Total Transactions"
          value={summary.total_transactions.toLocaleString()}
          subvalue="Logged charges across channels"
          action={<ArrowLeftRight className="h-5 w-5 text-blue-500" />}
        />
        <DashboardCard
          title="Total Volume"
          value={formatGHS(summary.total_volume)}
          subvalue="Processed transaction values"
          action={<Coins className="h-5 w-5 text-emerald-500" />}
        />
        <DashboardCard
          title="Success Rate"
          value={`${summary.success_rate}%`}
          subvalue="Successful checkouts ratio"
          action={<CheckCircle className="h-5 w-5 text-teal-600" />}
        />
        <DashboardCard
          title="Failed Payments"
          value={summary.failed_payments.toLocaleString()}
          subvalue="Charges declined or abandoned"
          action={<ShieldAlert className="h-5 w-5 text-red-500" />}
        />
      </div>

      {/* 2. Volume Chart & Method Breakdown */}
      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Togglable Volume Chart (Left, wider) */}
        <div className="md:col-span-2 bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground font-header">
                Transaction Trends
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Daily volume values and counts mapping period checkouts.
              </p>
            </div>

            {/* Toggle view selector */}
            <div className="flex bg-secondary p-1 rounded-xl border border-border h-9">
              <button
                onClick={() => setChartView('volume')}
                className={clsx(
                  "px-3 rounded-lg text-xs font-semibold transition-all duration-200",
                  chartView === 'volume' 
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border/50" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Volume (GHS)
              </button>
              <button
                onClick={() => setChartView('count')}
                className={clsx(
                  "px-3 rounded-lg text-xs font-semibold transition-all duration-200",
                  chartView === 'count' 
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border/50" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Count
              </button>
            </div>
          </div>

          <div className="pt-4 flex-1">
            {isLoading ? (
              <div className="h-[260px] flex items-center justify-center">
                <div className="h-8 w-8 rounded-full border-4 border-muted border-t-primary animate-spin" />
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
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground font-header">
              Payment Methods
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Distribution by transaction channels.
            </p>
          </div>

          {/* Donut Chart container */}
          <div className="flex items-center justify-center relative py-2">
            {isLoading ? (
              <div className="h-[160px] flex items-center justify-center">
                <div className="h-6 w-6 rounded-full border-2 border-muted border-t-primary animate-spin" />
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
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: any, name: any, props: any) => [
                        `${value.toLocaleString()} txs (${props.payload.percentage}%)`, 
                        name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Custom legend with statistics */}
          <div className="space-y-2 pt-2 border-t border-border/50 text-xs">
            {donutData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span 
                    className="h-2.5 w-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                  />
                  <span className="font-medium text-foreground">{item.name}</span>
                </div>
                <div className="text-right space-x-2">
                  <span className="font-semibold text-foreground">{item.percentage}%</span>
                  <span className="text-muted-foreground">({formatGHS(item.volume)})</span>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* 3. Top Tenants by Volume Table */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground font-header">
            Top 10 Tenants by Volume
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Merchant leaderboard sorted by total transaction volumes.
          </p>
        </div>

        <div>
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
      </div>

      {/* 4. Failed Transactions Debug Log */}
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
                <th className="py-3 pl-6">Paystack Failure Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {failed_transactions.map((tx) => (
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

    </div>
  );
}
