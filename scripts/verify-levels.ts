/**
 * 关卡可通关性自动验证器（v2）。
 *
 * 三层验证：
 *  A. 静态校验：组/节点/链接完整性、节点间距。
 *  B. 可点击覆盖检查：所有节点必须靠近「可行走表面」（MeshDef.walkable 或自动道路板），
 *     否则玩家无法点击到达 —— 防止「图可通但实机不可玩」的缺陷。
 *  C. BFS 可解性：状态 = (机关组合, 已触发压力板, 角色节点)，
 *     转移 = 行走 / 站板（闩锁+乘坐重锚定）/ 点把手（含乘坐）。
 *     另枚举全部机关状态组合，统计「终点可达」的组合数作为解法多样性参考。
 */
import * as THREE from 'three'
import { LEVELS } from '../src/levels/index'
import type { LevelDef, MeshDef, GroupDef } from '../src/levels/types'
import { buildGraph, componentOf, computeWorldMatrices } from '../src/systems/graph'

/* ---------------- A. 静态校验 ---------------- */

function staticCheck(level: LevelDef): string[] {
  const problems: string[] = []
  const groupIds = new Set(level.groups.map((g) => g.id))
  if (groupIds.size !== level.groups.length) problems.push('组 id 重复')
  for (const g of level.groups) {
    if (g.parent && !groupIds.has(g.parent)) problems.push(`${g.id}: 父组 ${g.parent} 不存在`)
    const nodeIds = new Set(g.nodes.map((n) => n.id))
    for (const n of g.nodes) {
      for (const l of n.links) {
        if (!nodeIds.has(l)) problems.push(`${g.id}:${n.id} 链接了不存在的节点 ${l}`)
      }
    }
    for (let i = 0; i < g.nodes.length; i++) {
      for (let j = i + 1; j < g.nodes.length; j++) {
        const a = g.nodes[i].pos, b = g.nodes[j].pos
        const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
        if (d < 0.25 && d > 0.001) problems.push(`${g.id}: 节点 ${g.nodes[i].id}/${g.nodes[j].id} 距离过近 ${d.toFixed(2)}`)
      }
    }
  }
  if (!level.groups.some((g) => g.nodes.some((n) => `${g.id}:${n.id}` === level.spawn))) {
    problems.push(`出生点 ${level.spawn} 不存在`)
  }
  if (!level.groups.some((g) => g.nodes.some((n) => `${g.id}:${n.id}` === level.goal))) {
    problems.push(`终点 ${level.goal} 不存在`)
  }
  return problems
}

/* ---------------- B. 可点击覆盖检查 ---------------- */

/** 组内 walkable 表面（局部坐标） */
function walkableDefs(g: GroupDef): MeshDef[] {
  return g.meshes.filter((m) => m.walkable && m.pos)
}

/** 平坦自动板端点集合（组内节点 id） */
function autoPlankEndpoints(g: GroupDef): Set<string> {
  const ends = new Set<string>()
  const posOf = new Map(g.nodes.map((n) => [n.id, n.pos]))
  for (const n of g.nodes) {
    for (const l of n.links) {
      const a = posOf.get(n.id), b = posOf.get(l)
      if (!a || !b) continue
      if (Math.abs(a[1] - b[1]) > 0.05) continue
      ends.add(n.id)
      ends.add(l)
    }
  }
  return ends
}

