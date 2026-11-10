/**
 * 第二关：旋转阶梯
 * 中央高塔，两条悬空弦梯绕塔旋转。
 * 谜题：先转下层弦梯连通 底层东侧 → 中层北侧；再转上层弦梯连通 中层西侧 → 顶层南侧。
 * 干扰项：弦梯在错误角度会形成半悬空的断头路。
 */
import { makeLevel, node, ringNodes, stairNodes, staticGroup, rotatorGroup, stairsMesh, decor } from './builders'
import type { GroupDef, LevelDef } from './types'

const R = 2.6
const H1 = 2.4   // 中层高度
const H2 = 4.8   // 顶层高度

// 底层八边形环道（角度 0=E, 2=N, 4=W, 6=S）
const bottomRing = ringNodes('b', [0, 0], R, [0, 45, 90, 135, 180, 225, 270, 315], 0, true)
// 中层八边形环道
const midRing = ringNodes('m', [0, 0], R, [0, 45, 90, 135, 180, 225, 270, 315], H1, true)
// 顶层：仅南侧段 + 门台
const topNodes = [
  node('t0', [0, H2, -R], ['t1'], { port: true }),
  node('t1', [0, H2, -3.5], ['t0']),
]

bottomRing[0].port = true   // E
bottomRing[2].port = true   // N
bottomRing[4].port = true   // W
bottomRing[6].port = true   // S
midRing[2].port = true      // N
midRing[4].port = true      // W

// 弦梯 A：底层 E(2.6,0,0) → 中层 N(0,2.4,2.6)
// 旋转角取 75°：错误状态下所有节点（含中间节点）与环道节点距离 >0.45，
// 且不与其它弦梯端点重合 —— 已由验证器覆盖检查与图连接扫描双重确认
const chordA = rotatorGroup('chordA',
  [0, 0, 0],
  [75, 0],
  stairNodes('ca', [R, 0, 0], [0, H1, R], 6, { portStart: true, portEnd: true }),
  [
    stairsMesh([R, 0, 0], -45, 1.35, H1, Math.hypot(R, R), 6, { color: 'stone' }),
    { kind: 'box', pos: [1.55, 1.35, 0.86], rot: [0, -45, 0], size: [3.6, 0.09, 0.09], color: 'stoneDark' },
    { kind: 'box', pos: [1.05, 1.35, -0.86], rot: [0, -45, 0], size: [3.6, 0.09, 0.09], color: 'stoneDark' },
  ],
  [0.61, 0.85, -2.27],
  { duration: 1.25 },
)

// 弦梯 B：中层 W(-2.6,2.4,0) → 顶层 S(0,4.8,-2.6)，错误角 120°（无意外重合）
// 把手置于弦梯起点（中层 W 端口）上方：任何旋转角下都不被塔身/梯体遮挡
const chordB = rotatorGroup('chordB',
  [0, 0, 0],
  [120, 0],
  stairNodes('cb', [-R, H1, 0], [0, H2, -R], 6, { portStart: true, portEnd: true }),
  [
    stairsMesh([-R, H1, 0], 135, 1.35, H2 - H1, Math.hypot(R, R), 6, { color: 'stone' }),
    { kind: 'box', pos: [-0.55, H1 + 1.2, 0.86], rot: [0, 135, 0], size: [3.6, 0.09, 0.09], color: 'stoneDark' },
    { kind: 'box', pos: [-1.05, H1 + 1.2, -0.86], rot: [0, 135, 0], size: [3.6, 0.09, 0.09], color: 'stoneDark' },
  ],
  [-2.35, 3.25, 0],
  { duration: 1.25 },
)

