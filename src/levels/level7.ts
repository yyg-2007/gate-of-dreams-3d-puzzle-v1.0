/**
 * 第七关：无尽回廊
 * 方形悬空庭院，四角立柱。南桥旋转、东梯固定、北桥旋转、西天梯旋转。
 * 沿回廊绕行一圈，层层向上，最终从庭院中心的门离开无尽回廊。
 */
import { makeLevel, node, staticGroup, rotatorGroup, stairsMesh, decor } from './builders'
import type { GroupDef, LevelDef, Vec3 } from './types'

const Y1 = 1.6
const YC = 3.2
const C = 3.0 // 庭院半宽

// 四角立柱
function corner(id: string, pos: Vec3, y: number, extraMeshes: GroupDef['meshes'] = []): GroupDef {
  return staticGroup(id,
    [node(`${id}0`, [pos[0], y, pos[2]], [], { port: true })],
    [
      { kind: 'cyl', pos: [pos[0], y - 0.26, pos[2]], size: [1.3, 1.45, 0.52], color: 'stone', walkable: true },
      { kind: 'torus', pos: [pos[0], y + 0.01, pos[2]], rot: [90, 0, 0], size: [1.26, 0.07], color: 'accent2' },
      { kind: 'cone', pos: [pos[0], y - 1.7, pos[2]], rot: [180, 0, 0], size: [1.05, 2.6], color: 'stoneDark' },
      ...extraMeshes,
    ],
  )
}

const sw = corner('sw', [-C, 0, -C], 0, [
  { kind: 'arch', pos: [-C, 0, -C - 1.35], rot: [0, 0, 0], size: [1.4, 2.0, 0.34], color: 'stone' },
  { kind: 'lamp', pos: [-C - 0.9, 0, -C + 0.7], size: 0.75, color: 'accent' },
])
const se = corner('se', [C, 0, -C], 0, [
  { kind: 'lamp', pos: [C + 0.9, 0, -C + 0.7], size: 0.75, color: 'accent' },
])
const ne = corner('ne', [C, Y1, C], Y1)
const nw = corner('nw', [-C, Y1, C], Y1, [
  { kind: 'flag', pos: [-C, Y1 + 0.1, C], size: 1.3, color: 'accent' },
])

// 南桥（旋转）：SW ↔ SE，错误角 90° 落在庭院中心（无节点）
const wingS = rotatorGroup('wingS',
  [0, 0, -C],
  [90, 0],
  [
    node('w0', [-C, 0, 0], ['w1'], { port: true }),
    node('w1', [0, 0, 0], ['w0', 'w2']),
    node('w2', [C, 0, 0], ['w1'], { port: true }),
  ],
  [
    { kind: 'box', pos: [0, -0.12, 0], size: [6.9, 0.26, 1.25], color: 'path', walkable: true },
    { kind: 'box', pos: [0, 0.2, 0.58], size: [6.5, 0.08, 0.08], color: 'stone' },
    { kind: 'box', pos: [0, 0.2, -0.58], size: [6.5, 0.08, 0.08], color: 'stone' },
  ],
  [0, 0.62, 0],
  { duration: 1.2 },
)

// 东梯（固定）：SE(y0) → NE(y1.6)
const eastStairs = staticGroup('eastStairs',
  [
    node('s0', [C, 0, -C], ['s1'], { port: true }),
    node('s1', [C, 0.4, -C + 1.5], ['s0', 's2']),
    node('s2', [C, 0.8, 0], ['s1', 's3']),
    node('s3', [C, 1.2, C - 1.5], ['s2', 's4']),
    node('s4', [C, Y1, C], ['s3'], { port: true }),
  ],
  [
    stairsMesh([C, 0, -C], 0, 1.3, Y1, 2 * C, 8, { color: 'stone' }),
    { kind: 'box', pos: [C + 0.62, 0.8, 0], size: [0.08, 0.08, 2 * C], color: 'stoneDark' },
    { kind: 'box', pos: [C - 0.62, 0.8, 0], size: [0.08, 0.08, 2 * C], color: 'stoneDark' },
  ],
)

