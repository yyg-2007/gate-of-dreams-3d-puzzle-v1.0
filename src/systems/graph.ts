import * as THREE from 'three'
import type { GroupDef, LevelDef, Vec3 } from '../levels/types'

/* ------------------------------------------------------------------ */
/* 数学与建造辅助                                                       */
/* ------------------------------------------------------------------ */

export const DEG = Math.PI / 180

export function v3(p: Vec3): THREE.Vector3 {
  return new THREE.Vector3(p[0], p[1], p[2])
}

/* ------------------------------------------------------------------ */
/* 组世界变换                                                           */
/* ------------------------------------------------------------------ */

/** 机关在给定状态下的局部偏移值（rotator: 角度弧度；slider/lifter: 位移） */
export function stateValue(g: GroupDef, stateIndex: number): number {
  const states = g.states ?? []
  const raw = states[Math.max(0, Math.min(states.length - 1, stateIndex))] ?? 0
  return g.kind === 'rotator' ? raw * DEG : raw
}

/** 组的局部矩阵：T(pos) · R(axis, angle) 或 T(pos + axis*offset) */
export function groupLocalMatrix(g: GroupDef, val: number, out = new THREE.Matrix4()): THREE.Matrix4 {
  const pos = v3(g.pos ?? [0, 0, 0])
  if (g.kind === 'rotator') {
    const axis = g.axis ?? 'y'
    const q = new THREE.Quaternion()
    if (axis === 'x') q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), val)
    else if (axis === 'z') q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), val)
    else q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), val)
    out.compose(pos, q, new THREE.Vector3(1, 1, 1))
  } else if (g.kind === 'slider' || g.kind === 'lifter') {
    const axis = g.axis ?? 'x'
    const off = new THREE.Vector3()
    if (axis === 'x') off.set(val, 0, 0)
    else if (axis === 'y') off.set(0, val, 0)
    else off.set(0, 0, val)
    out.compose(pos.add(off), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1))
  } else {
    out.compose(pos, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1))
  }
  return out
}

/**
 * 计算所有组的世界矩阵。
 * animVal: 机关组动画中的临时值（覆盖其状态值），用于渲染与乘坐。
 */
export function computeWorldMatrices(
  level: LevelDef,
  states: Record<string, number>,
  animVal?: Record<string, number>,
): Map<string, THREE.Matrix4> {
  const byId = new Map<string, GroupDef>()
  for (const g of level.groups) byId.set(g.id, g)
  const world = new Map<string, THREE.Matrix4>()

  const resolve = (g: GroupDef, seen = new Set<string>()): THREE.Matrix4 => {
    if (world.has(g.id)) return world.get(g.id)!
    if (seen.has(g.id)) {
      // 循环引用保护：按静止处理
      const m = new THREE.Matrix4()
      world.set(g.id, m)
      return m
    }
    seen.add(g.id)
    const val = animVal && animVal[g.id] !== undefined ? animVal[g.id] : stateValue(g, states[g.id] ?? g.initialState ?? 0)
    const local = groupLocalMatrix(g, val)
    if (g.parent && byId.has(g.parent)) {
      const pm = resolve(byId.get(g.parent)!, seen)
      local.premultiply(pm)
    }
    world.set(g.id, local)
    return local
  }

  for (const g of level.groups) resolve(g)
  return world
}

/* ------------------------------------------------------------------ */
/* 行走图                                                              */
/* ------------------------------------------------------------------ */

export interface WorldNode {
  key: string // "groupId:nodeId"
  group: string
  id: string
  pos: THREE.Vector3
  port: boolean
}

export interface WalkGraph {
  nodes: Map<string, WorldNode>
  adj: Map<string, Set<string>>
  /** 跨组连接对（用于调试与渲染端口） */
  bridges: Array<[string, string]>
}

/** 重合判定阈值：水平距离与垂直距离 */
export const LINK_XZ = 0.45
export const LINK_Y = 0.4

