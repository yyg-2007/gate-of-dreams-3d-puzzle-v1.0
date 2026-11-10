/**
 * UI 组件集：主菜单 / 选关 / 暂停 / 设置 / 通关 / 制作名单 / HUD。
 * 全部为展示层：只读写 gameStore，不接触引擎。
 */
import { useEffect, useState } from 'react'
import { useGameStore, TOTAL_LEVELS } from '../store/gameStore'
import { LEVELS } from '../levels'
import { audio } from '../audio/AudioEngine'
import { clearSave, persistFromStore } from '../systems/save'

const click = () => { audio.unlock(); audio.play('ui') }
const back = () => { audio.play('uiBack') }

/* ---------------- 主菜单 ---------------- */

export function MainMenu(): React.ReactElement {
  const setScreen = useGameStore((s) => s.setScreen)
  const startLevel = useGameStore((s) => s.startLevel)
  const unlocked = useGameStore((s) => s.unlocked)

  const goLevels = () => { click(); setScreen('levels') }
  const goStart = () => {
    click()
    // 「开始游戏」进入第一个未通关的已解锁关卡
    const st = useGameStore.getState()
    let target = 0
    for (let i = 0; i < TOTAL_LEVELS; i++) {
      if (!st.completedLevels.includes(i) && i < st.unlocked) { target = i; break }
      if (i === TOTAL_LEVELS - 1) target = TOTAL_LEVELS - 1
    }
    startLevel(target)
  }
  const goContinue = () => { click(); startLevel(Math.min(unlocked - 1, TOTAL_LEVELS - 1)) }

  return (
    <div className="menu-layer">
      <div className="menu-logo">
        <div className="gate-ring" />
        <h1>幻境之门</h1>
        <div className="sub">梦 境 旅 途</div>
      </div>
      <div className="menu-buttons">
        <button className="btn primary" onClick={goStart}>开始游戏</button>
        <button className="btn" onClick={goContinue} disabled={unlocked <= 1}>继续旅程</button>
        <button className="btn" onClick={goLevels}>关卡选择</button>
        <button className="btn ghost" onClick={() => { click(); useGameStore.getState().setOverlay('settings') }}>游戏设置</button>
      </div>
      <div className="menu-foot">提灯前行 · 连通不可能之路</div>
    </div>
  )
}

/* ---------------- 选关 ---------------- */

