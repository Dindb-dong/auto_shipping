import { useState } from 'react'
import { useQuery } from 'react-query'
import { Truck, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react'
import { oauthApi } from '../utils/api'

const Login = () => {
  const [isInstalling, setIsInstalling] = useState(false)
  const [mallId, setMallId] = useState('')

  // OAuth 상태 조회 (mall_id가 있을 때만)
  const { data: oauthStatus, refetch: refetchOauth } = useQuery(
    ['oauthStatus', mallId],
    () => oauthApi.getStatus(mallId),
    {
      refetchInterval: 5000, // 5초마다 체크
      enabled: !!mallId, // mall_id가 있을 때만 쿼리 실행
    }
  )

  const handleInstall = async () => {
    if (!mallId.trim()) {
      alert('몰 ID를 입력해주세요.')
      return
    }

    setIsInstalling(true)
    try {
      // 백엔드 OAuth 설치 엔드포인트로 직접 리다이렉트
      const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
      const installUrl = `${backendUrl}/oauth/install?mall_id=${encodeURIComponent(mallId.trim())}`
      window.location.href = installUrl
    } catch (error) {
      console.error('OAuth install error:', error)
      alert('OAuth 설치 중 오류가 발생했습니다.')
    } finally {
      setIsInstalling(false)
    }
  }

  const isConnected = oauthStatus?.data?.has_token

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="flex items-center">
              <Truck className="h-12 w-12 text-primary-600" />
              <span className="ml-2 text-3xl font-bold text-gray-900">
                Auto Shipping
              </span>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            로지뷰 물류 발송 대행 시스템
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            카페24와 연동하여 주문 및 배송을 관리하세요
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {/* 몰 ID 입력 */}
          <div className="bg-white py-6 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  몰 ID (Mall ID)
                </label>
                <input
                  type="text"
                  value={mallId}
                  onChange={(e) => setMallId(e.target.value)}
                  className="w-full input"
                  placeholder="예: yourmall"
                  disabled={isConnected}
                />
                <p className="mt-1 text-xs text-gray-500">
                  카페24 관리자 페이지에서 확인할 수 있는 몰 ID를 입력하세요.
                </p>
              </div>
            </div>
          </div>

          {/* 연결 상태 */}
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="space-y-6">
              <div className="text-center">
                <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${isConnected ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                  {isConnected ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  )}
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  {isConnected ? '카페24 연동 완료' : '카페24 연동 필요'}
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {isConnected
                    ? '시스템을 사용할 준비가 되었습니다.'
                    : '몰 ID를 입력하고 카페24 앱을 설치하여 연동을 완료해주세요.'
                  }
                </p>
              </div>

              {isConnected ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                      <span className="text-sm text-green-800">
                        토큰: {oauthStatus?.data?.token_preview}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => window.location.href = '/'}
                    className="w-full btn btn-primary"
                  >
                    대시보드로 이동
                  </button>

                  <button
                    onClick={() => refetchOauth()}
                    className="w-full btn btn-secondary"
                  >
                    연결 상태 새로고침
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
                      <span className="text-sm text-yellow-800">
                        카페24 앱 설치가 필요합니다
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleInstall}
                    disabled={isInstalling || !mallId.trim()}
                    className="w-full btn btn-primary"
                  >
                    {isInstalling ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        설치 중...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        카페24 앱 설치
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => refetchOauth()}
                    className="w-full btn btn-secondary"
                  >
                    연결 상태 확인
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 시스템 정보 */}
          <div className="bg-white py-6 px-4 shadow sm:rounded-lg sm:px-10">
            <h4 className="text-lg font-medium text-gray-900 mb-4">시스템 정보</h4>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">버전:</span>
                <span className="text-gray-900">1.0.0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">API 서버:</span>
                <span className="text-gray-900">Railway</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">데이터베이스:</span>
                <span className="text-gray-900">Supabase</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">프론트엔드:</span>
                <span className="text-gray-900">Cloudflare Pages</span>
              </div>
            </div>
          </div>

          {/* 도움말 */}
          <div className="bg-blue-50 py-6 px-4 shadow sm:rounded-lg sm:px-10">
            <h4 className="text-lg font-medium text-blue-900 mb-4">도움말</h4>
            <div className="space-y-2 text-sm text-blue-800">
              <p>• 몰 ID는 카페24 관리자 페이지에서 확인할 수 있습니다</p>
              <p>• 카페24 앱 설치 시 필요한 권한: 상품 조회, 주문 조회, 주문 수정</p>
              <p>• 설치 완료 후 이 페이지에서 연결 상태를 확인하세요</p>
              <p>• 문제가 발생하면 관리자에게 문의하세요</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
