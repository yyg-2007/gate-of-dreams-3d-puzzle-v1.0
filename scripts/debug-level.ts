/** 单关连接诊断：打印每个机关状态下的重合连接与可达性 */
import { LEVELS } from '../src/levels/index'
import { buildGraph, componentOf } from '../src/systems/graph'

const id = Number(process.argv[2] ?? 4)
const level = LEVELS[id - 1]
if (!level) { console.error('no level'); process.exit(1) }

console.log(`第 ${level.id} 关《${level.name}》 spawn=${level.spawn} goal=${level.goal}`)

// 枚举机关状态组合
const mechIds = level.groups.filter((g) => g.kind !== 'static').map((g) => g.id)
const combos: Array<Record<string, number>> = [{}]
for (const m of mechIds) {
  const g = level.groups.find((gg) => gg.id === m)!
  const n = g.states?.length ?? 1
  const next: Array<Record<string, number>> = []
  for (const c of combos) for (let i = 0; i < n; i++) next.push({ ...c, [m]: i })
  combos.length = 0
  combos.push(...next)
}

for (const states of combos) {
  const graph = buildGraph(level, states)
  const comp = componentOf(graph, level.spawn)
  const label = Object.entries(states).map(([k, v]) => `${k}=${v}`).join(' ')
  const bridges = graph.bridges.map(([a, b]) => `${a}↔${b}`).join(', ')
  console.log(`\n状态[${label}] 可达 ${comp.size} 节点，跨组连接: ${bridges || '无'}`)
  console.log(`  goal 在可达集内: ${comp.has(level.goal) ? '是' : '否'}`)
  // 打印所有节点及其组
  if (process.argv[3] === '-v') {
    for (const [k, n] of graph.nodes) {
      console.log(`   ${k} (${n.pos.x.toFixed(2)}, ${n.pos.y.toFixed(2)}, ${n.pos.z.toFixed(2)}) 邻居: ${[...(graph.adj.get(k) ?? [])].join(', ')}`)
    }
  }
}
