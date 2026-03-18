// rwa-mobile/lib/api.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-domain.com';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
});

// Add auth header
api.interceptors.request.use(async (config) => {
  const walletAddress = await SecureStore.getItemAsync('walletAddress');
  if (walletAddress) {
    config.headers['x-wallet-address'] = walletAddress;
  }
  return config;
});

// API methods
export const dealsApi = {
  getAll: (params?: { status?: string; page?: number }) => 
    api.get('/trade/deals', { params }),
  
  getById: (id: string) => 
    api.get(`/trade/deals/${id}`),
  
  create: (data: any) => 
    api.post('/trade/deals', data),
  
  updateStage: (id: string, stage: string) => 
    api.patch(`/trade/deals/${id}`, { stage }),
};

export const messagesApi = {
  getByDeal: (dealId: string) => 
    api.get(`/trade/messages?dealId=${dealId}`),
  
  send: (data: { dealId: string; content: string }) => 
    api.post('/trade/messages', data),
};

export const notificationsApi = {
  getAll: (params?: { page?: number; unread?: boolean }) => 
    api.get('/notifications', { params }),
  
  markRead: (id: string) => 
    api.patch('/notifications', { notificationId: id }),
  
  markAllRead: () => 
    api.patch('/notifications', { markAllRead: true }),
};

export const userApi = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data: any) => api.put('/user/profile', data),
  getKYCStatus: () => api.get('/kyc/status'),
};

export default api;
