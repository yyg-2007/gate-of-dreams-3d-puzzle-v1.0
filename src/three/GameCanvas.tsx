/**
 * 游戏画布总装：
 *  - 正交相机（等距视角）+ 相机漂移/视差
 *  - 光照、雾、阴影（画质分档）
 *  - 指针拾取：点击可行走面移动 / 点击把手转机关
 *  - 引擎帧驱动（LevelEngine.tick）—— 引擎唯一实例，自上而下传递
 */
import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import * as THREE from 'three'
import type { LevelDef } from '../levels/types'
import { LevelEngine } from '../systems/engine'
import { useGameStore } from '../store/gameStore'
import { persistFromStore } from '../systems/save'
import { audio } from '../audio/AudioEngine'
import { SkyDome, Clouds } from './SkyDome'
import { Water } from './Water'
import { DecorLayer } from './Decor'
import { Particles, WinBurst } from './Particles'
import { LevelView } from './LevelView'

const DEG = Math.PI / 180

/** 视角状态：滚轮缩放系数 + 旋转步动画当前值（跨组件共享的可变引用） */
export interface ViewState {
  zoom: number
  stepCurrent: number
}

/* ---------------- 相机 ---------------- */

function CameraRig({ level, engine, interactive, viewState }: {
  level: LevelDef
  engine: LevelEngine
  interactive: boolean
  viewState: React.MutableRefObject<ViewState>
}): null {
  const { camera, size, pointer } = useThree()
  const cam = level.camera
  const target = useMemo(() => new THREE.Vector3(...cam.target), [cam])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const vs = viewState.current
    if (interactive) {
      // 游戏内：朝目标步数（每步 90°）平滑旋转
      const stepTarget = useGameStore.getState().camStep
      if (Math.abs(vs.stepCurrent - stepTarget) > 0.001) {
        vs.stepCurrent += (stepTarget - vs.stepCurrent) * Math.min(1, dt * 6)
        if (Math.abs(vs.stepCurrent - stepTarget) < 0.002) vs.stepCurrent = stepTarget
      }
    } else {
      // 主菜单：持续自转；同步到 viewState 使云海随之绕转、恒在背景侧
      vs.stepCurrent = (t * 2.2) / 90
    }
    const az = (cam.azimuth + vs.stepCurrent * 90) * DEG
    const el = cam.elevation * DEG
    const dist = 46
    const driftX = interactive ? pointer.x * 0.5 : Math.sin(t * 0.13) * 0.6
    const driftY = interactive ? pointer.y * 0.3 : Math.sin(t * 0.1) * 0.3

    camera.position.set(
      target.x + Math.cos(el) * Math.sin(az) * dist + driftX,
      target.y + Math.sin(el) * dist + driftY,
      target.z + Math.cos(el) * Math.cos(az) * dist,
    )
    camera.lookAt(target.x + driftX * 0.3, target.y + driftY * 0.2, target.z)

    if (camera instanceof THREE.OrthographicCamera) {
      const zoom = (size.height / cam.viewSize) * THREE.MathUtils.clamp(vs.zoom, 0.65, 1.8)
      if (Math.abs(camera.zoom - zoom) > 0.01) {
        camera.zoom = zoom
        camera.updateProjectionMatrix()
      }
    }
    void engine
  })
  return null
}

/* ---------------- 引擎驱动 + 输入 ---------------- */

