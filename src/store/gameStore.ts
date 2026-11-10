/**
 * 全局游戏状态（zustand）。
 * 只存放「UI 关心」的离散状态；每帧游戏逻辑在 LevelEngine 中，不进 React 状态。
 */
import { create } from 'zustand'
import type { SaveData } from '../systems/save'

export type Screen = 'boot' | 'menu' | 'levels' | 'playing'
export type Overlay = 'none' | 'pause' | 'settings' | 'complete' | 'credits'

export interface GameSettings {
  music: boolean
  sfx: boolean
  musicVol: number
  sfxVol: number
  quality: 'high' | 'low'
}

interface GameStore {
  screen: Screen
  overlay: Overlay
  levelIndex: number
  unlocked: number
  completedLevels: number[]
  settings: GameSettings
  paused: boolean
  /** 当前关卡提示文本（空则隐藏） */
  hint: string
  /** 跨关卡提示（如通关语） */
  toast: string
  /** 视角旋转步数（每步 90°），由 HUD 按钮 / Q、E 键驱动 */
  camStep: number
  /** 关卡运行代号：每次 startLevel 自增，用于强制重建游戏实例与失效过期回调 */
  runId: number

  hydrateSave(data: SaveData): void
  setScreen(s: Screen): void
  setOverlay(o: Overlay): void
  startLevel(index: number): void
  quitToMenu(): void
  setPaused(p: boolean): void
  setHint(h: string): void
  setToast(t: string): void
  rotateCam(dir: 1 | -1): void
  completeLevel(index: number): void
  updateSettings(patch: Partial<GameSettings>): void
  resetProgress(): void
}

export const TOTAL_LEVELS = 8

export const useGameStore = create<GameStore>((set, get) => ({
  screen: 'boot',
  overlay: 'none',
  levelIndex: 0,
  unlocked: 1,
  completedLevels: [],
  settings: { music: true, sfx: true, musicVol: 0.8, sfxVol: 0.9, quality: 'high' },
  paused: false,
  hint: '',
  toast: '',
  camStep: 0,
  runId: 0,

  hydrateSave: (data) =>
    set({ unlocked: data.unlocked, completedLevels: data.completed, settings: data.settings }),

  setScreen: (s) => set({ screen: s }),

  setOverlay: (o) => set({ overlay: o }),

  startLevel: (index) =>
    set((st) => ({
      screen: 'playing', levelIndex: index, overlay: 'none', paused: false,
      camStep: 0, runId: st.runId + 1,
    })),

  quitToMenu: () => set({ screen: 'menu', overlay: 'none', paused: false, hint: '', camStep: 0 }),

  setPaused: (p) => set({ paused: p }),

  setHint: (h) => set({ hint: h }),

  setToast: (t) => set({ toast: t }),

  rotateCam: (dir) => set({ camStep: get().camStep + dir }),

  completeLevel: (index) => {
    const st = get()
    const completed = st.completedLevels.includes(index)
      ? st.completedLevels
      : [...st.completedLevels, index]
    const unlocked = Math.max(st.unlocked, Math.min(TOTAL_LEVELS, index + 2))
    set({ completedLevels: completed, unlocked })
  },

  updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),

  resetProgress: () =>
    set({ unlocked: 1, completedLevels: [] }),
}))
