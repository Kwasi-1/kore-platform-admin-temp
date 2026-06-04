import apiClient from './client';

export interface PlanDistributionItem {
  plan: 'pos_only' | 'ecommerce_only' | 'full_suite';
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
  plan: 'pos_only' | 'ecommerce_only' | 'full_suite';
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
  const { data } = await apiClient.get<Tenant[]>('/api/v1/platform/tenants', {
    params,
  });
  return data;
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
  const { data } = await apiClient.get<PlatformTenantsResponse>('/api/v1/platform/tenants', {
    params,
  });
  return data;
};

export const updateTenant = async (id: string, updates: Partial<Tenant>) => {
  const { data } = await apiClient.put<Tenant>(`/api/v1/platform/tenants/${id}`, updates);
  return data;
};

export interface CreateTenantPayload {
  business_name: string;
  plan: 'pos_only' | 'ecommerce_only' | 'full_suite';
  owner_name: string;
  owner_email: string;
  owner_phone?: string;
}

export interface CreateTenantResponse {
  tenant: Tenant;
  api_key: string;
}

export const createTenant = async (payload: CreateTenantPayload) => {
  const { data } = await apiClient.post<CreateTenantResponse>('/api/v1/platform/tenants', payload);
  return data;
};
