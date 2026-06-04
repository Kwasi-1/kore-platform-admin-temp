import MockAdapter from 'axios-mock-adapter';
import apiClient from './client';
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

// -----------------------------------------------------
// CENTRALIZED STATEFUL MOCK DATA STORE
// -----------------------------------------------------
let mockTenants = [
  { id: 'tn-01', business_name: "Kofi's Provisions", plan: 'full_suite' as const, is_active: true, date_created: '2026-06-01', api_key_prefix: 'ab12', monthly_revenue: 12500, transaction_count: 340, paystack_subaccount_code: 'ACCT_890283x782' },
  { id: 'tn-02', business_name: 'Accra Groceries', plan: 'pos_only' as const, is_active: true, date_created: '2026-05-28', api_key_prefix: 'cd34', monthly_revenue: 8400, transaction_count: 210, paystack_subaccount_code: 'ACCT_129837x192' },
  { id: 'tn-03', business_name: 'Osu Fashion Hub', plan: 'ecommerce_only' as const, is_active: true, date_created: '2026-05-25', api_key_prefix: 'ef56', monthly_revenue: 6200, transaction_count: 150, paystack_subaccount_code: 'ACCT_450912x783' },
  { id: 'tn-04', business_name: 'Kumasi Tech Store', plan: 'full_suite' as const, is_active: true, date_created: '2026-05-20', api_key_prefix: 'gh78', monthly_revenue: 15400, transaction_count: 420, paystack_subaccount_code: 'ACCT_349012x891' },
  { id: 'tn-05', business_name: 'Apex Pharmacy', plan: 'pos_only' as const, is_active: false, date_created: '2026-05-18', api_key_prefix: 'ij90', monthly_revenue: 0, transaction_count: 0, paystack_subaccount_code: '' },
  { id: 'tn-06', business_name: 'Tema Logistics', plan: 'full_suite' as const, is_active: true, date_created: '2026-05-15', api_key_prefix: 'kl12', monthly_revenue: 22000, transaction_count: 510, paystack_subaccount_code: 'ACCT_990183x123' },
  { id: 'tn-07', business_name: 'Spintex Bakery', plan: 'pos_only' as const, is_active: true, date_created: '2026-05-12', api_key_prefix: 'mn34', monthly_revenue: 4300, transaction_count: 110, paystack_subaccount_code: 'ACCT_789012x125' },
  { id: 'tn-08', business_name: 'East Legon Cafe', plan: 'ecommerce_only' as const, is_active: true, date_created: '2026-05-10', api_key_prefix: 'op56', monthly_revenue: 9500, transaction_count: 280, paystack_subaccount_code: 'ACCT_238910x992' },
  { id: 'tn-09', business_name: 'Labadi Beach Rentals', plan: 'pos_only' as const, is_active: true, date_created: '2026-05-08', api_key_prefix: 'qr78', monthly_revenue: 3100, transaction_count: 85, paystack_subaccount_code: 'ACCT_120938x093' },
  { id: 'tn-10', business_name: 'Cantonments Boutique', plan: 'full_suite' as const, is_active: false, date_created: '2026-05-05', api_key_prefix: 'st90', monthly_revenue: 0, transaction_count: 0, paystack_subaccount_code: '' },
];

let mockSettings = {
  platform_fee_percentage: 2.5,
  default_tax_rate: 15.0,
  supported_payment_methods: ['cash' as const, 'mtn_momo' as const, 'vodafone_cash' as const, 'card' as const],
};

