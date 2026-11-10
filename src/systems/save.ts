/**
 * 存档系统 —— LocalStorage 持久化。
 * 记录：解锁进度、通关记录、设置。
 */
import { useGameStore } from '../store/gameStore'

export interface SaveData {
  version: 1
  /** 已解锁的最高关卡 id（1 起） */
  unlocked: number
  /** 已通关关卡 id 集合 */
  completed: number[]
  settings: {
    music: boolean
    sfx: boolean
    musicVol: number
    sfxVol: number
    quality: 'high' | 'low'
  }
}

const KEY = 'gate-of-dreams:save:v1'

export const defaultSave = (): SaveData => ({
  version: 1,
  unlocked: 1,
  completed: [],
  settings: { music: true, sfx: true, musicVol: 0.8, sfxVol: 0.9, quality: 'high' },
})

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultSave()
    const data = JSON.parse(raw) as Partial<SaveData>
    const base = defaultSave()
    return {
      version: 1,
      unlocked: Math.max(1, Math.min(8, data.unlocked ?? base.unlocked)),
      completed: Array.isArray(data.completed) ? data.completed.filter((n) => n >= 1 && n <= 8) : [],
      settings: { ...base.settings, ...(data.settings ?? {}) },
    }
  } catch {
    return defaultSave()
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('[save] 写入失败', e)
  }
}

export function loadIntoStore(): void {
  const data = loadSave()
  const st = useGameStore.getState()
  st.hydrateSave(data)
}

export function persistFromStore(): void {
  const st = useGameStore.getState()
  writeSave({
    version: 1,
    unlocked: st.unlocked,
    completed: st.completedLevels,
    settings: st.settings,
  })
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