function coverageCheck(level: LevelDef): string[] {
  const problems: string[] = []
  const world = computeWorldMatrices(level, Object.fromEntries(level.groups.map((g) => [g.id, g.initialState ?? 0])))

  // 世界空间 walkable 采样点（初始状态）
  const worldPts: THREE.Vector3[] = []
  for (const g of level.groups) {
    const m = world.get(g.id)
    if (!m) continue
    for (const def of walkableDefs(g)) {
      const p = def.pos as [number, number, number]
      worldPts.push(new THREE.Vector3(p[0], p[1], p[2]).applyMatrix4(m))
    }
  }

  const covered = new Set<string>()
  const isCoveredByWorld = (g: GroupDef, nodeId: string): boolean => {
    const node = g.nodes.find((nn) => nn.id === nodeId)
    if (!node) return false
    const wp = new THREE.Vector3(...node.pos).applyMatrix4(world.get(g.id) ?? new THREE.Matrix4())
    return worldPts.some((p) => p.distanceTo(wp) < 3.2)
  }

  for (const g of level.groups) {
    const wDefs = walkableDefs(g)
    const planks = autoPlankEndpoints(g)
    for (const n of g.nodes) {
      const key = `${g.id}:${n.id}`
      // 局部覆盖：距本组 walkable 表面 ≤5.0（长楼梯从底部标注位置，顶部节点距离较大），
      // 或是自动板端点
      const local = wDefs.some((d) => {
        const p = d.pos as [number, number, number]
        return new THREE.Vector3(p[0], p[1], p[2]).distanceTo(new THREE.Vector3(...n.pos)) < 5.0
      }) || planks.has(n.id)
      if (local) {
        covered.add(key)
        continue
      }
      if (n.port) {
        // 端口：与其它组已覆盖节点重合，或落在任意 walkable 表面附近
        const m = world.get(g.id) ?? new THREE.Matrix4()
        const wp = new THREE.Vector3(...n.pos).applyMatrix4(m)
        let ok = false
        for (const g2 of level.groups) {
          if (g2.id === g.id) continue
          const m2 = world.get(g2.id) ?? new THREE.Matrix4()
          for (const n2 of g2.nodes) {
            const wp2 = new THREE.Vector3(...n2.pos).applyMatrix4(m2)
            if (wp.distanceTo(wp2) < 0.6 && covered.has(`${g2.id}:${n2.id}`)) {
              ok = true
              break
            }
          }
          if (ok) break
        }
        if (!ok) ok = isCoveredByWorld(g, n.id)
        if (ok) {
          covered.add(key)
          continue
        }
      }
      problems.push(`${g.id}:${n.id} 无可点击表面（附近无 walkable 网格/道路板）`)
    }
  }

  for (const key of [level.spawn, level.goal]) {
    const sep = key.indexOf(':')
    const g = level.groups.find((gg) => gg.id === key.slice(0, sep))
    if (g && !covered.has(key) && !isCoveredByWorld(g, key.slice(sep + 1))) {
      problems.push(`${key}（出生/终点）在初始状态下不可点击到达`)
    }
  }
  return problems
}

/* ---------------- C. BFS 可解性（权威判定） ---------------- */

interface SearchState {
  states: Record<string, number>
  plates: string[]
  char: string
}

const stateKey = (s: SearchState) =>
  `${Object.entries(s.states).map(([k, v]) => `${k}:${v}`).join(',')}|${[...s.plates].sort().join(',')}|${s.char}`

function doorOpen(level: LevelDef, plates: string[]): boolean {
  if (!level.doorRequiresPlates) return true
  return (level.plates ?? []).every((p) => plates.includes(p.id))
}