// 北桥（旋转）：NE ↔ NW，错误角 90° 时端点 (0,1.6,6) 与 (0,1.6,0)
const wingN = rotatorGroup('wingN',
  [0, Y1, C],
  [90, 0],
  [
    node('w0', [-C, 0, 0], ['w1'], { port: true }),
    node('w1', [0, 0, 0], ['w0', 'w2']),
    node('w2', [C, 0, 0], ['w1'], { port: true }),
  ],
  [
    { kind: 'box', pos: [0, -0.12, 0], size: [6.9, 0.26, 1.25], color: 'path', walkable: true },
    { kind: 'box', pos: [0, 0.2, 0.58], size: [6.5, 0.08, 0.08], color: 'stone' },
    { kind: 'box', pos: [0, 0.2, -0.58], size: [6.5, 0.08, 0.08], color: 'stone' },
  ],
  [0, 0.62, 0],
  { duration: 1.2 },
)

// 西天梯（旋转）：NW(y1.6) → 中央平台(y3.2)，错误角 135°
const wingW = rotatorGroup('wingW',
  [-1.5, Y1, 1.5],
  [135, 0],
  [
    node('w0', [-1.5, 0, 1.5], ['w1'], { port: true }),
    node('w1', [0, 0.8, 0], ['w0', 'w2']),
    node('w2', [1.5, YC - Y1, -1.5], ['w1'], { port: true }),
  ],
  [
    stairsMesh([-1.5, 0, 1.5], 135, 1.3, YC - Y1, Math.hypot(3, 3), 8, { color: 'stone' }),
    { kind: 'box', pos: [-0.9, 0.9, 1.1], rot: [0, 45, 0], size: [4.2, 0.08, 0.08], color: 'stoneDark' },
  ],
  [0, 0.75, 0],
  { duration: 1.3 },
)

// 中央平台 + 门
const center = staticGroup('center',
  [
    node('cp0', [0, YC, 0], ['cp1'], { port: true }),
    node('cp1', [0, YC, 0.95], ['cp0']),
  ],
  [
    { kind: 'cyl', pos: [0, YC - 0.26, 0.2], size: [1.35, 1.5, 0.52], color: 'stone', walkable: true },
    { kind: 'torus', pos: [0, YC + 0.01, 0.2], rot: [90, 0, 0], size: [1.31, 0.07], color: 'accent' },
    { kind: 'cone', pos: [0, YC - 1.5, 0.2], rot: [180, 0, 0], size: [1.1, 2.2], color: 'stoneDark' },
    { kind: 'lamp', pos: [-1.0, YC, -0.4], size: 0.7, color: 'accent' },
    { kind: 'lamp', pos: [1.0, YC, -0.4], size: 0.7, color: 'accent' },
  ],
)

const level: LevelDef = makeLevel({
  id: 7,
  name: '无尽回廊',
  subtitle: '走不出的庭院，走得出的门',
  hint: '沿回廊绕行：南桥、东梯、北桥、西天梯 · 每一段都要对齐才能继续上升',
  paletteKey: 'garden',
  camera: { target: [0, 1.6, 0], viewSize: 15.5, azimuth: 40, elevation: 34 },
  spawn: 'sw:sw0',
  goal: 'center:cp1',
  door: { pos: [0, YC, 1.85], rotY: 180, scale: 0.9 },
  groups: [sw, se, ne, nw, wingS, eastStairs, wingN, wingW, center],
  plates: [],
  decor: [
    decor('pine', [-6.5, 0, 4.5], { scale: 1.2, color: '#4fae7a' }),
    decor('pine', [6.8, 0, 4.2], { scale: 1.0, color: '#4fae7a' }),
    decor('pine', [7.5, 0, 5.5], { scale: 1.3, color: '#3f9e6e' }),
    decor('tree', [-7.5, 0, 2], { scale: 1.0, color: '#58b888' }),
    decor('island', [-9, 2, 8], { scale: 1.1 }),
    decor('island', [9, 3, 8], { scale: 1.2 }),
    decor('island', [0, -3.5, -12], { scale: 1.2 }),
    decor('flower', [-C + 0.6, 0, -C + 0.6], { color: '#ff8a8a' }),
    decor('flower', [C - 0.7, 0, -C + 0.6], { color: '#f4b942' }),
    decor('grassTuft', [-C - 0.5, 0, -C - 0.5], {}),
    decor('grassTuft', [C + 0.5, 0, -C - 0.5], {}),
    decor('ruinPillar', [0, -1.8, -6.5], { scale: 1.2 }),
    decor('ruinPillar', [1.2, -2.2, -6.0], { scale: 0.8 }),
    decor('statue', [-6.8, 0.2, 1.5], { scale: 1 }),
    decor('hangingIsland', [4, 8.5, -9], { scale: 1.0 }),
  ],
  water: { y: -1.5, radius: 46 },
  particles: 'petals',
})

export default level
