import { format, parseISO, isValid } from 'date-fns'
import { ko } from 'date-fns/locale'
import { SHIPPING_STATUS_LABELS, SHIPPING_COMPANIES, DATE_FORMATS } from './constants'

// 날짜 포맷팅
export const formatDate = (
  date: string | Date,
  formatStr: string = DATE_FORMATS.DISPLAY
): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) return 'Invalid Date'
    return format(dateObj, formatStr, { locale: ko })
  } catch (error) {
    console.error('Date formatting error:', error)
    return 'Invalid Date'
  }
}

// 상대 시간 표시 (예: "2시간 전")
export const formatRelativeTime = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) return 'Invalid Date'

    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)

    if (diffInSeconds < 60) return '방금 전'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}일 전`

    return formatDate(dateObj, DATE_FORMATS.DATE_ONLY)
  } catch (error) {
    console.error('Relative time formatting error:', error)
    return 'Invalid Date'
  }
}

// 배송 상태 라벨 가져오기
export const getShippingStatusLabel = (status: string): string => {
  return SHIPPING_STATUS_LABELS[status as keyof typeof SHIPPING_STATUS_LABELS] || status
}

// 배송사 이름 가져오기
export const getShippingCompanyName = (code: string): string => {
  return SHIPPING_COMPANIES[code as keyof typeof SHIPPING_COMPANIES] || code
}

// 숫자 포맷팅 (천 단위 콤마)
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('ko-KR').format(num)
}

// 통화 포맷팅
export const formatCurrency = (amount: number, currency: string = 'KRW'): string => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency,
  }).format(amount)
}

// 문자열 자르기
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// 이메일 마스킹
export const maskEmail = (email: string): string => {
  const [username, domain] = email.split('@')
  if (!username || !domain) return email

  const maskedUsername = username.length > 2
    ? username.slice(0, 2) + '*'.repeat(username.length - 2)
    : username

  return `${maskedUsername}@${domain}`
}

// 전화번호 마스킹
export const maskPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length < 8) return phone

  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3')
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-***-$3')
  }

  return phone
}

// 주소 포맷팅
export const formatAddress = (address: {
  address1: string
  address2?: string
  city: string
  state: string
  zip: string
  country: string
}): string => {
  const parts = [
    address.address1,
    address.address2,
    address.city,
    address.state,
    address.zip,
    address.country
  ].filter(Boolean)

  return parts.join(' ')
}

// 클래스명 조합
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ')
}

// 딥 클론
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T
  if (typeof obj === 'object') {
    const clonedObj = {} as T
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
  return obj
}

// 디바운스 함수
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// 스로틀 함수
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// UUID 생성
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// 로컬 스토리지 헬퍼
export const storage = {
  get: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch (error) {
      console.error('Storage get error:', error)
      return null
    }
  },

  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('Storage set error:', error)
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Storage remove error:', error)
    }
  },

  clear: (): void => {
    try {
      localStorage.clear()
    } catch (error) {
      console.error('Storage clear error:', error)
    }
  }
}

// URL 파라미터 파싱
export const parseUrlParams = (search: string): Record<string, string> => {
  const params = new URLSearchParams(search)
  const result: Record<string, string> = {}

  for (const [key, value] of params.entries()) {
    result[key] = value
  }

  return result
}

// 에러 메시지 추출
export const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error
  if (error?.message) return error.message
  if (error?.response?.data?.message) return error.response.data.message
  if (error?.response?.data?.error) return error.response.data.error
  return '알 수 없는 오류가 발생했습니다.'
}