// 塔身
const tower = staticGroup('tower', [], [
  { kind: 'cyl', pos: [0, 2.5, 0], size: [1.55, 1.75, 5.0], color: 'stone' },
  { kind: 'torus', pos: [0, 1.6, 0], rot: [90, 0, 0], size: [1.62, 0.09], color: 'accent2' },
  { kind: 'torus', pos: [0, 3.4, 0], rot: [90, 0, 0], size: [1.62, 0.09], color: 'accent2' },
  { kind: 'dome', pos: [0, 5.0, 0], size: 1.58, color: 'stoneDark' },
  { kind: 'flag', pos: [0, 6.2, 0], size: 1.5, color: 'accent' },
  { kind: 'cyl', pos: [0, -0.5, 0], size: [2.0, 2.4, 1.0], color: 'stoneDark' },
])

const level: LevelDef = makeLevel({
  id: 2,
  name: '旋转阶梯',
  subtitle: '塔身回转，拾级而上',
  hint: '旋转悬空弦梯，让两端搭上环道 · 乘着旋转的阶梯向上',
  paletteKey: 'noon',
  camera: { target: [0, 2.4, 0], viewSize: 19, azimuth: 24, elevation: 34 },
  spawn: 'ringB:b6',
  goal: 'top:t1',
  door: { pos: [0, H2, -4.15], rotY: 0, scale: 0.95 },
  groups: [
    staticGroup('ringB', bottomRing, [], { noAutoPlank: true }),
    staticGroup('ringM', midRing, [], { noAutoPlank: true }),
    staticGroup('top', topNodes, [], { noAutoPlank: true }),
    chordA,
    chordB,
    tower,
  ],
  plates: [],
  decor: [
    decor('island', [-8, 1.5, -7], { scale: 1.2 }),
    decor('island', [9, 4.5, -8], { scale: 1.4 }),
    decor('island', [0, -3, -12], { scale: 1.0 }),
    decor('tree', [8.6, 5.0, -7.6], { scale: 0.9, color: '#4fae9a' }),
    decor('flower', [2.1, 0, 2.1], { color: '#f4b942' }),
    decor('flower', [-2.2, 0, 2.0], { color: '#ff8ab0' }),
    decor('grassTuft', [2.3, 0, -2.0], {}),
    decor('grassTuft', [-2.0, 0, -2.3], {}),
    decor('ruinPillar', [6.5, 0, 3.5], { scale: 1 }),
    decor('ruinPillar', [7.4, -0.5, 2.6], { scale: 0.75 }),
    decor('obelisk', [-7.5, 1.0, 4.5], { scale: 0.9 }),
    decor('hangingIsland', [5, 9.5, -9], { scale: 0.9 }),
  ],
  water: { y: -1.3, radius: 44 },
  particles: 'petals',
})

// 环道甲板段（覆盖自动板，视觉更厚实）
function deckRing(g: GroupDef, y: number): void {
  for (let i = 0; i < 8; i++) {
    const a0 = (i * 45) * Math.PI / 180
    const a1 = ((i + 1) * 45) * Math.PI / 180
    const x0 = Math.cos(a0) * R, z0 = Math.sin(a0) * R
    const x1 = Math.cos(a1) * R, z1 = Math.sin(a1) * R
    g.meshes.push({
      kind: 'box',
      pos: [(x0 + x1) / 2, y - 0.14, (z0 + z1) / 2],
      rot: [0, -Math.atan2(z1 - z0, x1 - x0) * 180 / Math.PI + 90, 0],
      size: [1.96, 0.26, 1.3],
      color: 'path',
      walkable: true,
    })
  }
  g.meshes.push({ kind: 'disc', pos: [0, y - 0.55, 0], size: [R - 0.75, R - 0.45, 0.3], color: 'stoneDark' })
}
deckRing(level.groups[0], 0)
deckRing(level.groups[1], H1)
level.groups[2].meshes.push(
  { kind: 'box', pos: [0, H2 - 0.14, -3.05], size: [1.5, 0.26, 1.7], color: 'path', walkable: true },
  { kind: 'cyl', pos: [0, H2 - 0.28, -3.0], size: [1.1, 1.3, 0.5], color: 'stone', walkable: true },
  { kind: 'cone', pos: [0, H2 - 1.2, -3.0], rot: [180, 0, 0], size: [0.9, 1.6], color: 'stoneDark' },
)

export default level
