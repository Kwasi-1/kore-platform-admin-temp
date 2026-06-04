import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSystemHealth, SystemHealthData } from '@/api/platform';
import { 
  Database, 
  Cpu, 
  Activity, 
  Wifi, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  Clock,
  ShieldAlert,
  Server
} from 'lucide-react';
import clsx from 'clsx';

// Dynamic mock generator for Demo Mode
function generateMockHealth(simulateFailure: boolean): SystemHealthData {
  if (simulateFailure) {
    return {
      database: {
        status: 'error',
        connection_pool_size: 0,
        max_connections: 100,
      },
      redis: {
        status: 'connected',
        memory_used_mb: 8.4,
      },
      paystack_api: {
        status: 'error',
        last_successful_webhook: '10 minutes ago (Timeout)',
      },
      api_response_time: 842, // > 500ms -> red
      error_rate: 6.8, // > 5% -> red
      webhook_delivery_rate: 84.5,
    };
  }

  // Normal healthy mode
  // Slight connection pool fluctuations
  const dbActive = Math.floor(18 + Math.random() * 12);
  const respTime = Math.floor(115 + Math.random() * 60); // < 200ms -> green
  const errRate = Math.round((0.15 + Math.random() * 0.35) * 100) / 100; // < 1% -> green

  // Webhook timestamp relative to current local time
  const now = new Date();
  const webhookTime = `${formatTimeAgo(now)}`;

  return {
    database: {
      status: 'connected',
      connection_pool_size: dbActive,
      max_connections: 100,
    },
    redis: {
      status: 'connected',
      memory_used_mb: Math.round((3.8 + Math.random() * 0.8) * 100) / 100,
    },
    paystack_api: {
      status: 'connected',
      last_successful_webhook: webhookTime,
    },
    api_response_time: respTime,
    error_rate: errRate,
    webhook_delivery_rate: 99.85,
  };
}

function formatTimeAgo(date: Date) {
  // Return a readable mock timestamp
  const min = date.getMinutes();
  const hr = date.getHours();
  return `${hr.toString().padStart(2, '0')}:${(min - 2 < 0 ? 58 : min - 2).toString().padStart(2, '0')} GMT`;
}

