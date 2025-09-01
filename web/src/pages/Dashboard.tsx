import { useQuery } from 'react-query'
import {
  Package,
  Truck,
  CheckCircle,
  AlertCircle,
  XCircle,
  Settings
} from 'lucide-react'
import { ordersApi } from '../utils/api'
import { formatNumber, formatDate } from '../utils/helpers'

const Dashboard = () => {
  // 주문 통계 조회
  const { data: statsData, isLoading: statsLoading } = useQuery(
    'orderStats',
    () => ordersApi.getOrderStats(),
    {
      refetchInterval: 30000, // 30초마다 갱신
    }
  )

  // 최근 주문 조회
  const { data: recentOrdersData, isLoading: ordersLoading } = useQuery(
    'recentOrders',
    () => ordersApi.getOrders({ limit: 10, sort: 'date_desc' }),
    {
      refetchInterval: 30000,
    }
  )

  const stats = statsData?.data?.data?.stats || {
    shipping: 0,
    delivered: 0,
    returned: 0,
    cancelled: 0,
  }

  const recentOrders = recentOrdersData?.data?.data || []

  const statCards = [
    {
      name: '배송중',
      value: stats.shipping,
      icon: Truck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: '배송완료',
      value: stats.delivered,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: '반품',
      value: stats.returned,
      icon: AlertCircle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      name: '취소',
      value: stats.cancelled,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ]

  if (statsLoading || ordersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="mt-1 text-sm text-gray-500">
          로지뷰 물류 발송 대행 시스템 현황을 확인하세요.
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.name} className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className={`flex-shrink-0 p-3 rounded-md ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatNumber(stat.value)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 최근 주문 */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">최근 주문</h3>
        </div>
        <div className="card-body p-0">
          {recentOrders.length > 0 ? (
            <div className="overflow-hidden">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">주문번호</th>
                    <th className="table-header-cell">고객명</th>
                    <th className="table-header-cell">주문일시</th>
                    <th className="table-header-cell">상태</th>
                    <th className="table-header-cell">금액</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {recentOrders.map((order) => (
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
                        <span className={`badge ${order.status === 'shipping' ? 'badge-info' :
                          order.status === 'delivered' ? 'badge-success' :
                            order.status === 'cancelled' ? 'badge-danger' :
                              'badge-warning'
                          }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-900">
                          {formatNumber(order.total_amount)}원
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
              <h3 className="mt-2 text-sm font-medium text-gray-900">주문이 없습니다</h3>
              <p className="mt-1 text-sm text-gray-500">
                아직 등록된 주문이 없습니다.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 시스템 상태 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">시스템 상태</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-2 w-2 rounded-full bg-green-400 mr-3" />
                  <span className="text-sm text-gray-900">API 서버</span>
                </div>
                <span className="text-sm text-green-600">정상</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-2 w-2 rounded-full bg-green-400 mr-3" />
                  <span className="text-sm text-gray-900">데이터베이스</span>
                </div>
                <span className="text-sm text-green-600">정상</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-2 w-2 rounded-full bg-green-400 mr-3" />
                  <span className="text-sm text-gray-900">카페24 연동</span>
                </div>
                <span className="text-sm text-green-600">연결됨</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">빠른 작업</h3>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              <a
                href="/orders"
                className="flex items-center p-3 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Package className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-sm text-gray-900">주문 목록 보기</span>
              </a>
              <a
                href="/settings"
                className="flex items-center p-3 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Settings className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-sm text-gray-900">설정 관리</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
