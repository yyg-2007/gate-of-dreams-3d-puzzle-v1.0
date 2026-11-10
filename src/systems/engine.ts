import * as THREE from 'three'
import type { LevelDef, PlateDef } from '../levels/types'
import {
  buildGraph, computeWorldMatrices, componentOf, easeInOutCubic, findPath,
  stateValue, WalkGraph,
} from './graph'

export type EngineEvent =
  | 'mechStart' | 'mechEnd' | 'denied' | 'plate' | 'step' | 'arrive'
  | 'pathFail' | 'move' | 'doorLocked' | 'win'

export interface CharState {
  node: string
  path: string[]
  /** 当前段已走比例 */
  segT: number
  pos: THREE.Vector3
  yaw: number
  /** 行走动画相位 */
  phase: number
  speed: number
  moving: boolean
}

interface MechAnim {
  groupId: string
  fromVal: number
  toVal: number
  toState: number
  t: number
  dur: number
}

const WIN_WALK_TIME = 1.35

/**
 * 关卡引擎：纯逻辑，无渲染依赖。
 * 渲染层每帧读取引擎状态；UI 通过 onEvent / onWin 回调得到通知。
 */
export class LevelEngine {
  level: LevelDef
  states: Record<string, number> = {}
  anim: MechAnim | null = null
  graph: WalkGraph
  char: CharState
  triggeredPlates = new Set<string>()
  doorOpen = true
  /** 菜单等展示场景可关闭胜利判定 */
  winEnabled = true
  won = false
  /** 通关动画计时（秒） */
  winT = 0
  /** 停表：暂停时不推进 */
  paused = false

  hoverPoint: THREE.Vector3 | null = null
  hoverHandle: string | null = null
  destPoint: THREE.Vector3 | null = null
  destT = 0

  onEvent?: (e: EngineEvent, data?: unknown) => void
  onWin?: () => void

  private worldCache: Map<string, THREE.Matrix4> | null = null
  private stepPhase = 0

  constructor(level: LevelDef) {
    this.level = level
    for (const g of level.groups) {
      this.states[g.id] = g.kind === 'static' ? 0 : (g.initialState ?? 0)
    }
    this.graph = buildGraph(level, this.states)
    if (!this.graph.nodes.has(level.spawn)) {
      console.error(`[engine] spawn 节点不存在: ${level.spawn}`)
    }
    this.char = {
      node: level.spawn,
      path: [],
      segT: 0,
      pos: this.graph.nodes.get(level.spawn)?.pos.clone() ?? new THREE.Vector3(),
      yaw: Math.PI,
      phase: 0,
      speed: 2.1,
      moving: false,
    }
    // 门是否需要压力板解锁（需要则初始锁定，全部触发后开启）
    this.doorOpen = !level.doorRequiresPlates
  }

  /* ---------------- 世界坐标 ---------------- */

  /** 机关组当前动画值（无动画则为其状态值） */
  currentVal(groupId: string): number {
    if (this.anim && this.anim.groupId === groupId) {
      return THREE.MathUtils.lerp(this.anim.fromVal, this.anim.toVal, easeInOutCubic(this.anim.t))
    }
    const g = this.level.groups.find((gg) => gg.id === groupId)
    if (!g) return 0
    return stateValue(g, this.states[groupId] ?? 0)
  }

  groupWorldMatrix(groupId: string, out = new THREE.Matrix4()): THREE.Matrix4 {
    if (!this.worldCache) this.refreshWorldCache()
    const m = this.worldCache!.get(groupId)
    return m ? out.copy(m) : out.identity()
  }

  /**
   * 节点的实时世界坐标：机关动画期间从动画矩阵取位（乘坐跟随的关键），
   * 静止时与寻路图坐标一致。返回 false 表示节点不存在（调用方应保留现值）。
   */
  liveNodeWorldPos(key: string, out: THREE.Vector3): boolean {
    const sep = key.indexOf(':')
    if (sep < 0) return false
    const gid = key.slice(0, sep)
    const nid = key.slice(sep + 1)
    const g = this.level.groups.find((gg) => gg.id === gid)
    const n = g?.nodes.find((nn) => nn.id === nid)
    if (!g || !n) return false
    out.set(n.pos[0], n.pos[1], n.pos[2]).applyMatrix4(this.groupWorldMatrix(gid, scratchMat))
    return true
  }

  private refreshWorldCache(): void {
    const animVal: Record<string, number> = {}
    if (this.anim) animVal[this.anim.groupId] = this.currentVal(this.anim.groupId)
    this.worldCache = computeWorldMatrices(this.level, this.states, animVal)
  }

  worldPosOf(key: string, out = new THREE.Vector3()): THREE.Vector3 {
    const n = this.graph.nodes.get(key)
    if (!n) return out.set(0, 0, 0)
    return out.copy(n.pos)
  }

