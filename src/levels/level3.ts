/**
 * 第三关：消失的桥梁
 * 谜题链：站上压力板 → 隐藏的西桥从侧方滑入连接左岛与中岛；
 *         走到中岛后旋转东桥对齐右岛；上台阶抵达门台。
 */
import { makeLevel, node, stairNodes, staticGroup, rotatorGroup, sliderGroup, stairsMesh, decor, plate } from './builders'
import type { LevelDef } from './types'

// 左岛（出生 + 压力板）
const isleA = staticGroup('isleA',
  [
    node('a0', [-6.4, 0, 0], ['a1']),
    node('a1', [-5.2, 0, 0], ['a0', 'a2']),
    node('a2', [-4.0, 0, 0], ['a1', 'a3']),
    node('a3', [-2.9, 0, 0], ['a2'], { port: true }),
  ],
  [
    { kind: 'cyl', pos: [-5.0, -0.27, 0], size: [2.5, 2.75, 0.54], color: 'stone', walkable: true },
    { kind: 'torus', pos: [-5.0, 0.01, 0], rot: [90, 0, 0], size: [2.46, 0.08], color: 'accent2' },
    { kind: 'cone', pos: [-5.0, -1.55, 0], rot: [180, 0, 0], size: [2.1, 2.2], color: 'stoneDark' },
    { kind: 'lamp', pos: [-6.1, 0, 1.3], size: 0.85, color: 'accent' },
    { kind: 'petalBasin', pos: [-4.2, 0, -1.5], size: 0.55 },
  ],
)

// 隐藏的西桥（滑桥：初始藏在 z=3.2 的雾后）
const westBridge = sliderGroup('westBridge',
  'z', [0, 0, 0],
  [3.2, 0],
  [
    node('w0', [-2.9, 0, 0], ['w1'], { port: true }),
    node('w1', [-2.1, 0, 0], ['w0', 'w2']),
    node('w2', [-1.35, 0, 0], ['w1'], { port: true }),
  ],
  [
    { kind: 'box', pos: [-2.12, -0.12, 0], size: [2.1, 0.3, 1.3], color: 'path', walkable: true },
    { kind: 'disc', pos: [-2.9, -0.02, 0], size: [0.32, 0.32, 0.08], color: 'accent2', glow: true },
  ],
  { duration: 1.3 },
)

// 中岛
const isleM = staticGroup('isleM',
  [
    node('m0', [-1.35, 0, 0], ['mc'], { port: true }),
    node('mc', [0, 0, 0], ['m0', 'm1']),
    node('m1', [1.4, 0, 0], ['mc'], { port: true }),
  ],
  [
    { kind: 'cyl', pos: [0, -0.27, 0], size: [1.6, 1.8, 0.54], color: 'stone', walkable: true },
    { kind: 'torus', pos: [0, 0.01, 0], rot: [90, 0, 0], size: [1.56, 0.08], color: 'accent2' },
    { kind: 'cone', pos: [0, -1.35, 0], rot: [180, 0, 0], size: [1.3, 1.7], color: 'stoneDark' },
    { kind: 'obelisk', pos: [0, 0, 0], size: 0.9 },
  ],
)

// 东桥（转台：初始指向侧方断开）
const eastBridge = rotatorGroup('eastBridge',
  [0, 0, 0],
  [90, 0],
  [
    node('e0', [1.4, 0, 0], ['e1'], { port: true }),
    node('e1', [2.9, 0, 0], ['e0'], { port: true }),
  ],
  [
    { kind: 'box', pos: [2.15, -0.12, 0], size: [2.1, 0.3, 1.3], color: 'path', walkable: true },
    { kind: 'cyl', pos: [2.15, -0.5, 0], size: [0.4, 0.6, 0.75], color: 'stoneDark' },
    { kind: 'disc', pos: [2.9, -0.02, 0], size: [0.32, 0.32, 0.08], color: 'accent2', glow: true },
  ],
  [2.15, 0.72, 0],
  { duration: 1.15 },
)

// 右岛 + 台阶 + 门台
const isleB = staticGroup('isleB',
  [
    node('b0', [2.9, 0, 0], ['b1'], { port: true }),
    node('b1', [4.0, 0, 0], ['b0', 'u0']),
    ...stairNodes('u', [4.0, 0, 0], [5.4, 1.4, 0], 6),
  ],
  [
    { kind: 'cyl', pos: [4.4, -0.27, 0], size: [2.1, 2.3, 0.54], color: 'stone', walkable: true },
    { kind: 'torus', pos: [4.4, 0.01, 0], rot: [90, 0, 0], size: [2.06, 0.08], color: 'accent2' },
    { kind: 'cone', pos: [4.4, -1.45, 0], rot: [180, 0, 0], size: [1.8, 2.0], color: 'stoneDark' },
    stairsMesh([4.0, 0, 0], 90, 1.4, 1.4, 1.45, 6, { color: 'stone' }),
    { kind: 'lamp', pos: [3.6, 0, 1.4], size: 0.8, color: 'accent' },
  ],
)

const terrace = staticGroup('terrace',
  [
    node('t0', [5.5, 1.4, 0], ['t1']),
    node('t1', [6.2, 1.4, 0], ['t0']),
  ],
  [
    { kind: 'cyl', pos: [6.1, 1.14, 0], size: [1.25, 1.4, 0.52], color: 'stone', walkable: true },
    { kind: 'torus', pos: [6.1, 1.41, 0], rot: [90, 0, 0], size: [1.22, 0.06], color: 'accent' },
    { kind: 'cone', pos: [6.1, 0.3, 0], rot: [180, 0, 0], size: [1.0, 1.3], color: 'stoneDark' },
  ],
)

const level: LevelDef = makeLevel({
  id: 3,
  name: '消失的桥梁',
  subtitle: '唤回沉入梦隙的桥',
  hint: '站上发光的压力板，唤回隐藏的桥 · 再旋转中岛上的东桥',
  paletteKey: 'dusk',
  camera: { target: [0, 0.7, 0], viewSize: 12, azimuth: 18, elevation: 30 },
  spawn: 'isleA:a0',
  goal: 'terrace:t1',
  door: { pos: [7.0, 1.4, 0], rotY: 90, scale: 0.95 },
  groups: [isleA, westBridge, isleM, eastBridge, isleB, terrace],
  plates: [
    plate('plateA', 'isleA:a1', [-5.2, 0, 0], 'westBridge', 1),
  ],
  decor: [
    decor('island', [-9, 2.5, -8], { scale: 1.2 }),
    decor('island', [10, 3.8, -9], { scale: 1.1 }),
    decor('island', [2, -2.6, -12], { scale: 0.9 }),
    decor('hangingIsland', [-4, 8, -9], { scale: 1.0 }),
    decor('flower', [-5.6, 0, 1.2], { color: '#ff8aa8' }),
    decor('flower', [-4.4, 0, -0.9], { color: '#f4b942' }),
    decor('bush', [4.9, 0, -1.3], { scale: 0.8 }),
    decor('grassTuft', [4.2, 0, 1.3], {}),
    decor('ruinPillar', [-8.5, 0, 2.5], { scale: 1.1 }),
    decor('ruinPillar', [7.5, 0, -2.8], { scale: 0.9 }),
    decor('lanternPost', [0.9, 0, 1.9], { scale: 0.9 }),
  ],
  water: { y: -1.25, radius: 44 },
  particles: 'petals',
})

export default level
