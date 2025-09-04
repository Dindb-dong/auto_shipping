// 배송 상태 상수
export const SHIPPING_STATUS = {
  SHIPPING: 'shipping',
  DELIVERED: 'delivered',
  RETURNED: 'returned',
  CANCELLED: 'cancelled',
  ERROR: 'error',
} as const

export const SHIPPING_STATUS_LABELS = {
  [SHIPPING_STATUS.SHIPPING]: '배송중',
  [SHIPPING_STATUS.DELIVERED]: '배송완료',
  [SHIPPING_STATUS.RETURNED]: '반품',
  [SHIPPING_STATUS.CANCELLED]: '취소',
  [SHIPPING_STATUS.ERROR]: '오류',
} as const

// 배송사 코드 상수
export const SHIPPING_COMPANIES = {
  'kr.cjlogistics': 'CJ대한통운',
  'kr.hanjin': '한진택배',
  'kr.lotte': '롯데택배',
  'kr.kdexp': '경동택배',
  'kr.cupost': 'CU편의점택배',
  'kr.daesin': '대신택배',
  'kr.epost': '우체국택배',
  'kr.fedex': 'FedEx',
  'kr.dhl': 'DHL',
  'kr.ups': 'UPS',
} as const

// 정렬 옵션
export const SORT_OPTIONS = [
  { value: 'date_desc', label: '주문일시 (최신순)' },
  { value: 'date_asc', label: '주문일시 (오래된순)' },
  { value: 'order_id_desc', label: '주문번호 (내림차순)' },
  { value: 'order_id_asc', label: '주문번호 (오름차순)' },
] as const

// 페이지네이션 기본값
export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
  DEFAULT_OFFSET: 0,
} as const

// 날짜 형식
export const DATE_FORMATS = {
  DISPLAY: 'yyyy-MM-dd HH:mm',
  DATE_ONLY: 'yyyy-MM-dd',
  TIME_ONLY: 'HH:mm',
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
} as const

// API 엔드포인트
export const API_ENDPOINTS = {
  OAUTH: {
    INSTALL: '/oauth/install',
    STATUS: '/oauth/status',
    CALLBACK: '/oauth/callback',
  },
  ORDERS: {
    LIST: '/api/orders',
    DETAIL: (id: string) => `/api/orders/${id}`,
    SHIPMENTS: (id: string) => `/api/orders/${id}/shipments`,
    STATS: '/api/orders/stats/summary',
  },
  WEBHOOK: {
    LOGIVIEW: '/webhook/logiview',
    TEST: '/webhook/test',
    STATUS: '/webhook/status',
  },
  HEALTH: '/health',
} as const

// 로컬 스토리지 키
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme',
  ADMIN_SESSION: 'admin_session',
  SAVED_MALLS: 'saved_malls',
  CURRENT_MALL: 'current_mall',
} as const

// 테마 색상
export const THEME_COLORS = {
  PRIMARY: '#3b82f6',
  SUCCESS: '#22c55e',
  WARNING: '#f59e0b',
  DANGER: '#ef4444',
  INFO: '#06b6d4',
} as const

// 반응형 브레이크포인트
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const

// 애니메이션 지속시간
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const

// 토스트 메시지 지속시간
export const TOAST_DURATION = {
  SUCCESS: 3000,
  ERROR: 5000,
  INFO: 4000,
  WARNING: 4000,
} as const