export function buildGraph(level: LevelDef, states: Record<string, number>): WalkGraph {
  const world = computeWorldMatrices(level, states)
  const nodes = new Map<string, WorldNode>()
  for (const g of level.groups) {
    const m = world.get(g.id) ?? new THREE.Matrix4()
    for (const n of g.nodes) {
      const p = v3(n.pos).applyMatrix4(m)
      nodes.set(`${g.id}:${n.id}`, { key: `${g.id}:${n.id}`, group: g.id, id: n.id, pos: p, port: !!n.port })
    }
  }

  const adj = new Map<string, Set<string>>()
  const link = (a: string, b: string) => {
    if (a === b) return
    if (!adj.has(a)) adj.set(a, new Set())
    if (!adj.has(b)) adj.set(b, new Set())
    adj.get(a)!.add(b)
    adj.get(b)!.add(a)
  }

  // 1) 组内显式连接
  const explicit = new Set<string>()
  for (const g of level.groups) {
    for (const n of g.nodes) {
      const key = `${g.id}:${n.id}`
      for (const l of n.links) {
        const other = `${g.id}:${l}`
        if (nodes.has(other)) {
          link(key, other)
          explicit.add(pairId(key, other))
        }
      }
    }
  }

  // 2) 跨组世界坐标重合连接 —— 空间错觉的核心规则
  const bridges: Array<[string, string]> = []
  const all = [...nodes.values()]
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j]
      if (a.group === b.group) continue
      const dx = a.pos.x - b.pos.x
      const dz = a.pos.z - b.pos.z
      const dy = a.pos.y - b.pos.y
      if (dx * dx + dz * dz < LINK_XZ * LINK_XZ && Math.abs(dy) < LINK_Y) {
        const pid = pairId(a.key, b.key)
        if (!explicit.has(pid)) {
          link(a.key, b.key)
          bridges.push([a.key, b.key])
        }
      }
    }
  }

  return { nodes, adj, bridges }
}

function pairId(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

/* ------------------------------------------------------------------ */
/* A* 寻路                                                             */
/* ------------------------------------------------------------------ */

export function findPath(graph: WalkGraph, from: string, to: string): string[] | null {
  if (from === to) return [from]
  if (!graph.nodes.has(from) || !graph.nodes.has(to)) return null

  const open: Array<{ key: string; f: number }> = []
  const gScore = new Map<string, number>()
  const parent = new Map<string, string>()
  const h = (k: string) => graph.nodes.get(k)!.pos.distanceTo(graph.nodes.get(to)!.pos)

  gScore.set(from, 0)
  open.push({ key: from, f: h(from) })
  const closed = new Set<string>()

  while (open.length) {
    let bi = 0
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i
    const cur = open.splice(bi, 1)[0].key
    if (cur === to) {
      const path: string[] = [to]
      let k = to
      while (parent.has(k)) {
        k = parent.get(k)!
        path.push(k)
      }
      return path.reverse()
    }
    if (closed.has(cur)) continue
    closed.add(cur)

    const cp = graph.nodes.get(cur)!.pos
    for (const nb of graph.adj.get(cur) ?? []) {
      if (closed.has(nb)) continue
      const np = graph.nodes.get(nb)!.pos
      const w = cp.distanceTo(np)
      const g = (gScore.get(cur) ?? Infinity) + w
      if (g < (gScore.get(nb) ?? Infinity)) {
        gScore.set(nb, g)
        parent.set(nb, cur)
        open.push({ key: nb, f: g + h(nb) })
      }
    }
  }
  return null
}

/** 从某节点出发的可达节点集合（连通分量） */
export function componentOf(graph: WalkGraph, from: string): Set<string> {
  const seen = new Set<string>([from])
  const queue = [from]
  while (queue.length) {
    const cur = queue.pop()!
    for (const nb of graph.adj.get(cur) ?? []) {
      if (!seen.has(nb)) {
        seen.add(nb)
        queue.push(nb)
      }
    }
  }
  return seen
}

/* ------------------------------------------------------------------ */
/* 缓动                                                               */
/* ------------------------------------------------------------------ */

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

export const easeOutBack = (t: number): number => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

export const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