function bfsSolvable(level: LevelDef): {
  ok: boolean; reason?: string; expansions?: number; solution?: string[]; terminalConfigs: number
} {
  const handles = level.groups.filter((g) => g.handle).map((g) => g.id)
  const initial: SearchState = {
    states: Object.fromEntries(level.groups.map((g) => [g.id, g.kind === 'static' ? 0 : (g.initialState ?? 0)])),
    plates: [],
    char: level.spawn,
  }
  const visited = new Set<string>([stateKey(initial)])
  const parent = new Map<string, { key: string; action: string }>()
  const queue: SearchState[] = [initial]
  let expansions = 0
  let terminalConfigs = 0
  let firstSolution: string[] | null = null
  const MAX = 400000

  while (queue.length && expansions < MAX) {
    const cur = queue.shift()!
    expansions++
    const graph = buildGraph(level, cur.states)
    if (!graph.nodes.has(cur.char)) continue
    const comp = componentOf(graph, cur.char)

    if (comp.has(level.goal) && doorOpen(level, cur.plates)) {
      // 统计全部可通关的终局配置（不同机关/位置组合），并保留首个（最短）解法
      terminalConfigs++
      if (!firstSolution) {
        const actions: string[] = []
        let k = stateKey(cur)
        while (parent.has(k)) {
          const p = parent.get(k)!
          actions.unshift(p.action)
          k = p.key
        }
        firstSolution = actions
      }
    }

    for (const nodeKey of comp) {
      if (nodeKey !== cur.char) {
        const walk: SearchState = { states: { ...cur.states }, plates: [...cur.plates], char: nodeKey }
        const wk = stateKey(walk)
        if (!visited.has(wk)) {
          visited.add(wk)
          parent.set(wk, { key: stateKey(cur), action: `走到 ${nodeKey}` })
          queue.push(walk)
        }
      }
      for (const p of level.plates ?? []) {
        if (cur.plates.includes(p.id)) continue
        if (nodeKey !== p.node) continue
        const ns: SearchState = {
          states: { ...cur.states, [p.target]: p.targetState },
          plates: [...cur.plates, p.id],
          char: nodeKey,
        }
        // 乘坐建模：角色重锚定到目标机关组在旧状态下与压力板重合的节点
        const platePos = graph.nodes.get(p.node)!.pos
        for (const n of graph.nodes.values()) {
          if (n.group === p.target) {
            const oldPos = graph.nodes.get(`${p.target}:${n.id}`)?.pos
            if (oldPos && oldPos.distanceTo(platePos) < 0.6) {
              ns.char = n.key
              break
            }
          }
        }
        const key = stateKey(ns)
        if (!visited.has(key)) {
          visited.add(key)
          parent.set(key, { key: stateKey(cur), action: `站上压力板 ${p.id}（${p.target} → 状态 ${p.targetState}）并乘坐` })
          queue.push(ns)
        }
      }
    }

    for (const gid of handles) {
      const g = level.groups.find((gg) => gg.id === gid)!
      const curIdx = cur.states[gid] ?? 0
      const nextIdx = (curIdx + 1) % (g.states?.length ?? 1)
      if (nextIdx === curIdx) continue
      const ns: SearchState = {
        states: { ...cur.states, [gid]: nextIdx },
        plates: [...cur.plates],
        char: cur.char,
      }
      const charPos = graph.nodes.get(cur.char)?.pos
      if (charPos) {
        let anchored = false
        for (const n of g.nodes) {
          const oldPos = graph.nodes.get(`${gid}:${n.id}`)?.pos
          if (oldPos && oldPos.distanceTo(charPos) < 0.6) {
            ns.char = `${gid}:${n.id}`
            anchored = true
            break
          }
        }
        if (!anchored) {
          const g2 = buildGraph(level, ns.states)
          for (const n of g2.nodes.values()) {
            if (n.group === gid && n.pos.distanceTo(charPos) < 0.45) {
              ns.char = n.key
              break
            }
          }
        }
      }
      const key = stateKey(ns)
      if (!visited.has(key)) {
        visited.add(key)
        parent.set(key, { key: stateKey(cur), action: `旋转 ${gid}（状态 ${curIdx} → ${nextIdx}）` })
        queue.push(ns)
      }
    }
  }
  return {
    ok: terminalConfigs > 0,
    reason: terminalConfigs > 0 ? undefined : `BFS 穷尽 ${expansions} 个状态仍未通关`,
    expansions,
    solution: firstSolution ?? undefined,
    terminalConfigs,
  }
}

/* ---------------- 运行 ---------------- */

console.log('＝＝＝＝ 幻境之门 · 关卡可通关性验证 v2 ＝＝＝＝\n')
let allOk = true

for (const level of LEVELS) {
  const t0 = Date.now()
  const staticProblems = staticCheck(level)
  const coverageProblems = staticProblems.length ? [] : coverageCheck(level)
  const bfs = staticProblems.length || coverageProblems.length ? null : bfsSolvable(level)
  const ms = Date.now() - t0

  const ok = !staticProblems.length && !coverageProblems.length && !!bfs?.ok
  console.log(`${ok ? '✅' : '❌'}  第 ${level.id} 关《${level.name}》  (${ms}ms)`)
  for (const p of staticProblems) console.log(`   [静态] ${p}`)
  for (const p of coverageProblems) console.log(`   [覆盖] ${p}`)
  if (bfs && !bfs.ok) console.log(`   [BFS] ${bfs.reason}`)
  if (bfs?.ok) {
    console.log(`   BFS 最短解法(${bfs.solution?.length ?? 0} 步): ${bfs.solution?.join(' → ')}`)
    console.log(`   解法多样性: ${bfs.terminalConfigs} 种不同的终局配置（机关状态×位置×板触发）可通关`)
  }
  if (!ok) allOk = false
}

console.log('\n－＝－ 谜题难度诊断 ＝－－')
for (const level of LEVELS) {
  const states = Object.fromEntries(level.groups.map((g) => [g.id, g.kind === 'static' ? 0 : (g.initialState ?? 0)]))
  const graph = buildGraph(level, states)
  const trivial = componentOf(graph, level.spawn).has(level.goal) && !level.doorRequiresPlates
  console.log(`${trivial ? '⚠️  初始即可通关（过于简单）' : '🔒 初始不可通关（需解谜）'}  第 ${level.id} 关`)
}

console.log(allOk ? '\n全部关卡验证通过 ✔' : '\n存在未通过验证的关卡 ✘')
process.exit(allOk ? 0 : 1)
