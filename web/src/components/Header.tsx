import { useState } from 'react'
import { Bell, Search, Menu, X } from 'lucide-react'
import { useQuery } from 'react-query'
import { healthApi } from '../utils/api'

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  // 검색 패널 토글이 아직 UI에 연결되지 않아 경고 방지용으로 주석 처리
  // const [isSearchOpen, setIsSearchOpen] = useState(false)

  // 헬스 체크
  const { data: healthData } = useQuery('health', healthApi.check, {
    refetchInterval: 30000, // 30초마다 체크
  })

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {/* 모바일 메뉴 버튼 */}
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
        onClick={() => setIsMobileMenuOpen(true)}
      >
        <span className="sr-only">메뉴 열기</span>
        <Menu className="h-6 w-6" />
      </button>

      {/* 구분선 */}
      <div className="h-6 w-px bg-gray-200 lg:hidden" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* 검색 */}
        <form className="relative flex flex-1" action="#" method="GET">
          <label htmlFor="search-field" className="sr-only">
            검색
          </label>
          <Search className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-gray-400" />
          <input
            id="search-field"
            className="block h-full w-full border-0 py-0 pl-8 pr-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
            placeholder="주문번호, 고객명으로 검색..."
            type="search"
            name="search"
          />
        </form>

        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* 알림 */}
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">알림 보기</span>
            <Bell className="h-6 w-6" />
          </button>

          {/* 구분선 */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" />

          {/* 시스템 상태 */}
          <div className="flex items-center gap-x-2">
            <div className={`h-2 w-2 rounded-full ${healthData?.status === 'ok' ? 'bg-green-400' : 'bg-red-400'
              }`} />
            <span className="text-sm text-gray-500">
              {healthData?.status === 'ok' ? '시스템 정상' : '시스템 오류'}
            </span>
          </div>
        </div>
      </div>

      {/* 모바일 메뉴 오버레이 */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-900/80" />
          <div className="fixed inset-y-0 left-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-600">A</span>
                </div>
                <span className="ml-2 text-xl font-bold text-gray-900">
                  Auto Shipping
                </span>
              </div>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-gray-700"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="sr-only">메뉴 닫기</span>
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-500/10">
                <div className="space-y-2 py-6">
                  <a
                    href="/"
                    className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                  >
                    대시보드
                  </a>
                  <a
                    href="/orders"
                    className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                  >
                    주문 관리
                  </a>
                  <a
                    href="/shipments"
                    className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                  >
                    배송 현황
                  </a>
                  <a
                    href="/analytics"
                    className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                  >
                    통계
                  </a>
                  <a
                    href="/settings"
                    className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                  >
                    설정
                  </a>
                </div>
                <div className="py-6">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-600">A</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-700">관리자</p>
                      <p className="text-xs text-gray-500">admin@company.com</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Header
