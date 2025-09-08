import { useState } from 'react'
import { useQuery } from 'react-query'
import { Search, Download, RefreshCw, Package, MapPin, X } from 'lucide-react'
import { ordersApi } from '../utils/api'
import { formatDate } from '../utils/helpers'
import { SORT_OPTIONS, SHIPPING_STATUS_LABELS, SHIPPING_COMPANIES } from '../utils/constants'

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

  // 배송업체 선택 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [companySearchTerm, setCompanySearchTerm] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [selectedCompany, setSelectedCompany] = useState('0018') // 기본값: 한진택배

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
  const filteredOrders = orders.filter((order: any) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      order.order_id.toLowerCase().includes(searchLower) ||
      (order.billing_name && order.billing_name.toLowerCase().includes(searchLower)) ||
      (order.member_email && order.member_email.toLowerCase().includes(searchLower))
    )
  })

  const handleRefresh = () => {
    refetch()
  }

  const handleExport = () => {
    // CSV 내보내기 로직
    const csvContent = [
      ['주문번호', '고객명', '이메일', '주문일시', '상태', '배송지', '송장번호'].join(','),
      ...filteredOrders.map((order: any) => [
        order.order_id,
        order.billing_name || '-',
        order.member_email || '-',
        formatDate(order.order_date),
        order.shipping_status === 'M' ? '배송중' :
          order.shipping_status === 'D' || order.shipping_status === 'T' ? '배송완료' :
            order.shipping_status === 'C' ? '취소' :
              order.shipping_status || '-',
        `${order.shipping_address?.city || '-'} ${order.shipping_address?.address1 || '-'}`,
        order.tracking_no || order.shipments?.[0]?.tracking_no || '-'
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

  const handleViewDetails = (order: any) => {
    // 상세보기 모달 또는 페이지로 이동
    alert(`주문 상세보기: ${order.order_id}\n고객: ${order.billing_name}\n상태: ${order.shipping_status}`)
  }

  const handleAddTracking = (order: any) => {
    // 배송업체 선택 모달 열기
    const currentTracking = order.tracking_no || order.shipments?.[0]?.tracking_no || ''
    setSelectedOrder(order)
    setTrackingNumber(currentTracking)
    setCompanySearchTerm('')
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedOrder(null)
    setTrackingNumber('')
    setCompanySearchTerm('')
    setSelectedCompany('0018')
  }

  const handleSaveTracking = async () => {
    if (!selectedOrder || !trackingNumber.trim()) {
      alert('송장번호를 입력해주세요.')
      return
    }

    try {
      await ordersApi.updateTrackingNumber(selectedOrder.order_id, {
        tracking_no: trackingNumber.trim(),
        shipping_company_code: selectedCompany
      })

      const companyName = SHIPPING_COMPANIES.find(c => c.code === selectedCompany)?.name || '알 수 없음'
      alert(`송장번호 ${trackingNumber}가 ${companyName}으로 입력되었습니다.`)

      // 데이터 새로고침
      refetch()
      handleCloseModal()
    } catch (error: any) {
      console.error('송장번호 업데이트 실패:', error)
      alert(`송장번호 업데이트에 실패했습니다: ${error.response?.data?.message || error.message}`)
    }
  }

  // 배송업체 검색 필터링
  const filteredCompanies = SHIPPING_COMPANIES.filter(company =>
    company.name.toLowerCase().includes(companySearchTerm.toLowerCase()) ||
    company.code.includes(companySearchTerm)
  )

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
                    <th className="table-header-cell">송장번호</th>
                    <th className="table-header-cell">작업</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {filteredOrders.map((order: any) => (
                    <tr key={order.order_id} className="table-row">
                      <td className="table-cell">
                        <div className="text-sm font-medium text-gray-900">
                          {order.order_id}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-900">
                          {order.billing_name || '-'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.member_email || '-'}
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
                            <div>{order.shipping_address?.city || '-'}</div>
                            <div className="text-gray-500">
                              {order.shipping_address?.address1 || '-'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${order.shipping_status === 'M' ? 'badge-info' :
                          order.shipping_status === 'D' || order.shipping_status === 'T' ? 'badge-success' :
                            order.shipping_status === 'C' ? 'badge-danger' :
                              'badge-warning'
                          }`}>
                          {order.shipping_status === 'M' ? '배송중' :
                            order.shipping_status === 'D' || order.shipping_status === 'T' ? '배송완료' :
                              order.shipping_status === 'C' ? '취소' :
                                order.shipping_status || '-'}
                        </span>
                      </td>
                      <td className="table-cell">
                        {order.tracking_no ? (
                          <div className="text-sm text-gray-900">
                            {order.tracking_no}
                          </div>
                        ) : order.shipments && order.shipments.length > 0 ? (
                          <div className="text-sm text-gray-900">
                            {order.shipments[0].tracking_no}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">미입력</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewDetails(order)}
                            className="text-primary-600 hover:text-primary-900 text-sm"
                          >
                            상세보기
                          </button>
                          <button
                            onClick={() => handleAddTracking(order)}
                            className="text-green-600 hover:text-green-900 text-sm"
                          >
                            {order.tracking_no || order.shipments?.[0]?.tracking_no ? '송장수정' : '송장입력'}
                          </button>
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

      {/* 배송업체 선택 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col overflow-hidden">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                송장번호 입력 - {selectedOrder?.order_id}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              {/* 송장번호 입력 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  송장번호
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="송장번호를 입력하세요"
                  className="input w-full"
                />
              </div>

              {/* 배송업체 검색 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  배송업체 검색
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={companySearchTerm}
                    onChange={(e) => setCompanySearchTerm(e.target.value)}
                    placeholder="배송업체명 또는 코드로 검색..."
                    className="input w-full pl-10"
                  />
                </div>
              </div>

              {/* 배송업체 목록 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  배송업체 선택
                </label>
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  {filteredCompanies.map((company) => (
                    <button
                      key={company.code}
                      onClick={() => setSelectedCompany(company.code)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 ${selectedCompany === company.code ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{company.name}</div>
                          <div className="text-sm text-gray-500">코드: {company.code}</div>
                        </div>
                        {selectedCompany === company.code && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
              <button
                onClick={handleCloseModal}
                className="btn btn-secondary"
              >
                취소
              </button>
              <button
                onClick={handleSaveTracking}
                className="btn btn-primary"
                disabled={!trackingNumber.trim()}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Orders
