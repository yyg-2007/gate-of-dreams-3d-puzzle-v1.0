/**
 * App：屏幕路由 + 全局覆盖层 + 键盘快捷键。
 * 菜单背景使用 MENU_SCENE 的 3D 场景；游戏内使用当前关卡。
 */
import { useEffect } from 'react'
import { useGameStore } from './store/gameStore'
import { loadIntoStore, persistFromStore } from './systems/save'
import { audio } from './audio/AudioEngine'
import { GameCanvas } from './three/GameCanvas'
import { MENU_SCENE, LEVELS } from './levels'
import { MainMenu, LevelSelect, SettingsPanel, PausePanel, CompletePanel, CreditsPanel, HUD } from './ui/Panels'

export default function App(): React.ReactElement {
  const screen = useGameStore((s) => s.screen)
  const overlay = useGameStore((s) => s.overlay)
  const levelIndex = useGameStore((s) => s.levelIndex)
  const runId = useGameStore((s) => s.runId)
  const toast = useGameStore((s) => s.toast)

  // 初始化：读存档、移除启动画面
  useEffect(() => {
    loadIntoStore()
    const boot = document.getElementById('boot')
    if (boot) {
      boot.classList.add('done')
      window.setTimeout(() => boot.remove(), 700)
    }
    useGameStore.getState().setScreen('menu')
  }, [])

  // 设置 → 音频引擎
  useEffect(() => {
    const unsub = useGameStore.subscribe((s) => {
      audio.configure(s.settings)
    })
    audio.configure(useGameStore.getState().settings)
    return unsub
  }, [])

  // 键盘：Esc 暂停/继续，R 重开，Q/E 旋转视角
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useGameStore.getState()
      if (st.screen !== 'playing') return
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault()
        if (st.overlay === 'none') { st.setPaused(true); st.setOverlay('pause') }
        else if (st.overlay === 'pause') { st.setPaused(false); st.setOverlay('none') }
      } else if (e.key === 'r' || e.key === 'R') {
        if (st.overlay === 'none' || st.overlay === 'pause') {
          st.startLevel(st.levelIndex)
        }
      } else if (e.key === 'q' || e.key === 'Q' || e.key === 'ArrowLeft') {
        if (st.overlay === 'none') { st.rotateCam(-1); audio.play('ui') }
      } else if (e.key === 'e' || e.key === 'E' || e.key === 'ArrowRight') {
        if (st.overlay === 'none') { st.rotateCam(1); audio.play('ui') }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 离开游戏页时保存
  useEffect(() => {
    const onHide = () => { if (useGameStore.getState().screen === 'playing') persistFromStore() }
    window.addEventListener('visibilitychange', onHide)
    return () => window.removeEventListener('visibilitychange', onHide)
  }, [])

  const level = LEVELS[levelIndex] ?? LEVELS[0]

  return (
    <div className="app-root">
      {screen === 'menu' && <GameCanvas key="menu" level={MENU_SCENE} interactive={false} />}
      {screen === 'menu' && <MainMenu />}

      {screen === 'levels' && <GameCanvas key="menu2" level={MENU_SCENE} interactive={false} />}
      {screen === 'levels' && <LevelSelect />}

      {screen === 'playing' && (
        <GameCanvas key={`lv${levelIndex}-${runId}`} level={level} interactive />
      )}
      {screen === 'playing' && <HUD />}

      {overlay === 'pause' && <PausePanel />}
      {overlay === 'settings' && <SettingsPanel inGame={screen === 'playing'} />}
      {overlay === 'complete' && screen === 'playing' && <CompletePanel />}
      {overlay === 'credits' && <CreditsPanel />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
