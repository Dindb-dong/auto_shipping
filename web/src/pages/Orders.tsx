import { useState } from 'react'
import { useQuery } from 'react-query'
import { Search, Download, RefreshCw, Package, MapPin } from 'lucide-react'
import { ordersApi, Order } from '../utils/api'
import { formatNumber, formatDate, getShippingStatusLabel } from '../utils/helpers'
import { SORT_OPTIONS, SHIPPING_STATUS_LABELS } from '../utils/constants'

const Orders = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('date_desc')
  // 기본 날짜 범위 설정 (일주일 전 ~ 오늘)
  const getDefaultDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  };

  const [dateRange, setDateRange] = useState(getDefaultDateRange())

  // 주문 목록 조회
  const { data: ordersData, isLoading, refetch } = useQuery(
    ['orders', { statusFilter, sortBy, dateRange }],
    () => ordersApi.getOrders({
      status: statusFilter || undefined,
      sort: sortBy as any,
      start_date: dateRange.start || undefined,
      end_date: dateRange.end || undefined,
      limit: 100
    }),
    {
      refetchInterval: 30000,
    }
  )

  const orders = (ordersData?.data as any) || []

  // 검색 필터링
  const filteredOrders = orders.filter((order: Order) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      order.order_id.toLowerCase().includes(searchLower) ||
      order.customer_name.toLowerCase().includes(searchLower) ||
      order.customer_email.toLowerCase().includes(searchLower)
    )
  })

  const handleRefresh = () => {
    refetch()
  }

  const handleExport = () => {
    // CSV 내보내기 로직
    const csvContent = [
      ['주문번호', '고객명', '이메일', '주문일시', '상태', '금액', '배송지'].join(','),
      ...filteredOrders.map((order: Order) => [
        order.order_id,
        order.customer_name,
        order.customer_email,
        formatDate(order.order_date),
        getShippingStatusLabel(order.status),
        order.total_amount,
        `${order.shipping_address.city} ${order.shipping_address.address1}`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">주문 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            주문 목록을 조회하고 관리하세요.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            className="btn btn-secondary"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
          <button
            onClick={handleExport}
            className="btn btn-primary"
            disabled={filteredOrders.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            내보내기
          </button>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="card overflow-hidden">
        <div className="card-body">
          <div className="flex flex-wrap gap-3">
            {/* 검색 */}
            <div className="relative flex-[2] min-w-[240px] min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="주문번호, 고객명으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input w-full pl-10"
              />
            </div>

            {/* 상태 필터 */}
            <div className="flex-1 min-w-[160px] min-w-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input w-full"
              >
                <option value="">전체 상태</option>
                {Object.entries(SHIPPING_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* 정렬 */}
            <div className="flex-1 min-w-[160px] min-w-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input w-full"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 날짜 범위 */}
            <div className="flex items-center gap-2 flex-[1.8] min-w-[260px] min-w-0">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                className="input w-full min-w-0"
                placeholder="시작일"
              />
              <span className="text-gray-400">~</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                className="input w-full min-w-0"
                placeholder="종료일"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 주문 목록 */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              주문 목록 ({filteredOrders.length}개)
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Package className="h-4 w-4" />
              <span>총 {orders.length}개 주문</span>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">주문번호</th>
                    <th className="table-header-cell">고객 정보</th>
                    <th className="table-header-cell">주문일시</th>
                    <th className="table-header-cell">배송지</th>
                    <th className="table-header-cell">상태</th>
                    <th className="table-header-cell">금액</th>
                    <th className="table-header-cell">송장번호</th>
                    <th className="table-header-cell">작업</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {filteredOrders.map((order: Order) => (
                    <tr key={order.order_id} className="table-row">
                      <td className="table-cell">
                        <div className="text-sm font-medium text-gray-900">
                          {order.order_id}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-900">
                          {order.customer_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.customer_email}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-900">
                          {formatDate(order.order_date)}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center text-sm text-gray-900">
                          <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                          <div>
                            <div>{order.shipping_address.city}</div>
                            <div className="text-gray-500">
                              {order.shipping_address.address1}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${order.status === 'shipping' ? 'badge-info' :
                          order.status === 'delivered' ? 'badge-success' :
                            order.status === 'cancelled' ? 'badge-danger' :
                              'badge-warning'
                          }`}>
                          {getShippingStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-900">
                          {formatNumber(order.total_amount)}원
                        </div>
                      </td>
                      <td className="table-cell">
                        {order.shipments && order.shipments.length > 0 ? (
                          <div className="text-sm text-gray-900">
                            {order.shipments[0].tracking_no}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">미입력</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-2">
                          <button className="text-primary-600 hover:text-primary-900 text-sm">
                            상세보기
                          </button>
                          {(!order.shipments || order.shipments.length === 0) && (
                            <button className="text-green-600 hover:text-green-900 text-sm">
                              송장입력
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm || statusFilter ? '검색 결과가 없습니다' : '주문이 없습니다'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter
                  ? '다른 검색 조건을 시도해보세요.'
                  : '아직 등록된 주문이 없습니다.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Orders
