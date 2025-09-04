import axios, { AxiosInstance, AxiosResponse } from 'axios'

// API 기본 URL 설정
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

// Axios 인스턴스 생성
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 요청 인터셉터
api.interceptors.request.use(
  (config) => {
    // 로컬 스토리지에서 토큰 가져오기 (필요시)
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 응답 인터셉터
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료 시 로그인 페이지로 리다이렉트
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API 응답 타입
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// OAuth 관련 API
export const oauthApi = {
  // OAuth 상태 확인 (특정 몰)
  getStatus: (mallId: string): Promise<ApiResponse<{ status: string; has_token: boolean; token_preview?: string; error?: string; mall_id?: string }>> =>
    api.get(`/oauth/status?mall_id=${encodeURIComponent(mallId)}`).then(res => res.data),

  // 토큰 갱신
  refreshToken: (mallId: string): Promise<ApiResponse<{ mall_id: string; token_preview: string; expires_at: string }>> =>
    api.post('/oauth/refresh', { mall_id: mallId }).then(res => res.data),
}

// 주문 관련 API
export interface Order {
  order_id: string
  order_date: string
  status: string
  customer_name: string
  customer_email: string
  shipping_address: {
    address1: string
    address2?: string
    city: string
    state: string
    zip: string
    country: string
  }
  items: Array<{
    product_id: string
    product_name: string
    variant_id?: string
    quantity: number
    price: number
  }>
  total_amount: number
  currency: string
  shipments?: Array<{
    tracking_no: string
    shipping_company_code: string
    status: string
    created_at: string
  }>
}

export interface OrderQueryParams {
  start_date?: string
  end_date?: string
  status?: string
  limit?: number
  offset?: number
  sort?: 'date_asc' | 'date_desc' | 'order_id_asc' | 'order_id_desc'
}

export interface OrderStats {
  period: {
    start_date?: string
    end_date?: string
  }
  stats: {
    shipping: number
    delivered: number
    returned: number
    cancelled: number
  }
}

export const ordersApi = {
  // 주문 목록 조회
  getOrders: (params?: OrderQueryParams): Promise<ApiResponse<{ data: Order[]; pagination: any }>> =>
    api.get('/api/orders', { params }).then(res => res.data),

  // 특정 주문 상세 조회
  getOrder: (orderId: string): Promise<ApiResponse<{ data: Order }>> =>
    api.get(`/api/orders/${orderId}`).then(res => res.data),

  // 주문의 배송 로그 조회
  getOrderShipments: (orderId: string): Promise<ApiResponse<{ data: any[] }>> =>
    api.get(`/api/orders/${orderId}/shipments`).then(res => res.data),

  // 주문 통계 조회
  getOrderStats: (params?: { start_date?: string; end_date?: string }): Promise<ApiResponse<{ data: OrderStats }>> =>
    api.get('/api/orders/stats/summary', { params }).then(res => res.data),
}

// 웹훅 관련 API
export interface WebhookTestData {
  order_id: string
  tracking_no: string
  shipping_company_code: string
  status: 'shipping' | 'delivered' | 'returned'
  items?: Array<{
    product_id: string
    variant_id?: string
    quantity: number
  }>
}

export const webhookApi = {
  // 웹훅 테스트
  testWebhook: (data: WebhookTestData): Promise<ApiResponse> =>
    api.post('/webhook/test', data).then(res => res.data),

  // 웹훅 상태 확인
  getStatus: (): Promise<ApiResponse<{ status: string; timestamp: string; endpoints: any }>> =>
    api.get('/webhook/status').then(res => res.data),
}

// 관리자 인증 API
export const authApi = {
  // 관리자 로그인
  adminLogin: (credentials: { username: string; password: string }): Promise<ApiResponse<{ authenticated: boolean; timestamp: string }>> =>
    api.post('/api/auth/admin/login', credentials).then(res => res.data),

  // 관리자 로그아웃
  adminLogout: (): Promise<ApiResponse> =>
    api.post('/api/auth/admin/logout').then(res => res.data),
}

// 헬스 체크
export const healthApi = {
  check: (): Promise<{ status: string; timestamp: string; version: string }> =>
    api.get('/health').then(res => res.data),
}

export default api
