import apiClient from './client';

export async function platformLogin(email: string, password: string) {
  const response = await apiClient.post('/api/v1/platform/auth/login', {
    email,
    password,
  });
  
  const data = response.data?.data || response.data || {};
  return {
    token: data.token || data.access_token,
    refreshToken: data.refresh_token,
    adminUser: data.admin || data.adminUser || null,
  };
}