  isAnimating(): boolean {
    return this.anim !== null
  }

  /* ---------------- 玩家输入 ---------------- */

  /** 点击机关把手：切换到下一状态 */
  clickHandle(groupId: string): boolean {
    if (this.won || this.paused) return false
    const g = this.level.groups.find((gg) => gg.id === groupId)
    if (!g || !g.handle) return false
    if (this.anim) {
      this.onEvent?.('denied')
      return false
    }
    const cur = this.states[groupId] ?? 0
    const next = (cur + 1) % (g.states?.length ?? 1)
    const dur = g.duration ?? 1.1
    this.reanchorToMovingGroup(groupId)
    this.anim = {
      groupId,
      fromVal: stateValue(g, cur),
      toVal: stateValue(g, next),
      toState: next,
      t: 0,
      dur,
    }
    this.worldCache = null
    // 行走中旋转：终止后续路径（角色停在当前节点）
    if (this.char.path.length) {
      this.char.path = []
      this.char.moving = false
    }
    this.destPoint = null
    this.onEvent?.('mechStart', { groupId, state: next })
    return true
  }

  /** 点击地面：寻找最近行走节点并寻路（同点重合时优先机关组节点，便于乘坐） */
  requestMove(point: THREE.Vector3): boolean {
    if (this.won || this.paused || this.anim) return false
    let best: string | null = null
    let bestD = Infinity
    let bestIsMech = false
    for (const n of this.graph.nodes.values()) {
      const dx = n.pos.x - point.x
      const dz = n.pos.z - point.z
      const dy = n.pos.y - point.y
      const d2 = dx * dx + dz * dz + dy * dy * 4
      const isMech = this.groupKind(n.group) !== 'static'
      const better = d2 < bestD - 1e-9 || (Math.abs(d2 - bestD) < 1e-9 && isMech && !bestIsMech)
      if (better) {
        bestD = d2
        best = n.key
        bestIsMech = isMech
      }
    }
    if (!best || bestD > 2.6 * 2.6) {
      this.onEvent?.('pathFail')
      return false
    }
    if (best === this.char.node) {
      this.char.path = []
      this.char.moving = false
      this.destPoint = this.graph.nodes.get(best)!.pos.clone()
      return true
    }
    const path = findPath(this.graph, this.char.node, best)
    if (!path) {
      this.onEvent?.('pathFail')
      return false
    }
    this.char.path = path.slice(1)
    this.char.segT = 0
    this.char.moving = this.char.path.length > 0
    this.destPoint = this.graph.nodes.get(best)!.pos.clone()
    this.destT = 0
    this.onEvent?.('move')
    return true
  }

  /* ---------------- 帧更新 ---------------- */

  tick(dtRaw: number): void {
    if (this.paused) return
    const dt = Math.min(dtRaw, 0.05)

    // 动画期间世界矩阵随帧变化：每帧失效缓存，本帧首次查询时重建一次
    if (this.anim) this.worldCache = null

    // 机关动画
    if (this.anim) {
      this.anim.t += dt / this.anim.dur
      if (this.anim.t >= 1) {
        this.states[this.anim.groupId] = this.anim.toState
        const gid = this.anim.groupId
        this.anim = null
        this.worldCache = null
        this.graph = buildGraph(this.level, this.states)
        // 若角色当前节点在动过的组上，其世界坐标随新图更新（乘坐效果）
        if (!this.liveNodeWorldPos(this.char.node, this.char.pos)) {
          // 兜底：移动到最近节点
          this.char.node = this.nearestNode(this.char.pos)
          this.liveNodeWorldPos(this.char.node, this.char.pos)
        }
        this.onEvent?.('mechEnd', { groupId: gid })
        this.checkPlates()
      }
    }

    // 角色移动
    this.updateChar(dt)

    // 压力板（角色站立即触发，闩锁式）
    this.checkPlates()

    // 目标点脉冲计时
    this.destT += dt

    // 通关
    if (this.won) {
      this.winT += dt
    } else if (this.winEnabled && this.doorOpen && this.char.node === this.level.goal && !this.char.moving) {
      this.won = true
      this.winT = 0
      this.char.path = []
      this.char.moving = false
      this.onEvent?.('win')
      this.onWin?.()
    }
  }