function EngineDriver({ level, engine, interactive, viewState }: {
  level: LevelDef
  engine: LevelEngine
  interactive: boolean
  viewState: React.MutableRefObject<ViewState>
}): null {
  const { gl, scene, camera } = useThree()
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const ndc = useMemo(() => new THREE.Vector2(), [])
  const pendingMove = useRef<{ x: number; y: number } | null>(null)
  const store = useGameStore

  // 引擎事件 → 音频 & 存档
  useEffect(() => {
    engine.winEnabled = interactive
    // 开发调试句柄：控制台可读取角色/机关状态与相机（生产构建自动剥离）
    if (import.meta.env.DEV) {
      ;(window as unknown as { __dgEngine?: LevelEngine }).__dgEngine = engine
      ;(window as unknown as { __dgCam?: THREE.OrthographicCamera }).__dgCam = camera as THREE.OrthographicCamera
    }
    engine.onEvent = (e) => {
      switch (e) {
        case 'mechStart': audio.play('mech'); break
        case 'mechEnd': audio.play('mechEnd'); break
        case 'plate': audio.play('plate'); break
        case 'step': audio.play('step'); break
        case 'denied': case 'pathFail': audio.play('denied'); break
        case 'move': audio.play('move'); break
        case 'win': audio.play('win'); break
        default: break
      }
    }
    engine.onWin = () => {
      const st = store.getState()
      st.completeLevel(level.id - 1)
      persistFromStore()
      const isLast = level.id >= 8
      const runIdAtWin = st.runId
      window.setTimeout(() => {
        const s2 = store.getState()
        // 仅当仍停留在同一次运行（未重开/未退出）时弹出结算
        if (s2.runId === runIdAtWin && s2.screen === 'playing' && s2.levelIndex === level.id - 1) {
          s2.setOverlay(isLast ? 'credits' : 'complete')
        }
      }, 1500)
    }
    audio.setTheme(level.id)
    if (interactive) audio.play('levelStart')
    return () => {
      engine.onEvent = undefined
      engine.onWin = undefined
    }
  }, [engine, level, store, interactive])

  // 关卡提示
  useEffect(() => {
    if (!interactive) return
    store.getState().setHint(level.hint)
    return () => { store.getState().setHint('') }
  }, [level, store, interactive])

  // 拾取函数：把手优先于可行走面（发光把手即使被建筑部分遮挡也应可点击）
  const pick = useMemo(() => {
    return (cx: number, cy: number): { type: 'walk' | 'handle'; point: THREE.Vector3; groupId?: string } | null => {
      const el = gl.domElement
      const rect = el.getBoundingClientRect()
      ndc.x = ((cx - rect.left) / rect.width) * 2 - 1
      ndc.y = -((cy - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(ndc, camera)
      const hits = raycaster.intersectObjects(scene.children, true)
      let walkHit: { point: THREE.Vector3 } | null = null
      for (const h of hits) {
        let o: THREE.Object3D | null = h.object
        while (o) {
          if (o.userData?.handleGroup) {
            return { type: 'handle', point: h.point, groupId: o.userData.handleGroup as string }
          }
          if (o.userData?.walk && !walkHit) walkHit = { point: h.point }
          o = o.parent
        }
      }
      return walkHit ? { type: 'walk', point: walkHit.point } : null
    }
  }, [gl, scene, camera, raycaster, ndc])

  // 指针事件
  useEffect(() => {
    if (!interactive) return
    const el = gl.domElement

    const onDown = (e: PointerEvent) => {
      audio.unlock()
      const st = store.getState()
      if (st.paused || st.overlay !== 'none') return
      const hit = pick(e.clientX, e.clientY)
      if (!hit) return
      if (hit.type === 'handle' && hit.groupId) {
        engine.clickHandle(hit.groupId)
      } else {
        engine.requestMove(hit.point)
      }
    }
    const onMove = (e: PointerEvent) => { pendingMove.current = { x: e.clientX, y: e.clientY } }
    const onLeave = () => {
      pendingMove.current = null
      engine.hoverPoint = null
      engine.hoverHandle = null
    }
    // 滚轮缩放（0.65x ~ 1.8x）
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const vs = viewState.current
      vs.zoom = THREE.MathUtils.clamp(vs.zoom * (e.deltaY > 0 ? 0.92 : 1.08), 0.65, 1.8)
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      el.removeEventListener('wheel', onWheel)
    }
  }, [engine, gl, pick, store, interactive, viewState])

  // 每帧：引擎 tick + 悬停拾取（每帧最多一次）
  useFrame((_, delta) => {
    if (import.meta.env.DEV) {
      // 调试相机句柄随帧同步（默认相机可能由 makeDefault 延迟替换）
      ;(window as unknown as { __dgCam?: THREE.Camera }).__dgCam = camera
    }
    const st = store.getState()
    engine.paused = st.paused || st.overlay !== 'none'
    engine.tick(delta)

    const pm = pendingMove.current
    if (pm && interactive) {
      pendingMove.current = null
      const el = gl.domElement
      const hit = pick(pm.x, pm.y)
      engine.hoverPoint = null
      engine.hoverHandle = null
      if (hit) {
        el.style.cursor = 'pointer'
        if (hit.type === 'handle' && hit.groupId) engine.hoverHandle = hit.groupId
        else engine.hoverPoint = hit.point.clone()
      } else {
        el.style.cursor = 'default'
      }
    }
  })

  return null
}

/* ---------------- 通关星屑 ---------------- */

function WinFx({ level, engine }: { level: LevelDef; engine: LevelEngine }): React.ReactElement | null {
  const progress = engine.won ? Math.min(1, engine.winT / 2.4) : 0
  if (progress <= 0 || progress >= 1) return null
  return <WinBurst origin={level.door.pos} progress={progress} />
}

/* ---------------- 场景内容 ---------------- */

function SceneContent({ level, engine, interactive, quality, viewState }: {
  level: LevelDef
  engine: LevelEngine
  interactive: boolean
  quality: 'high' | 'low'
  viewState: React.MutableRefObject<ViewState>
}): React.ReactElement {
  const p = level.palette
  const sunPos = useMemo(
    () => new THREE.Vector3(...p.sunDir).normalize().multiplyScalar(34),
    [p],
  )

  return (
    <>
      <CameraRig level={level} engine={engine} interactive={interactive} viewState={viewState} />
      <EngineDriver level={level} engine={engine} interactive={interactive} viewState={viewState} />

      <hemisphereLight args={[p.hemiSky, p.hemiGround, 0.85]} />
      <ambientLight color={p.ambient} intensity={0.42} />
      <directionalLight
        position={sunPos}
        intensity={1.5}
        color={p.sun}
        castShadow={quality === 'high'}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <fog attach="fog" args={[p.fog, 30, 120]} />

      <SkyDome palette={p} />
      <Clouds palette={p} count={quality === 'high' ? 9 : 5} viewState={viewState} />

      {level.water && (
        <Water palette={p} y={level.water.y} radius={level.water.radius} pos={level.water.pos ?? [0, 0, 0]} />
      )}

      <DecorLayer defs={level.decor} palette={p} />
      <LevelView level={level} engine={engine} quality={quality} />
      <WinFx level={level} engine={engine} />
      {level.particles && (
        <Particles kind={level.particles} area={34} count={level.particles === 'stars' ? 160 : 110} />
      )}
    </>
  )
}

/* ---------------- 画布 ---------------- */

export function GameCanvas({ level, interactive = true }: { level: LevelDef; interactive?: boolean }): React.ReactElement {
  const quality = useGameStore((s) => s.settings.quality)
  // 引擎唯一实例：关卡对象引用变化（切换/重开）时重建
  const engine = useMemo(() => new LevelEngine(level), [level])
  // 视角状态：缩放系数 + 旋转步动画（HUD 按钮 / Q、E / 滚轮驱动）
  const viewState = useRef<ViewState>({ zoom: 1, stepCurrent: 0 })

  return (
    <Canvas
      shadows={quality === 'high' ? { type: THREE.PCFSoftShadowMap } : false}
      dpr={quality === 'high' ? [1, 2] : 1}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping
        gl.toneMappingExposure = 1.08
      }}
      style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
    >
      <OrthographicCamera makeDefault position={[20, 20, 20]} zoom={60} near={-80} far={400} />
      <SceneContent level={level} engine={engine} interactive={interactive} quality={quality} viewState={viewState} />
    </Canvas>
  )
}
