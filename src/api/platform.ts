import apiClient from './client';

export interface PlanDistributionItem {
  plan: string;
  count: number;
  percentage: number;
}

export interface PlatformSummary {
  active_tenants: number;
  platform_revenue_this_month: number;
  transactions_today: number;
  new_tenants_this_month: number;
  plan_distribution: PlanDistributionItem[];
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
}

export interface Tenant {
  id: string;
  business_name: string;
  plan: string;
  is_active: boolean;
  date_created: string;
  slug?: string;
  api_key_prefix?: string;
  monthly_revenue?: number;
  transaction_count?: number;
}

export const getPlatformSummary = async (startDate: string, endDate: string) => {
  const { data } = await apiClient.get<PlatformSummary>('/api/v1/platform/analytics/summary', {
    params: { start_date: startDate, end_date: endDate },
  });
  return data;
};

export const getRevenueAnalytics = async (startDate: string, endDate: string, groupBy = 'day') => {
  const { data } = await apiClient.get<RevenueDataPoint[]>('/api/v1/platform/analytics/revenue', {
    params: { start_date: startDate, end_date: endDate, group_by: groupBy },
  });
  return data;
};

export const getPlatformTenants = async (params?: { limit?: number; sort?: string }) => {
  const { data } = await apiClient.get<any>('/api/v1/platform/tenants', {
    params,
  });
  return (data?.success?.data?.tenants || data) as Tenant[];
};

export interface PlatformTenantsResponse {
  tenants: Tenant[];
  page_count: number;
  total_count: number;
}

export const getPlatformTenantsPaginated = async (params: {
  page?: number;
  limit?: number;
  plan?: string;
  status?: string;
  search?: string;
}) => {
  const backendParams: any = {
    page: params.page,
    per_page: params.limit,
    status: params.status,
    search: params.search,
  };
  const { data } = await apiClient.get<any>('/api/v1/platform/tenants', {
    params: backendParams,
  });
  
  const resData = data?.success?.data;
  return {
    tenants: resData?.tenants || [],
    page_count: resData?.pagination?.total_pages || 1,
    total_count: resData?.pagination?.total_items || 0,
  } as PlatformTenantsResponse;
};

export const updateTenant = async (id: string, updates: Partial<Tenant>) => {
  const { data } = await apiClient.put<any>(`/api/v1/platform/tenants/${id}`, updates);
  return (data?.success?.data?.tenant || data) as Tenant;
};

export interface CreateTenantPayload {
  business_name: string;
  plan: 'starter' | 'standard' | 'business' | 'ecom_only';
  owner_first_name: string;
  owner_last_name: string;
  owner_email: string;
  owner_phone?: string;
  owner_password?: string;
}

export interface CreateTenantResponse {
  tenant: Tenant;
  api_key: string;
}

export const createTenant = async (payload: CreateTenantPayload) => {
  const backendPayload = {
    businessName: payload.business_name,
    plan: payload.plan,
    ownerFirstName: payload.owner_first_name,
    ownerLastName: payload.owner_last_name,
    ownerEmail: payload.owner_email,
    ownerPhone: payload.owner_phone,
    ownerPassword: payload.owner_password,
  };
  const { data } = await apiClient.post<any>('/api/v1/platform/tenants', backendPayload);
  const resData = data?.success?.data || {};
  return {
    tenant: resData.tenant,
    api_key: resData.api_key,
  } as CreateTenantResponse;
};

export interface TenantDetailResponse {
  tenant: Tenant & {
    api_key_prefix: string;
    paystack_subaccount_code?: string;
  };
  metrics: {
    total_revenue: number;
    total_transactions: number;
    staff_count: number;
    monthly_revenue: number;
  };
  owner: {
    name: string;
    email: string;
    phone?: string;
  };
  recent_transactions: {
    id: string;
    date: string;
    amount: number;
    channel: 'online' | 'pos';
    payment_method: 'cash' | 'card' | 'mobile_money';
    status: 'success' | 'failed' | 'pending';
  }[];
  storefront_deployment?: {
    vercel_url: string;
    template_name: string;
    deployed_at: string;
  };
  staff: {
    id: string;
    name: string;
    email: string;
    role: 'owner' | 'manager' | 'cashier';
    is_active: boolean;
    last_login?: string;
  }[];
}

