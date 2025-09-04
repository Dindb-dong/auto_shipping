import { useEffect, useState } from 'react'
import { useQuery } from 'react-query'
import { Link, Key, Database, TestTube, ExternalLink, Store, Plus, Trash2, Edit3 } from 'lucide-react'
import { oauthApi, webhookApi, authApi } from '../utils/api'
import { STORAGE_KEYS } from '../utils/constants'
import { useMallManager, SavedMall } from '../utils/mallManager'

const Settings = () => {
  const [activeTab, setActiveTab] = useState('malls')
  const [adminId, setAdminId] = useState('')
  const [adminPw, setAdminPw] = useState('')
  const [isAuthed, setIsAuthed] = useState(false)
  const [mallId, setMallId] = useState('')
  const [installedMallId, setInstalledMallId] = useState('')

  // 쇼핑몰 관리 상태
  const [showAddMallForm, setShowAddMallForm] = useState(false)
  const [newMallName, setNewMallName] = useState('')
  const [newMallId, setNewMallId] = useState('')
  const [editingMall, setEditingMall] = useState<SavedMall | null>(null)

  // 쇼핑몰 관리자
  const mallManager = useMallManager()
  const [savedMalls, setSavedMalls] = useState<SavedMall[]>([])
  const [currentMall, setCurrentMall] = useState<SavedMall | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ADMIN_SESSION)
    setIsAuthed(saved === 'true')

    // 쇼핑몰 데이터 로드
    loadMallData()

    // URL 파라미터에서 설치 완료 정보 확인
    const urlParams = new URLSearchParams(window.location.search)
    const installed = urlParams.get('installed')
    const mallIdParam = urlParams.get('mall_id')

    if (installed === '1' && mallIdParam) {
      setInstalledMallId(mallIdParam)
      // URL 파라미터 정리
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const loadMallData = () => {
    // alushealthcare01 쇼핑몰이 없으면 자동으로 추가
    const alusMall = mallManager.getMallByMallId('alushealthcare01')
    if (!alusMall) {
      mallManager.saveMall({
        name: '알루스헬스케어',
        mallId: 'alushealthcare01',
        isConnected: false,
      })
    }

    setSavedMalls(mallManager.getSavedMalls())
    setCurrentMall(mallManager.getCurrentMall())

    // 현재 쇼핑몰이 있으면 mallId 설정
    const updatedCurrent = mallManager.getCurrentMall()
    if (updatedCurrent) {
      setMallId(updatedCurrent.mallId)
    }
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!adminId.trim() || !adminPw.trim()) {
      alert('아이디와 비밀번호를 입력해주세요.')
      return
    }

    try {
      const response = await authApi.adminLogin({
        username: adminId,
        password: adminPw
      })

      if (response.success) {
        localStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, 'true')
        setIsAuthed(true)
        setAdminPw('')
        setAdminId('')
      } else {
        alert(response.error || '로그인에 실패했습니다.')
      }
    } catch (error) {
      console.error('Admin login error:', error)
      alert('로그인 중 오류가 발생했습니다.')
    }
  }

  const handleAdminLogout = async () => {
    try {
      await authApi.adminLogout()
    } catch (error) {
      console.error('Admin logout error:', error)
    } finally {
      localStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION)
      setIsAuthed(false)
      setAdminId('')
      setAdminPw('')
    }
  }

  // OAuth 상태 조회 (mall_id가 있을 때만)
  const { data: oauthStatus, refetch: refetchOauth } = useQuery(
    ['oauthStatus', mallId],
    () => oauthApi.getStatus(mallId),
    {
      refetchInterval: 30000,
      enabled: !!mallId, // mall_id가 있을 때만 쿼리 실행
    }
  )

  // OAuth 상태가 변경되면 쇼핑몰 연결 상태 업데이트
  useEffect(() => {
    if (currentMall && oauthStatus?.data) {
      const isConnected = oauthStatus.data.has_token
      if (currentMall.isConnected !== isConnected) {
        mallManager.updateMall(currentMall.id, {
          isConnected,
          connectedAt: isConnected ? new Date().toISOString() : undefined
        })
        loadMallData()
      }
    }
  }, [oauthStatus, currentMall])

  // 웹훅 상태 조회
  const { data: webhookStatus, refetch: refetchWebhook } = useQuery(
    'webhookStatus',
    webhookApi.getStatus,
    {
      refetchInterval: 30000,
    }
  )

  const handleOAuthInstall = async () => {
    if (!mallId.trim()) {
      alert('몰 ID를 입력해주세요.')
      return
    }

    try {
      // 백엔드 OAuth 설치 엔드포인트로 직접 리다이렉트
      const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
      const installUrl = `${backendUrl}/oauth/install?mall_id=${encodeURIComponent(mallId.trim())}`
      window.location.href = installUrl
    } catch (error) {
      console.error('OAuth install error:', error)
      alert('OAuth 설치 중 오류가 발생했습니다.')
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

  // 쇼핑몰 관리 함수들
  const handleAddMall = () => {
    if (!newMallName.trim() || !newMallId.trim()) {
      alert('쇼핑몰 이름과 몰 ID를 입력해주세요.')
      return
    }

    // 중복 체크
    const existingMall = mallManager.getMallByMallId(newMallId.trim())
    if (existingMall) {
      alert('이미 등록된 몰 ID입니다.')
      return
    }

    mallManager.saveMall({
      name: newMallName.trim(),
      mallId: newMallId.trim(),
      isConnected: false,
    })

    setSavedMalls(mallManager.getSavedMalls())
    setNewMallName('')
    setNewMallId('')
    setShowAddMallForm(false)

    alert('쇼핑몰이 추가되었습니다.')
  }

  const handleSelectMall = (mall: SavedMall) => {
    mallManager.setCurrentMall(mall.id)
    setCurrentMall(mall)
    setMallId(mall.mallId)
    loadMallData()
  }

  const handleDeleteMall = (mall: SavedMall) => {
    if (confirm(`"${mall.name}" 쇼핑몰을 삭제하시겠습니까?`)) {
      mallManager.deleteMall(mall.id)
      setSavedMalls(mallManager.getSavedMalls())

      if (currentMall && currentMall.id === mall.id) {
        setCurrentMall(null)
        setMallId('')
      }

      alert('쇼핑몰이 삭제되었습니다.')
    }
  }

  const handleEditMall = (mall: SavedMall) => {
    setEditingMall(mall)
    setNewMallName(mall.name)
    setNewMallId(mall.mallId)
    setShowAddMallForm(true)
  }

  const handleUpdateMall = () => {
    if (!editingMall || !newMallName.trim() || !newMallId.trim()) {
      alert('쇼핑몰 이름과 몰 ID를 입력해주세요.')
      return
    }

    // 중복 체크 (자신 제외)
    const existingMall = mallManager.getMallByMallId(newMallId.trim())
    if (existingMall && existingMall.id !== editingMall.id) {
      alert('이미 등록된 몰 ID입니다.')
      return
    }

    mallManager.updateMall(editingMall.id, {
      name: newMallName.trim(),
      mallId: newMallId.trim(),
    })

    setSavedMalls(mallManager.getSavedMalls())
    setNewMallName('')
    setNewMallId('')
    setShowAddMallForm(false)
    setEditingMall(null)

    alert('쇼핑몰 정보가 수정되었습니다.')
  }

  const handleCancelForm = () => {
    setShowAddMallForm(false)
    setEditingMall(null)
    setNewMallName('')
    setNewMallId('')
  }

  const tabs = [
    { id: 'malls', name: '쇼핑몰 관리', icon: Store },
    { id: 'oauth', name: '카페24 연동', icon: Link },
    { id: 'webhook', name: '웹훅 설정', icon: Key },
    { id: 'database', name: '데이터베이스', icon: Database },
    { id: 'test', name: '테스트', icon: TestTube },
  ]

  if (!isAuthed) {
    return (
      <div className="max-w-md mx-auto">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">관리자 로그인</h3>
            <p className="mt-1 text-sm text-gray-500">설정 페이지는 관리자만 접근 가능합니다.</p>
          </div>
          <div className="card-body">
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">아이디</label>
                <input
                  type="text"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  className="mt-1 input"
                  placeholder="관리자 아이디"
                  autoComplete="username"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">비밀번호</label>
                <input
                  type="password"
                  value={adminPw}
                  onChange={(e) => setAdminPw(e.target.value)}
                  className="mt-1 input"
                  placeholder="관리자 비밀번호"
                  autoComplete="current-password"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary w-full">로그인</button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">설정</h1>
          <button onClick={handleAdminLogout} className="btn btn-secondary">로그아웃</button>
        </div>
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
        {/* 쇼핑몰 관리 */}
        {activeTab === 'malls' && (
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">쇼핑몰 관리</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      등록된 쇼핑몰을 관리하고 현재 사용할 쇼핑몰을 선택하세요.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddMallForm(true)}
                    className="btn btn-primary"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    쇼핑몰 추가
                  </button>
                </div>
              </div>
              <div className="card-body">
                {/* 현재 선택된 쇼핑몰 */}
                {currentMall && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-3 w-3 rounded-full bg-blue-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            현재 선택된 쇼핑몰: {currentMall.name}
                          </p>
                          <p className="text-sm text-blue-600">
                            몰 ID: {currentMall.mallId}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${currentMall.isConnected
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {currentMall.isConnected ? '연동됨' : '연동 안됨'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 쇼핑몰 추가/수정 폼 */}
                {showAddMallForm && (
                  <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <h4 className="text-sm font-medium text-gray-900 mb-4">
                      {editingMall ? '쇼핑몰 수정' : '새 쇼핑몰 추가'}
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          쇼핑몰 이름
                        </label>
                        <input
                          type="text"
                          value={newMallName}
                          onChange={(e) => setNewMallName(e.target.value)}
                          className="mt-1 input"
                          placeholder="예: 알루스헬스케어"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          몰 ID
                        </label>
                        <input
                          type="text"
                          value={newMallId}
                          onChange={(e) => setNewMallId(e.target.value)}
                          className="mt-1 input"
                          placeholder="예: alushealthcare01"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={editingMall ? handleUpdateMall : handleAddMall}
                          className="btn btn-primary"
                        >
                          {editingMall ? '수정' : '추가'}
                        </button>
                        <button
                          onClick={handleCancelForm}
                          className="btn btn-secondary"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 저장된 쇼핑몰 목록 */}
                <div className="space-y-3">
                  {savedMalls.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Store className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>등록된 쇼핑몰이 없습니다.</p>
                      <p className="text-sm">새 쇼핑몰을 추가해보세요.</p>
                    </div>
                  ) : (
                    savedMalls.map((mall) => (
                      <div
                        key={mall.id}
                        className={`p-4 border rounded-lg transition-colors ${currentMall?.id === mall.id
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className={`h-3 w-3 rounded-full mr-3 ${mall.isConnected ? 'bg-green-400' : 'bg-red-400'
                              }`} />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {mall.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                몰 ID: {mall.mallId}
                              </p>
                              {mall.lastUsed && (
                                <p className="text-xs text-gray-400">
                                  마지막 사용: {new Date(mall.lastUsed).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${mall.isConnected
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                              }`}>
                              {mall.isConnected ? '연동됨' : '연동 안됨'}
                            </span>
                            {currentMall?.id !== mall.id && (
                              <button
                                onClick={() => handleSelectMall(mall)}
                                className="btn btn-secondary text-xs"
                              >
                                선택
                              </button>
                            )}
                            <button
                              onClick={() => handleEditMall(mall)}
                              className="btn btn-secondary text-xs"
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteMall(mall)}
                              className="btn btn-danger text-xs"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 카페24 연동 */}
        {activeTab === 'oauth' && (
          <div className="space-y-6">
            {/* 설치 완료 메시지 */}
            {installedMallId && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="h-5 w-5 text-green-400 mr-3">✅</div>
                  <div>
                    <h4 className="text-sm font-medium text-green-800">카페24 연동 완료!</h4>
                    <p className="text-sm text-green-600">
                      몰 ID <code className="bg-green-100 px-1 rounded">{installedMallId}</code>의 연동이 성공적으로 완료되었습니다.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">카페24 OAuth 연동</h3>
                <p className="mt-1 text-sm text-gray-500">
                  카페24 API와의 연동 상태를 확인하고 관리하세요.
                </p>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  {/* 몰 ID 입력 */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      몰 ID (Mall ID)
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={mallId}
                        onChange={(e) => setMallId(e.target.value)}
                        className="flex-1 input"
                        placeholder="예: yourmall"
                        disabled={!!oauthStatus?.data?.has_token}
                      />
                      {!oauthStatus?.data?.has_token && (
                        <button
                          onClick={handleOAuthInstall}
                          className="btn btn-primary"
                          disabled={!mallId.trim()}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          앱 설치
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      카페24 관리자 페이지에서 확인할 수 있는 몰 ID를 입력하세요.
                    </p>
                  </div>

                  {/* 연동 상태 */}
                  {mallId && (
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
                        {oauthStatus?.data?.has_token && (
                          <button
                            onClick={() => {
                              setMallId('')
                              setInstalledMallId('')
                            }}
                            className="btn btn-secondary"
                          >
                            다른 몰 연동
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">필요 권한</h4>
                      <ul className="text-sm text-gray-500 space-y-1">
                        <li>• mall.read_product (상품 조회)</li>
                        <li>• mall.read_order (주문 조회)</li>
                        <li>• mall.write_order (주문 수정)</li>
                      </ul>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">콜백 URL</h4>
                      <p className="text-sm text-gray-500">
                        https://autoshipping-production.up.railway.app/oauth/callback
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
                          https://autoshipping-production.up.railway.app/webhook/logiview
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
                          <span className="text-sm text-gray-500 w-24">X-API-KEY:</span>
                          <code className="flex-1 p-2 bg-gray-100 rounded text-sm">
                            your_partner_api_key
                          </code>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">관리자에게 발급받은 API 키를 로지뷰 웹훅 요청 헤더에 포함하세요.</p>
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