  private updateChar(dt: number): void {
    const c = this.char
    if (this.won) {
      // 通关动画：走向门内
      const door = this.level.door
      const target = new THREE.Vector3(door.pos[0], door.pos[1], door.pos[2])
      const t = easeInOutCubic(Math.min(1, this.winT / WIN_WALK_TIME))
      c.pos.lerp(target, Math.min(1, dt * 2.2))
      const dir = target.clone().sub(c.pos)
      if (dir.lengthSq() > 0.001) {
        const wantYaw = Math.atan2(dir.x, dir.z)
        c.yaw += shortAngle(wantYaw - c.yaw) * Math.min(1, dt * 6)
      }
      c.phase += dt * 6
      return
    }

    if (c.path.length === 0) {
      c.moving = false
      // 站立时跟随所在组的实时世界坐标（乘坐旋转/升降/平移平台，含动画插值）
      this.liveNodeWorldPos(c.node, c.pos)
      return
    }

    const fromKey = c.node
    const toKey = c.path[0]
    const fromN = this.graph.nodes.get(fromKey)
    const toN = this.graph.nodes.get(toKey)
    if (!fromN || !toN) {
      c.path = []
      c.moving = false
      return
    }
    const from = fromN.pos
    const to = toN.pos
    const segLen = from.distanceTo(to)
    c.segT += (dt * c.speed) / Math.max(segLen, 0.001)

    if (c.segT >= 1) {
      c.node = toKey
      c.path.shift()
      c.segT = 0
      if (c.path.length === 0) {
        c.moving = false
        this.destPoint = null
        this.onEvent?.('arrive')
      } else {
        this.onEvent?.('step')
      }
    } else {
      c.moving = true
      c.pos.lerpVectors(from, to, c.segT)
      const dir = to.clone().sub(from)
      if (dir.lengthSq() > 1e-6) {
        const wantYaw = Math.atan2(dir.x, dir.z)
        c.yaw += shortAngle(wantYaw - c.yaw) * Math.min(1, dt * 10)
      }
    }
    c.phase += dt * 7.5

    // 脚步声：每半周期
    this.stepPhase += dt * 3.6
    if (c.moving && this.stepPhase >= 1) {
      this.stepPhase = 0
      this.onEvent?.('step')
    }
  }

  private checkPlates(): void {
    if (!this.level.plates || this.anim || this.won) return
    for (const plate of this.level.plates) {
      if (this.triggeredPlates.has(plate.id)) continue
      // 位置判定：角色所在点与压力板节点重合即触发（与锚定在哪个组的节点无关）
      const pPos = this.graph.nodes.get(plate.node)?.pos
      if (!pPos) continue
      if (this.char.pos.distanceToSquared(pPos) < 0.45 * 0.45 && !this.char.moving) {
        this.triggeredPlates.add(plate.id)
        this.triggerMechanism(plate)
      }
    }
    // 门开启判定
    if (this.level.doorRequiresPlates && this.level.plates) {
      this.doorOpen = this.level.plates.every((p) => this.triggeredPlates.has(p.id))
    }
  }

  /** 机关组类型查询 */
  private groupKind(groupId: string): string {
    return this.level.groups.find((g) => g.id === groupId)?.kind ?? 'static'
  }

  /**
   * 启动机关动画前，把站在重合点上的角色重新锚定到运动组的节点上（乘坐）。
   * 仅对平移类机关（升降台/滑台）生效：物理上角色必然站在台面上。
   */
  private reanchorToMovingGroup(groupId: string): void {
    const kind = this.groupKind(groupId)
    if (kind !== 'lifter' && kind !== 'slider') return
    const g = this.level.groups.find((gg) => gg.id === groupId)
    if (!g) return
    const m = this.groupWorldMatrix(groupId)
    for (const n of g.nodes) {
      const wp = new THREE.Vector3(...n.pos).applyMatrix4(m)
      if (this.char.pos.distanceToSquared(wp) < 0.6 * 0.6) {
        this.char.node = `${groupId}:${n.id}`
        this.char.pos.copy(wp)
        return
      }
    }
  }

  private triggerMechanism(plate: PlateDef): void {
    const g = this.level.groups.find((gg) => gg.id === plate.target)
    if (!g) return
    const cur = this.states[plate.target] ?? 0
    if (cur === plate.targetState) return
    this.reanchorToMovingGroup(plate.target)
    this.anim = {
      groupId: plate.target,
      fromVal: stateValue(g, cur),
      toVal: stateValue(g, plate.targetState),
      toState: plate.targetState,
      t: 0,
      dur: g.duration ?? 1.2,
    }
    this.worldCache = null
    if (this.char.path.length) {
      this.char.path = []
      this.char.moving = false
    }
    this.onEvent?.('plate', { plateId: plate.id, target: plate.target })
  }

  private nearestNode(p: THREE.Vector3): string {
    let best = this.level.spawn
    let bestD = Infinity
    for (const n of this.graph.nodes.values()) {
      const d = n.pos.distanceToSquared(p)
      if (d < bestD) {
        bestD = d
        best = n.key
      }
    }
    return best
  }

  /** 调试用：获取当前可达集合 */
  reachable(): Set<string> {
    return componentOf(this.graph, this.char.node)
  }
}

function shortAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a))
}

/** 复用矩阵，避免热路径分配 */
const scratchMat = new THREE.Matrix4()