export const getPlatformTenantDetail = async (id: string) => {
  const { data } = await apiClient.get<any>(`/api/v1/platform/tenants/${id}`);
  return (data?.success?.data || data) as TenantDetailResponse;
};

export const rotateTenantApiKey = async (id: string) => {
  const { data } = await apiClient.post<any>(`/api/v1/platform/tenants/${id}/api-key`);
  const resData = data?.success?.data || {};
  return {
    api_key: resData.api_key || resData.apiKey,
  };
};

export interface PlatformRevenueDetails {
  chart_data: {
    date: string;
    revenue: number;
    fees: number;
  }[];
  summary: {
    total_revenue: number;
    platform_fees: number;
    avg_daily_revenue: number;
    top_tenant_name: string;
    top_tenant_revenue: number;
  };
  plan_breakdown: {
    pos_only_revenue: number;
    ecommerce_only_revenue: number;
    full_suite_revenue: number;
  };
  tenant_breakdown: {
    tenant_id: string;
    tenant_name: string;
    plan: string;
    total_revenue: number;
    transaction_count: number;
    avg_transaction_value: number;
  }[];
}

export const getDetailedRevenueAnalytics = async (startDate: string, endDate: string, groupBy = 'day') => {
  const { data } = await apiClient.get<any>('/api/v1/platform/analytics/revenue/detailed', {
    params: { start_date: startDate, end_date: endDate, group_by: groupBy },
  });
  return (data?.success?.data || data) as PlatformRevenueDetails;
};

export interface PlatformTransactionDetails {
  summary: {
    total_transactions: number;
    total_volume: number;
    success_rate: number;
    failed_payments: number;
  };
  chart_data: {
    date: string;
    count: number;
    volume: number;
  }[];
  payment_method_breakdown: {
    method: 'cash' | 'mobile_money' | 'card' | 'credit';
    count: number;
    volume: number;
    percentage: number;
  }[];
  top_tenants: {
    tenant_id: string;
    tenant_name: string;
    transaction_count: number;
    total_volume: number;
    avg_transaction_value: number;
  }[];
  failed_transactions: {
    id: string;
    date: string;
    tenant_name: string;
    amount: number;
    failure_reason: string;
  }[];
}

export const getDetailedTransactionAnalytics = async (startDate: string, endDate: string) => {
  const { data } = await apiClient.get<any>('/api/v1/platform/analytics/transactions/detailed', {
    params: { start_date: startDate, end_date: endDate },
  });
  return (data?.success?.data || data) as PlatformTransactionDetails;
};

export interface PlatformSettingsData {
  platform_fee_percentage: number;
  default_tax_rate: number;
  supported_payment_methods: ('cash' | 'mtn_momo' | 'vodafone_cash' | 'airteltigo_money' | 'card')[];
}

export const getPlatformSettings = async () => {
  const { data } = await apiClient.get<PlatformSettingsData>('/api/v1/platform/settings');
  return data;
};

export const updatePlatformSettings = async (settings: PlatformSettingsData) => {
  const { data } = await apiClient.put<PlatformSettingsData>('/api/v1/platform/settings', settings);
  return data;
};

export interface SystemHealthData {
  database: {
    status: 'connected' | 'error';
    connection_pool_size: number;
    max_connections: number;
  };
  redis: {
    status: 'connected' | 'error';
    memory_used_mb: number;
  };
  paystack_api: {
    status: 'connected' | 'error';
    last_successful_webhook: string;
  };
  api_response_time: number; // ms
  error_rate: number; // percentage
  webhook_delivery_rate: number; // percentage
}

export const getSystemHealth = async () => {
  const { data } = await apiClient.get<SystemHealthData>('/api/v1/platform/health');
  return data;
};




