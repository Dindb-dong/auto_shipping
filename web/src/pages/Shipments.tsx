import { useMemo, useState } from 'react'
import { useQuery } from 'react-query'
import { Search, RefreshCw, Truck, ExternalLink } from 'lucide-react'
import { ordersApi } from '../utils/api'
import { formatDate } from '../utils/helpers'
import { SHIPPING_COMPANIES } from '../utils/constants'

const Shipments = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    }
  })

  // We reuse orders list because shipments are attached per order
  const { data, isLoading, refetch } = useQuery(
    ['shipments', { dateRange }],
    () => ordersApi.getOrders({ start_date: dateRange.start, end_date: dateRange.end, limit: 100 }),
    { refetchInterval: 30000 }
  )

  const orders = (data?.data as any) || []

  const rows = useMemo(() => {
    const items: Array<any> = []
    for (const order of orders) {
      const shipments = order.shipments || []
      if (shipments.length === 0) {
        items.push({
          order_id: order.order_id,
          order_date: order.order_date,
          tracking_no: undefined,
          shipping_company_code: undefined,
          status: order.shipping_status,
        })
      } else {
        for (const s of shipments) {
          items.push({
            order_id: order.order_id,
            order_date: order.order_date,
            tracking_no: s.tracking_no,
            shipping_company_code: s.shipping_company_code,
            status: s.status || order.shipping_status,
          })
        }
      }
    }
    return items
  }, [orders])

  const filtered = rows.filter(r => {
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    return (
      r.order_id?.toLowerCase().includes(q) ||
      r.tracking_no?.toLowerCase().includes(q) ||
      r.shipping_company_code?.toLowerCase().includes(q)
    )
  })

  const handleOpenTracking = async (orderId: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${encodeURIComponent(orderId)}/tracking`)
      const json = await res.json()
      const url = json?.data?.tracking?.url
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer')
      } else {
        alert('추적 URL을 찾을 수 없습니다. 송장번호 또는 배송사 코드를 확인해주세요.')
      }
    } catch (e: any) {
      alert(`배송조회 실패: ${e.message}`)
    }
  }

  const convertedShippingCompanyCode = (code: string) => {
    const company = SHIPPING_COMPANIES.find(comp => comp.code === code)
    return company?.name || code || '-'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">배송 현황</h1>
          <p className="mt-1 text-sm text-gray-500">주문별 송장 및 배송상태를 확인하세요.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => refetch()} className="btn btn-secondary" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="card-body">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-[2] min-w-[240px] min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="주문번호, 송장번호, 업체코드 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input w-full pl-10"
              />
            </div>
            <div className="flex items-center gap-2 flex-[1.8] min-w-[260px] min-w-0">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange((p) => ({ ...p, start: e.target.value }))}
                className="input w-full min-w-0"
                placeholder="시작일"
              />
              <span className="text-gray-400">~</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((p) => ({ ...p, end: e.target.value }))}
                className="input w-full min-w-0"
                placeholder="종료일"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">배송 목록 ({filtered.length}개)</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Truck className="h-4 w-4" />
              <span>총 {rows.length}개 배송</span>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">주문번호</th>
                    <th className="table-header-cell">주문일시</th>
                    <th className="table-header-cell">송장번호</th>
                    <th className="table-header-cell">배송업체</th>
                    <th className="table-header-cell">상태</th>
                    <th className="table-header-cell">작업</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {filtered.map((r) => (
                    <tr key={`${r.order_id}-${r.tracking_no || 'none'}`} className="table-row">
                      <td className="table-cell">
                        <div className="text-sm font-medium text-gray-900">{r.order_id}</div>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-900">{formatDate(r.order_date)}</div>
                      </td>
                      <td className="table-cell">
                        {r.tracking_no ? (
                          <div className="text-sm text-gray-900">{r.tracking_no}</div>
                        ) : (
                          <span className="text-sm text-gray-400">미입력</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-900">{convertedShippingCompanyCode(r.shipping_company_code)}</div>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${r.status === 'shipping' || r.status === 'M' ? 'badge-info' : r.status === 'delivered' || r.status === 'D' || r.status === 'T' ? 'badge-success' : r.status === 'C' ? 'badge-danger' : 'badge-warning'}`}>
                          {r.status || '-'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleOpenTracking(r.order_id)}
                            className="text-primary-600 hover:text-primary-900 text-sm inline-flex items-center"
                            disabled={!r.tracking_no}
                          >
                            배송조회
                            <ExternalLink className="h-4 w-4 ml-1" />
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
              <Truck className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">배송이 없습니다</h3>
              <p className="mt-1 text-sm text-gray-500">기간을 변경하거나 주문을 등록해보세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Shipments


