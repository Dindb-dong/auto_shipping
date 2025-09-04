import { STORAGE_KEYS } from './constants'

export interface SavedMall {
  id: string
  name: string
  mallId: string
  isConnected: boolean
  connectedAt?: string
  lastUsed?: string
  createdAt: string
}

export interface MallManager {
  getSavedMalls: () => SavedMall[]
  saveMall: (mall: Omit<SavedMall, 'id' | 'createdAt'>) => SavedMall
  updateMall: (id: string, updates: Partial<SavedMall>) => void
  deleteMall: (id: string) => void
  getCurrentMall: () => SavedMall | null
  setCurrentMall: (id: string) => void
  clearCurrentMall: () => void
  getMallById: (id: string) => SavedMall | null
  getMallByMallId: (mallId: string) => SavedMall | null
}

class MallManagerImpl implements MallManager {
  private generateId(): string {
    return `mall_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getStoredMalls(): SavedMall[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SAVED_MALLS)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Error parsing saved malls:', error)
      return []
    }
  }

  private saveMalls(malls: SavedMall[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SAVED_MALLS, JSON.stringify(malls))
    } catch (error) {
      console.error('Error saving malls:', error)
    }
  }

  getSavedMalls(): SavedMall[] {
    return this.getStoredMalls()
  }

  saveMall(mall: Omit<SavedMall, 'id' | 'createdAt'>): SavedMall {
    const malls = this.getStoredMalls()
    const newMall: SavedMall = {
      ...mall,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
    }

    malls.push(newMall)
    this.saveMalls(malls)
    return newMall
  }

  updateMall(id: string, updates: Partial<SavedMall>): void {
    const malls = this.getStoredMalls()
    const index = malls.findIndex(mall => mall.id === id)

    if (index !== -1) {
      malls[index] = { ...malls[index], ...updates }
      this.saveMalls(malls)
    }
  }

  deleteMall(id: string): void {
    const malls = this.getStoredMalls()
    const filteredMalls = malls.filter(mall => mall.id !== id)
    this.saveMalls(filteredMalls)

    // 현재 선택된 쇼핑몰이 삭제된 경우 선택 해제
    const currentMall = this.getCurrentMall()
    if (currentMall && currentMall.id === id) {
      this.clearCurrentMall()
    }
  }

  getCurrentMall(): SavedMall | null {
    try {
      const currentMallId = localStorage.getItem(STORAGE_KEYS.CURRENT_MALL)
      if (!currentMallId) return null

      return this.getMallById(currentMallId)
    } catch (error) {
      console.error('Error getting current mall:', error)
      return null
    }
  }

  setCurrentMall(id: string): void {
    const mall = this.getMallById(id)
    if (mall) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_MALL, id)
      // 마지막 사용 시간 업데이트
      this.updateMall(id, { lastUsed: new Date().toISOString() })
    }
  }

  clearCurrentMall(): void {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_MALL)
  }

  getMallById(id: string): SavedMall | null {
    const malls = this.getStoredMalls()
    return malls.find(mall => mall.id === id) || null
  }

  getMallByMallId(mallId: string): SavedMall | null {
    const malls = this.getStoredMalls()
    return malls.find(mall => mall.mallId === mallId) || null
  }
}

// 싱글톤 인스턴스
export const mallManager = new MallManagerImpl()

// 편의 함수들
export const useMallManager = () => {
  return {
    getSavedMalls: () => mallManager.getSavedMalls(),
    saveMall: (mall: Omit<SavedMall, 'id' | 'createdAt'>) => mallManager.saveMall(mall),
    updateMall: (id: string, updates: Partial<SavedMall>) => mallManager.updateMall(id, updates),
    deleteMall: (id: string) => mallManager.deleteMall(id),
    getCurrentMall: () => mallManager.getCurrentMall(),
    setCurrentMall: (id: string) => mallManager.setCurrentMall(id),
    clearCurrentMall: () => mallManager.clearCurrentMall(),
    getMallById: (id: string) => mallManager.getMallById(id),
    getMallByMallId: (mallId: string) => mallManager.getMallByMallId(mallId),
  }
}