export default function SystemHealth() {
  const [seconds, setSeconds] = React.useState(0);
  const [simulateFailure, setSimulateFailure] = React.useState(false);

  // 1. Fetch system health every 30 seconds
  const { data: serverHealth, isFetching, dataUpdatedAt, error } = useQuery({
    queryKey: ['platform-health'],
    queryFn: getSystemHealth,
    refetchInterval: 30000,
    retry: false,
  });

  const isDemoMode = !serverHealth || !!error;

  // 2. Count-up timer reset logic
  React.useEffect(() => {
    setSeconds(0);
  }, [dataUpdatedAt]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 3. Resolve active data
  const localData = React.useMemo(() => {
    if (serverHealth && !simulateFailure) return serverHealth;
    return generateMockHealth(simulateFailure);
  }, [serverHealth, simulateFailure, dataUpdatedAt]);

  const { database, redis, paystack_api, api_response_time, error_rate, webhook_delivery_rate } = localData;

  // 4. Evaluate failure triggers to display Warning Banner
  const hasIssues = React.useMemo(() => {
    return (
      database.status === 'error' ||
      redis.status === 'error' ||
      paystack_api.status === 'error' ||
      api_response_time > 500 ||
      error_rate > 5.0
    );
  }, [database, redis, paystack_api, api_response_time, error_rate]);

  // Color mappings
  const getResponseTimeColor = (ms: number) => {
    if (ms < 200) return 'text-green-500 bg-green-500/10 border-green-500/20';
    if (ms <= 500) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-red-500 bg-red-500/10 border-red-500/20';
  };

  const getErrorRateColor = (rate: number) => {
    if (rate < 1.0) return 'text-green-500 bg-green-500/10 border-green-500/20';
    if (rate <= 5.0) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-red-500 bg-red-500/10 border-red-500/20';
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold font-header tracking-tight text-foreground">System Health</h2>
            {isDemoMode && (
              <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Demo Mode
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time diagnostics of database connections, API latency, webhooks, and cache layers.
          </p>
        </div>

        {/* Refresh Indicator & Failure toggle */}
        <div className="flex items-center gap-4">
          
          {/* Outage simulator trigger */}
          <button
            onClick={() => setSimulateFailure(prev => !prev)}
            className={clsx(
              "px-3 py-1.5 rounded-xl border text-[11px] font-bold tracking-wide transition-all duration-200 shadow-sm",
              simulateFailure 
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20"
                : "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
            )}
          >
            {simulateFailure ? "Simulate Recover" : "Simulate Outage"}
          </button>

          {/* Poll counter */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-xl border border-border/50 select-none">
            <RefreshCw className={clsx("h-3.5 w-3.5 text-primary", isFetching && "animate-spin")} />
            <span>
              {isFetching ? "Refreshing..." : `Updated ${seconds}s ago`}
            </span>
          </div>

        </div>
      </div>

      {/* Issues Banner */}
      {hasIssues && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 text-red-500 text-xs items-center shadow-sm animate-pulse">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <div className="space-y-0.5">
            <span className="font-bold text-sm font-header">System Issues Detected</span>
            <p className="text-muted-foreground text-red-400">
              One or more backing services is reporting latency thresholds or network connectivity errors. Check status cards below.
            </p>
          </div>
        </div>
      )}

      {/* Grid of Diagnostics Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        
        {/* Database status */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between min-h-[150px] shadow-sm relative overflow-hidden group hover:border-foreground/20 transition-all duration-200">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                Primary Database
              </span>
              <span className="text-base font-bold text-foreground font-header mt-1 block">PostgreSQL</span>
            </div>
            <div className="bg-secondary p-2 rounded-lg text-primary">
              <Database className="h-4 w-4" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <span className={clsx(
                "h-2 w-2 rounded-full",
                database.status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'
              )} />
              <span className="font-semibold capitalize text-foreground">
                {database.status === 'connected' ? 'Connected' : 'Error'}
              </span>
            </div>
            <span className="text-muted-foreground">
              Pool: {database.connection_pool_size}/{database.max_connections} active
            </span>
          </div>
        </div>

        {/* Redis status */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between min-h-[150px] shadow-sm relative overflow-hidden group hover:border-foreground/20 transition-all duration-200">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                Cache Layer
              </span>
              <span className="text-base font-bold text-foreground font-header mt-1 block">Redis Store</span>
            </div>
            <div className="bg-secondary p-2 rounded-lg text-primary">
              <Cpu className="h-4 w-4" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <span className={clsx(
                "h-2 w-2 rounded-full",
                redis.status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'
              )} />
              <span className="font-semibold capitalize text-foreground">
                {redis.status === 'connected' ? 'Connected' : 'Error'}
              </span>
            </div>
            <span className="text-muted-foreground">
              Memory: {redis.memory_used_mb} MB used
            </span>
          </div>
        </div>

        {/* Paystack status */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between min-h-[150px] shadow-sm relative overflow-hidden group hover:border-foreground/20 transition-all duration-200">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                Payment Processor Gateway
              </span>
              <span className="text-base font-bold text-foreground font-header mt-1 block">Paystack API</span>
            </div>
            <div className="bg-secondary p-2 rounded-lg text-primary">
              <Wifi className="h-4 w-4" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <span className={clsx(
                "h-2 w-2 rounded-full",
                paystack_api.status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'
              )} />
              <span className="font-semibold capitalize text-foreground">
                {paystack_api.status === 'connected' ? 'Online' : 'Offline'}
              </span>
            </div>
            <span className="text-muted-foreground truncate max-w-[150px]" title={`Last webhook: ${paystack_api.last_successful_webhook}`}>
              Webhooks: {paystack_api.last_successful_webhook}
            </span>
          </div>
        </div>

        {/* Avg Response Time */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between min-h-[150px] shadow-sm relative overflow-hidden group hover:border-foreground/20 transition-all duration-200">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                API latency (24h)
              </span>
              <span className="text-base font-bold text-foreground font-header mt-1 block">Avg Response Time</span>
            </div>
            <div className="bg-secondary p-2 rounded-lg text-primary">
              <Clock className="h-4 w-4" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-4 text-xs">
            <span className="text-foreground font-semibold text-sm">
              {api_response_time} ms
            </span>
            <div className={clsx(
              "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
              getResponseTimeColor(api_response_time)
            )}>
              {api_response_time < 200 ? 'Optimal' : api_response_time <= 500 ? 'Warning' : 'Degraded'}
            </div>
          </div>
        </div>

        {/* Error Rate */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between min-h-[150px] shadow-sm relative overflow-hidden group hover:border-foreground/20 transition-all duration-200">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                HTTP Failures (24h)
              </span>
              <span className="text-base font-bold text-foreground font-header mt-1 block">API Error Rate</span>
            </div>
            <div className="bg-secondary p-2 rounded-lg text-primary">
              <Activity className="h-4 w-4" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-4 text-xs">
            <span className="text-foreground font-semibold text-sm">
              {error_rate}%
            </span>
            <div className={clsx(
              "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
              getErrorRateColor(error_rate)
            )}>
              {error_rate < 1.0 ? 'Healthy' : error_rate <= 5.0 ? 'High' : 'Critical'}
            </div>
          </div>
        </div>

        {/* Webhook delivery rate */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between min-h-[150px] shadow-sm relative overflow-hidden group hover:border-foreground/20 transition-all duration-200">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                Webhook delivery status
              </span>
              <span className="text-base font-bold text-foreground font-header mt-1 block">Delivery Success</span>
            </div>
            <div className="bg-secondary p-2 rounded-lg text-primary">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-4 text-xs">
            <span className="text-foreground font-semibold text-sm">
              {webhook_delivery_rate}%
            </span>
            <div className={clsx(
              "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
              webhook_delivery_rate >= 99.0 
                ? 'text-green-500 bg-green-500/10 border-green-500/20' 
                : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
            )}>
              {webhook_delivery_rate >= 99.0 ? 'Excellent' : 'Degraded'}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