export function LevelSelect(): React.ReactElement | null {
  const setScreen = useGameStore((s) => s.setScreen)
  const startLevel = useGameStore((s) => s.startLevel)
  const unlocked = useGameStore((s) => s.unlocked)
  const completed = useGameStore((s) => s.completedLevels)

  return (
    <div className="panel-layer">
      <div className="panel">
        <h2>关卡选择</h2>
        <div className="panel-sub">八座梦境 · 依次解锁</div>
        <div className="level-grid">
          {LEVELS.map((lv, i) => {
            const locked = i + 1 > unlocked
            const done = completed.includes(i)
            return (
              <button
                key={lv.id}
                className={`level-card ${locked ? 'locked' : ''}`}
                onClick={() => { if (!locked) { click(); startLevel(i) } }}
                disabled={locked}
              >
                {locked
                  ? <span className="lock">🔒</span>
                  : (
                    <>
                      {done && <span className="badge">✦</span>}
                      <span className="num">{lv.id}</span>
                      <span className="nm">{lv.name}</span>
                      <span className="gem" />
                    </>
                  )}
              </button>
            )
          })}
        </div>
        <div className="panel-actions">
          <button className="btn small ghost" onClick={() => { back(); setScreen('menu') }}>返回主菜单</button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- 设置 ---------------- */

export function SettingsPanel({ inGame }: { inGame: boolean }): React.ReactElement {
  const settings = useGameStore((s) => s.settings)
  const update = useGameStore((s) => s.updateSettings)
  const setOverlay = useGameStore((s) => s.setOverlay)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => { persistFromStore() }, [settings])

  return (
    <div className="panel-layer" onClick={(e) => { if (e.target === e.currentTarget) { back(); setOverlay('none') } }}>
      <div className="panel pause-panel">
        <h2>设置</h2>
        <div className="panel-sub">调整体验，随时保存</div>

        <div className="setting-row">
          <span className="label">🎵 音乐</span>
          <button className={`toggle ${settings.music ? 'on' : ''}`} onClick={() => { click(); update({ music: !settings.music }) }} />
        </div>
        <div className="setting-row">
          <span className="label">音量</span>
          <input type="range" min={0} max={1} step={0.05} value={settings.musicVol}
            onChange={(e) => update({ musicVol: Number(e.target.value) })} />
        </div>
        <div className="setting-row">
          <span className="label">🔔 音效</span>
          <button className={`toggle ${settings.sfx ? 'on' : ''}`} onClick={() => { click(); update({ sfx: !settings.sfx }) }} />
        </div>
        <div className="setting-row">
          <span className="label">音量</span>
          <input type="range" min={0} max={1} step={0.05} value={settings.sfxVol}
            onChange={(e) => update({ sfxVol: Number(e.target.value) })} />
        </div>
        <div className="setting-row">
          <span className="label">🖥 画质</span>
          <div className="seg">
            <button className={settings.quality === 'high' ? 'on' : ''} onClick={() => { click(); update({ quality: 'high' }) }}>精美</button>
            <button className={settings.quality === 'low' ? 'on' : ''} onClick={() => { click(); update({ quality: 'low' }) }}>流畅</button>
          </div>
        </div>
        <div className="setting-row">
          <span className="label">🧹 清除进度</span>
          {confirmReset
            ? (
              <button className="btn small" onClick={() => { clearSave(); location.reload() }}>确认清除</button>
            )
            : (
              <button className="btn small ghost" onClick={() => { click(); setConfirmReset(true) }}>重置</button>
            )}
        </div>

        <div className="panel-actions">
          <button className="btn small" onClick={() => { back(); setOverlay('none'); if (!inGame) useGameStore.getState().setScreen('menu') }}>完成</button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- 暂停 ---------------- */

export function PausePanel(): React.ReactElement {
  const setOverlay = useGameStore((s) => s.setOverlay)
  const setPaused = useGameStore((s) => s.setPaused)
  const levelIndex = useGameStore((s) => s.levelIndex)
  const startLevel = useGameStore((s) => s.startLevel)
  const quitToMenu = useGameStore((s) => s.quitToMenu)

  return (
    <div className="panel-layer">
      <div className="panel pause-panel">
        <h2>梦境暂停</h2>
        <div className="panel-sub">{LEVELS[levelIndex]?.name ?? ''}</div>
        <div className="col">
          <button className="btn primary" onClick={() => { click(); setOverlay('none'); setPaused(false) }}>继续梦境</button>
          <button className="btn" onClick={() => { click(); startLevel(levelIndex) }}>重新开始</button>
          <button className="btn ghost" onClick={() => { click(); setOverlay('settings') }}>游戏设置</button>
          <button className="btn ghost" onClick={() => { back(); quitToMenu() }}>返回主菜单</button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- 通关 ---------------- */

const QUOTES = [
  '第一盏灯，照亮了梦的入口。',
  '阶梯旋转，路在脚下成形。',
  '消失的桥，记起了自己的形状。',
  '塔有多高，梦就有多高。',
  '镜像的两端，是同一个梦。',
  '倒转的世界里，光依然向上。',
  '回廊尽头，还是出发的地方。',
  '梦的尽头，是醒来的勇气。',
]

export function CompletePanel(): React.ReactElement | null {
  const levelIndex = useGameStore((s) => s.levelIndex)
  const setOverlay = useGameStore((s) => s.setOverlay)
  const startLevel = useGameStore((s) => s.startLevel)
  const quitToMenu = useGameStore((s) => s.quitToMenu)
  const hasNext = levelIndex + 1 < TOTAL_LEVELS

  return (
    <div className="panel-layer">
      <div className="panel complete-panel">
        <div className="stars"><span>✦</span><span>✦</span><span>✦</span></div>
        <h2>梦境完成</h2>
        <div className="panel-sub">第 {levelIndex + 1} 关 · {LEVELS[levelIndex]?.name}</div>
        <div className="quote">{QUOTES[levelIndex] ?? ''}</div>
        <div className="panel-actions">
          <button className="btn small ghost" onClick={() => { click(); startLevel(levelIndex) }}>再入此梦</button>
          {hasNext
            ? <button className="btn primary" onClick={() => { click(); startLevel(levelIndex + 1) }}>下一关</button>
            : <button className="btn primary" onClick={() => { click(); setOverlay('credits') }}>见证终点</button>}
          <button className="btn small ghost" onClick={() => { back(); quitToMenu() }}>主菜单</button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- 全通制作名单 ---------------- */

export function CreditsPanel(): React.ReactElement {
  const setOverlay = useGameStore((s) => s.setOverlay)
  const quitToMenu = useGameStore((s) => s.quitToMenu)

  return (
    <div className="panel-layer">
      <div className="panel credits-panel">
        <div className="fin">梦醒时分</div>
        <div className="lines">
          八座梦境，一路灯火。<br />
          提灯的旅人走过了旋转的阶梯、消失的桥，<br />
          也走过了倒转的世界与无尽的回廊。<br />
          <br />
          门后没有终点 —— 只有下一场梦。<br />
          <br />
          《幻境之门：梦境旅途》<br />
          原创 3D 空间错觉解谜 · 感谢游玩
        </div>
        <div className="panel-actions">
          <button className="btn" onClick={() => { click(); setOverlay('none'); quitToMenu() }}>回到主菜单</button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- HUD ---------------- */

export function HUD(): React.ReactElement {
  const levelIndex = useGameStore((s) => s.levelIndex)
  const hint = useGameStore((s) => s.hint)
  const setOverlay = useGameStore((s) => s.setOverlay)
  const setPaused = useGameStore((s) => s.setPaused)
  const rotateCam = useGameStore((s) => s.rotateCam)
  const lv = LEVELS[levelIndex]

  return (
    <div className="hud">
      <div className="hud-top">
        <div className="hud-level-tag">
          <div className="chapter">第 {levelIndex + 1} 关 / {TOTAL_LEVELS}</div>
          <div className="name">{lv?.name ?? ''} · {lv?.subtitle ?? ''}</div>
        </div>
        <div className="hud-right">
          <button
            className="btn icon ghost"
            title="向左旋转视角（Q）"
            onClick={() => { click(); rotateCam(-1) }}
          >
            ⟲
          </button>
          <button
            className="btn icon ghost"
            title="向右旋转视角（E）"
            onClick={() => { click(); rotateCam(1) }}
          >
            ⟳
          </button>
          <button
            className="btn icon ghost"
            title="暂停"
            onClick={() => { click(); setPaused(true); setOverlay('pause') }}
          >
            Ⅱ
          </button>
        </div>
      </div>
      {hint && <div className="hud-hint">{hint}</div>}
    </div>
  )
}
