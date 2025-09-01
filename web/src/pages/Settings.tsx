import { useState } from 'react'
import { useQuery } from 'react-query'
import {
  Settings as SettingsIcon,
  Link,
  Key,
  Database,
  TestTube,
  CheckCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react'
import { oauthApi, webhookApi } from '../utils/api'
import { formatDate } from '../utils/helpers'

const Settings = () => {
  const [activeTab, setActiveTab] = useState('oauth')

  // OAuth 상태 조회
  const { data: oauthStatus, refetch: refetchOauth } = useQuery(
    'oauthStatus',
    oauthApi.getStatus,
    {
      refetchInterval: 30000,
    }
  )

  // 웹훅 상태 조회
  const { data: webhookStatus, refetch: refetchWebhook } = useQuery(
    'webhookStatus',
    webhookApi.getStatus,
    {
      refetchInterval: 30000,
    }
  )

  const handleOAuthInstall = async () => {
    try {
      const response = await oauthApi.getInstallUrl()
      if (response.success && response.data?.install_url) {
        window.open(response.data.install_url, '_blank')
      }
    } catch (error) {
      console.error('OAuth install error:', error)
    }
  }

  const handleWebhookTest = async () => {
    try {
      const testData = {
        order_id: `TEST-${Date.now()}`,
        tracking_no: '123456789012',
        shipping_company_code: 'kr.cjlogistics',
        status: 'shipping' as const,
        items: [{
          product_id: 'test-product',
          quantity: 1
        }]
      }

      const response = await webhookApi.testWebhook(testData)
      if (response.success) {
        alert('웹훅 테스트가 성공했습니다!')
      } else {
        alert(`웹훅 테스트 실패: ${response.error}`)
      }
    } catch (error) {
      console.error('Webhook test error:', error)
      alert('웹훅 테스트 중 오류가 발생했습니다.')
    }
  }

  const tabs = [
    { id: 'oauth', name: '카페24 연동', icon: Link },
    { id: 'webhook', name: '웹훅 설정', icon: Key },
    { id: 'database', name: '데이터베이스', icon: Database },
    { id: 'test', name: '테스트', icon: TestTube },
  ]

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
        <p className="mt-1 text-sm text-gray-500">
          시스템 설정을 관리하고 상태를 확인하세요.
        </p>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="space-y-6">
        {/* 카페24 연동 */}
        {activeTab === 'oauth' && (
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">카페24 OAuth 연동</h3>
                <p className="mt-1 text-sm text-gray-500">
                  카페24 API와의 연동 상태를 확인하고 관리하세요.
                </p>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className={`h-3 w-3 rounded-full mr-3 ${oauthStatus?.data?.has_token ? 'bg-green-400' : 'bg-red-400'
                        }`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {oauthStatus?.data?.has_token ? '연동됨' : '연동 안됨'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {oauthStatus?.data?.has_token
                            ? `토큰: ${oauthStatus.data.token_preview}`
                            : '카페24 앱을 설치해주세요.'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => refetchOauth()}
                        className="btn btn-secondary"
                      >
                        상태 새로고침
                      </button>
                      {!oauthStatus?.data?.has_token && (
                        <button
                          onClick={handleOAuthInstall}
                          className="btn btn-primary"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          앱 설치
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">필요 권한</h4>
                      <ul className="text-sm text-gray-500 space-y-1">
                        <li>• mall.read_order (주문 조회)</li>
                        <li>• mall.write_order (주문 수정)</li>
                      </ul>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">콜백 URL</h4>
                      <p className="text-sm text-gray-500">
                        https://api.your-domain.com/oauth/callback
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 웹훅 설정 */}
        {activeTab === 'webhook' && (
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">로지뷰 웹훅 설정</h3>
                <p className="mt-1 text-sm text-gray-500">
                  로지뷰에서 배송 정보를 받을 웹훅 엔드포인트 설정입니다.
                </p>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className={`h-3 w-3 rounded-full mr-3 ${webhookStatus?.data?.status === 'active' ? 'bg-green-400' : 'bg-red-400'
                        }`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {webhookStatus?.data?.status === 'active' ? '활성' : '비활성'}
                        </p>
                        <p className="text-sm text-gray-500">
                          웹훅 엔드포인트 상태
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => refetchWebhook()}
                      className="btn btn-secondary"
                    >
                      상태 새로고침
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">웹훅 URL</h4>
                      <div className="flex items-center space-x-2">
                        <code className="flex-1 p-2 bg-gray-100 rounded text-sm">
                          https://api.your-domain.com/webhook/logiview
                        </code>
                        <button className="btn btn-secondary">
                          복사
                        </button>
                      </div>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">인증 헤더</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500 w-20">Client ID:</span>
                          <code className="flex-1 p-2 bg-gray-100 rounded text-sm">
                            your_cf_access_client_id
                          </code>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500 w-20">Secret:</span>
                          <code className="flex-1 p-2 bg-gray-100 rounded text-sm">
                            your_cf_access_client_secret
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 데이터베이스 */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">데이터베이스 정보</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Supabase 데이터베이스 연결 정보입니다.
                </p>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full bg-green-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">연결됨</p>
                        <p className="text-sm text-gray-500">Supabase PostgreSQL</p>
                      </div>
                    </div>
                    <span className="text-sm text-green-600">정상</span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">테이블</h4>
                      <ul className="text-sm text-gray-500 space-y-1">
                        <li>• oauth_tokens</li>
                        <li>• shipment_logs</li>
                        <li>• login_logs</li>
                      </ul>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">백업</h4>
                      <p className="text-sm text-gray-500">
                        자동 백업 활성화됨
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 테스트 */}
        {activeTab === 'test' && (
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">시스템 테스트</h3>
                <p className="mt-1 text-sm text-gray-500">
                  각 시스템의 연결 상태를 테스트할 수 있습니다.
                </p>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <button
                      onClick={handleWebhookTest}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <TestTube className="h-5 w-5 text-blue-600 mr-3" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-gray-900">웹훅 테스트</p>
                          <p className="text-sm text-gray-500">로지뷰 웹훅 연결 테스트</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => refetchOauth()}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <Link className="h-5 w-5 text-green-600 mr-3" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-gray-900">OAuth 테스트</p>
                          <p className="text-sm text-gray-500">카페24 API 연결 테스트</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Settings