// -----------------------------------------------------
// API MOCK SETUP
// -----------------------------------------------------
export function setupMockApi() {
  console.log('🚀 Initializing Platform API Mocks (VITE_USE_MOCK_API is true)');
  
  // 600ms network latency simulation for loading states auditing
  const mock = new MockAdapter(apiClient, { delayResponse: 600 });

  // 1. Auth: Platform Login
  mock.onPost('/api/v1/platform/auth/login').reply((config) => {
    const { email } = JSON.parse(config.data);
    return [200, {
      success: true,
      data: {
        token: 'mock-jwt-token-hpos-platform',
        refresh_token: 'mock-refresh-token-hpos-platform',
        admin: {
          id: 'admin-01',
          name: 'Platform Auditor',
          email: email || 'admin@headlesspos.com',
          role: 'super_admin'
        }
      }
    }];
  });

  // 2. Overview Summary Stats
  mock.onGet('/api/v1/platform/analytics/summary').reply(200, {
    active_tenants: mockTenants.filter(t => t.is_active).length,
    platform_revenue_this_month: 48250,
    transactions_today: 890,
    new_tenants_this_month: 4,
    plan_distribution: [
      { plan: 'pos_only', count: mockTenants.filter(t => t.plan === 'pos_only').length, percentage: 30 },
      { plan: 'ecommerce_only', count: mockTenants.filter(t => t.plan === 'ecommerce_only').length, percentage: 20 },
      { plan: 'full_suite', count: mockTenants.filter(t => t.plan === 'full_suite').length, percentage: 50 },
    ]
  });

  // 3. Simple Revenue Analytics (for dashboard line chart)
  mock.onGet('/api/v1/platform/analytics/revenue').reply((config) => {
    const today = new Date();
    const mockRevenue = Array.from({ length: 30 }, (_, i) => {
      const dateObj = subDays(today, 29 - i);
      return {
        date: format(dateObj, 'yyyy-MM-dd'),
        revenue: Math.floor(1200 + Math.random() * 1500),
      };
    });
    return [200, mockRevenue];
  });

  // 4. Detailed Revenue Analytics
  mock.onGet('/api/v1/platform/analytics/revenue/detailed').reply((config) => {
    const { start_date, end_date, group_by } = config.params || {};
    const start = start_date ? new Date(start_date) : subDays(new Date(), 29);
    const end = end_date ? new Date(end_date) : new Date();
    const groupBy = group_by || 'day';

    const daysDiff = Math.max(1, differenceInDays(end, start) + 1);

    // Generate chart data based on group_by
    let chartData: { date: string; revenue: number; fees: number }[] = [];
    if (groupBy === 'month') {
      const intervals = eachMonthOfInterval({ start, end });
      chartData = intervals.map(date => {
        const rev = Math.floor(190000 + Math.random() * 100000);
        return { date: format(date, 'MMM yyyy'), revenue: rev, fees: Math.round(rev * 0.015) };
      });
    } else if (groupBy === 'week') {
      const intervals = eachWeekOfInterval({ start, end });
      chartData = intervals.map(date => {
        const rev = Math.floor(40000 + Math.random() * 20000);
        return { date: `Wk of ${format(date, 'MMM dd')}`, revenue: rev, fees: Math.round(rev * 0.015) };
      });
    } else {
      const intervals = eachDayOfInterval({ start, end });
      chartData = intervals.map(date => {
        const rev = Math.floor(4000 + Math.random() * 5500);
        return { date: format(date, 'MMM dd'), revenue: rev, fees: Math.round(rev * 0.015) };
      });
    }

    const totalRevenue = chartData.reduce((acc, curr) => acc + curr.revenue, 0);
    const platformFees = Math.round(totalRevenue * (mockSettings.platform_fee_percentage / 100));
    const avgDailyRevenue = Math.round(totalRevenue / daysDiff);

    const tenantBreakdown = mockTenants.map(t => {
      const share = t.plan === 'full_suite' ? 0.35 : t.plan === 'pos_only' ? 0.20 : 0.15;
      const tenantRev = Math.round(totalRevenue * share * (t.is_active ? 1 : 0));
      const transCount = Math.max(0, Math.round(tenantRev / 45));
      return {
        tenant_id: t.id,
        tenant_name: t.business_name,
        plan: t.plan,
        total_revenue: tenantRev,
        transaction_count: transCount,
        avg_transaction_value: transCount > 0 ? Math.round((tenantRev / transCount) * 100) / 100 : 0,
      };
    }).sort((a, b) => b.total_revenue - a.total_revenue);

    const topTenant = tenantBreakdown[0] || { tenant_name: 'None', total_revenue: 0 };

    return [200, {
      chart_data: chartData,
      summary: {
        total_revenue: totalRevenue,
        platform_fees: platformFees,
        avg_daily_revenue: avgDailyRevenue,
        top_tenant_name: topTenant.tenant_name,
        top_tenant_revenue: topTenant.total_revenue,
      },
      plan_breakdown: {
        pos_only_revenue: tenantBreakdown.filter(t => t.plan === 'pos_only').reduce((a, b) => a + b.total_revenue, 0),
        ecommerce_only_revenue: tenantBreakdown.filter(t => t.plan === 'ecommerce_only').reduce((a, b) => a + b.total_revenue, 0),
        full_suite_revenue: tenantBreakdown.filter(t => t.plan === 'full_suite').reduce((a, b) => a + b.total_revenue, 0),
      },
      tenant_breakdown: tenantBreakdown,
    }];
  });

  // 5. Detailed Transaction Analytics
  mock.onGet('/api/v1/platform/analytics/transactions/detailed').reply((config) => {
    const { start_date, end_date } = config.params || {};
    const start = start_date ? new Date(start_date) : subDays(new Date(), 29);
    const end = end_date ? new Date(end_date) : new Date();

    const daysDiff = Math.max(1, differenceInDays(end, start) + 1);
    const intervals = eachDayOfInterval({ start, end });
    
    const chartData = intervals.map(date => {
      const count = Math.floor(100 + Math.random() * 90);
      const volume = Math.floor(count * (30 + Math.random() * 30));
      return { date: format(date, 'MMM dd'), count, volume };
    });

    const totalTransactions = chartData.reduce((acc, curr) => acc + curr.count, 0);
    const totalVolume = chartData.reduce((acc, curr) => acc + curr.volume, 0);
    const successRate = 98.2;
    const failedPayments = Math.round(totalTransactions * 0.018);

    const paymentMethodBreakdown = [
      { method: 'cash' as const, count: Math.round(totalTransactions * 0.30), volume: Math.round(totalVolume * 0.30), percentage: 30 },
      { method: 'mobile_money' as const, count: Math.round(totalTransactions * 0.50), volume: Math.round(totalVolume * 0.50), percentage: 50 },
      { method: 'card' as const, count: Math.round(totalTransactions * 0.15), volume: Math.round(totalVolume * 0.15), percentage: 15 },
      { method: 'credit' as const, count: Math.round(totalTransactions * 0.05), volume: Math.round(totalVolume * 0.05), percentage: 5 },
    ];

    const topTenants = mockTenants.map(t => {
      const share = t.plan === 'full_suite' ? 0.35 : t.plan === 'pos_only' ? 0.20 : 0.15;
      const tVol = Math.round(totalVolume * share * (t.is_active ? 1 : 0));
      const tCount = Math.round(totalTransactions * share * (t.is_active ? 1 : 0));
      return {
        tenant_id: t.id,
        tenant_name: t.business_name,
        transaction_count: tCount,
        total_volume: tVol,
        avg_transaction_value: tCount > 0 ? Math.round((tVol / tCount) * 100) / 100 : 0,
      };
    }).sort((a, b) => b.total_volume - a.total_volume).slice(0, 10);

    const failedTransactions = Array.from({ length: 5 }, (_, idx) => ({
      id: `fail-${idx + 1}`,
      date: format(subDays(end, idx), 'yyyy-MM-dd HH:mm'),
      tenant_name: mockTenants[idx % mockTenants.length].business_name,
      amount: Math.floor(80 + Math.random() * 150),
      failure_reason: idx % 2 === 0 ? 'Insufficient Funds' : 'Declined by Bank',
    }));

    return [200, {
      summary: {
        total_transactions: totalTransactions,
        total_volume: totalVolume,
        success_rate: successRate,
        failed_payments: failedPayments,
      },
      chart_data: chartData,
      payment_method_breakdown: paymentMethodBreakdown,
      top_tenants: topTenants,
      failed_transactions: failedTransactions,
    }];
  });

  // 6. Tenants paginated list
  mock.onGet('/api/v1/platform/tenants').reply((config) => {
    const { plan, status, search, page = 1, limit = 10 } = config.params || {};

    let filtered = [...mockTenants];
    if (plan) {
      filtered = filtered.filter(t => t.plan === plan);
    }
    if (status) {
      const activeFilter = status === 'active';
      filtered = filtered.filter(t => t.is_active === activeFilter);
    }
    if (search) {
      filtered = filtered.filter(t => t.business_name.toLowerCase().includes(search.toLowerCase()));
    }

    const startIdx = (page - 1) * limit;
    const endIdx = page * limit;
    const items = filtered.slice(startIdx, endIdx);
    const pageCount = Math.ceil(filtered.length / limit);

    return [200, {
      tenants: items,
      page_count: pageCount,
      total_count: filtered.length,
    }];
  });

  // 7. Get Tenant Detail
  mock.onGet(/\/api\/v1\/platform\/tenants\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop();
    const tenant = mockTenants.find(t => t.id === id);

    if (!tenant) {
      return [404, { error: { message: 'Tenant not found' } }];
    }

    return [200, {
      tenant,
      metrics: {
        total_revenue: tenant.monthly_revenue * 12,
        total_transactions: tenant.transaction_count * 12,
        staff_count: 4,
        monthly_revenue: tenant.monthly_revenue,
      },
      owner: {
        name: 'Kofi Mensah',
        email: `kofi@${tenant.business_name.toLowerCase().replace(/[^a-z]/g, '')}.com`,
        phone: '+233241112222',
      },
      recent_transactions: [
        { id: 'tx-01', date: '2026-06-04 12:30', amount: 150, channel: 'pos' as const, payment_method: 'cash' as const, status: 'success' as const },
        { id: 'tx-02', date: '2026-06-04 11:15', amount: 480, channel: 'online' as const, payment_method: 'mobile_money' as const, status: 'success' as const },
        { id: 'tx-03', date: '2026-06-03 16:00', amount: 220, channel: 'pos' as const, payment_method: 'card' as const, status: 'success' as const },
      ],
      storefront_deployment: tenant.plan !== 'pos_only' ? {
        vercel_url: `https://${tenant.business_name.toLowerCase().replace(/[^a-z]/g, '')}.hpos.shop`,
        template_name: 'Modern Minimalist Retail',
        deployed_at: '2026-06-01 14:00',
      } : undefined,
      staff: [
        { id: 'st-1', name: 'Kofi Mensah', email: `kofi@${tenant.business_name.toLowerCase().replace(/[^a-z]/g, '')}.com`, role: 'owner' as const, is_active: true, last_login: '2026-06-04 08:30' },
        { id: 'st-2', name: 'Ama Boateng', email: `ama@${tenant.business_name.toLowerCase().replace(/[^a-z]/g, '')}.com`, role: 'manager' as const, is_active: true, last_login: '2026-06-04 07:15' },
      ],
    }];
  });

  // 8. Update Tenant
  mock.onPut(/\/api\/v1\/platform\/tenants\/[^/]+$/).reply((config) => {
    const id = config.url?.split('/').pop();
    const idx = mockTenants.findIndex(t => t.id === id);

    if (idx === -1) {
      return [404, { error: { message: 'Tenant not found' } }];
    }

    const updates = JSON.parse(config.data);
    mockTenants[idx] = { ...mockTenants[idx], ...updates };

    return [200, mockTenants[idx]];
  });

  // 9. Rotate Tenant API Key
  mock.onPost(/\/api\/v1\/platform\/tenants\/[^/]+\/rotate-key$/).reply((config) => {
    const urlParts = config.url?.split('/') || [];
    const id = urlParts[urlParts.length - 2];
    const idx = mockTenants.findIndex(t => t.id === id);

    if (idx === -1) {
      return [404, { error: { message: 'Tenant not found' } }];
    }

    const entropy = Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const newPrefix = entropy.substring(0, 4);
    
    mockTenants[idx] = { 
      ...mockTenants[idx], 
      api_key_prefix: newPrefix 
    };

    return [200, {
      api_key: `hpos_live_${entropy}`
    }];
  });

  // 10. Create Tenant
  mock.onPost('/api/v1/platform/tenants').reply((config) => {
    const payload = JSON.parse(config.data);
    const entropy = Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    
    const newTenant = {
      id: `tn-${Math.random().toString(36).substring(2, 9)}`,
      business_name: payload.business_name,
      plan: payload.plan,
      is_active: true,
      date_created: format(new Date(), 'yyyy-MM-dd'),
      api_key_prefix: entropy.substring(0, 4),
      monthly_revenue: 0,
      transaction_count: 0,
      paystack_subaccount_code: 'ACCT_' + Math.random().toString().substring(2, 12),
    };

    mockTenants = [newTenant, ...mockTenants];

    return [201, {
      tenant: newTenant,
      api_key: `hpos_live_${entropy}`
    }];
  });

  // 11. Platform Settings
  mock.onGet('/api/v1/platform/settings').reply(200, mockSettings);
  mock.onPut('/api/v1/platform/settings').reply((config) => {
    mockSettings = JSON.parse(config.data);
    return [200, mockSettings];
  });

  // 12. System Health
  mock.onGet('/api/v1/platform/health').reply(200, {
    database: {
      status: 'connected',
      connection_pool_size: 24,
      max_connections: 100,
    },
    redis: {
      status: 'connected',
      memory_used_mb: 4.6,
    },
    paystack_api: {
      status: 'connected',
      last_successful_webhook: '12:54 GMT',
    },
    api_response_time: 142,
    error_rate: 0.15,
    webhook_delivery_rate: 99.85,
  });

  // Catch-all
  mock.onGet(/.*/).passThrough();
  mock.onPost(/.*/).passThrough();
  mock.onPut(/.*/).passThrough();
}
