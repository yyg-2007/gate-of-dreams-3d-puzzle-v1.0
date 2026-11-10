/**
 * 第八关：梦境终点（终章）
 * 组合全部机关：压力板唤起沉桥 → 旋转长桥跨越梦隙 →
 * 站上北台压力板，升降台连人带台升入大门高台。双压力板共同解锁终点之门。
 */
import { makeLevel, node, staticGroup, rotatorGroup, sliderGroup, lifterGroup, decor, plate } from './builders'
import type { LevelDef } from './types'

const YG = 2.6

// 出生岛
const spawnIsle = staticGroup('spawnIsle',
  [
    node('g0', [-7.4, 0, 0], ['g1']),
    node('g1', [-6.4, 0, 0], ['g0', 'g2']),
    node('g2', [-5.2, 0, 0], ['g1', 'g3']),
    node('g3', [-4.6, 0, 0], ['g2'], { port: true }),
  ],
  [
    { kind: 'cyl', pos: [-6.4, -0.28, 0], size: [2.05, 2.25, 0.56], color: 'stone', walkable: true },
    { kind: 'torus', pos: [-6.4, 0.01, 0], rot: [90, 0, 0], size: [2.01, 0.08], color: 'accent2' },
    { kind: 'cone', pos: [-6.4, -1.55, 0], rot: [180, 0, 0], size: [1.75, 2.0], color: 'stoneDark' },
    { kind: 'arch', pos: [-7.9, 0, 0], rot: [0, 90, 0], size: [1.6, 2.2, 0.36], color: 'stone' },
    { kind: 'disc', pos: [-7.9, 2.34, 0], size: [0.5, 0.5, 0.12], color: 'accent', glow: true },
    { kind: 'lamp', pos: [-6.0, 0, 1.5], size: 0.85, color: 'accent' },
    { kind: 'lamp', pos: [-6.0, 0, -1.5], size: 0.85, color: 'accent' },
  ],
)

// 沉睡的桥（压力板唤起，从南侧水面升起）
const dreamBridge = sliderGroup('dreamBridge',
  'z', [-4.6, 0, 0],
  [3.2, 0],
  [
    node('d0', [0, 0, 0], ['d1'], { port: true }),
    node('d1', [0.8, 0, 0], ['d0', 'd2']),
    node('d2', [1.6, 0, 0], ['d1'], { port: true }),
  ],
  [
    { kind: 'box', pos: [0.8, -0.12, 0], size: [2.4, 0.28, 1.3], color: 'path', walkable: true },
    { kind: 'disc', pos: [0, -0.02, 0], size: [0.32, 0.32, 0.08], color: 'accent2', glow: true },
    { kind: 'disc', pos: [1.6, -0.02, 0], size: [0.32, 0.32, 0.08], color: 'accent2', glow: true },
  ],
  { duration: 1.4 },
)

// 中岛
const midIsle = staticGroup('midIsle',
  [
    node('miW', [-3.0, 0, 0], ['miC'], { port: true }),
    node('miC', [-2.2, 0, 0], ['miW', 'miE']),
    node('miE', [-1.4, 0, 0], ['miC'], { port: true }),
  ],
  [
    { kind: 'cyl', pos: [-2.2, -0.28, 0], size: [1.35, 1.5, 0.56], color: 'stone', walkable: true },
    { kind: 'torus', pos: [-2.2, 0.01, 0], rot: [90, 0, 0], size: [1.31, 0.08], color: 'accent2' },
    { kind: 'cone', pos: [-2.2, -1.5, 0], rot: [180, 0, 0], size: [1.1, 1.9], color: 'stoneDark' },
    { kind: 'crystal', pos: [-2.2, 0.75, 0], size: 0.2, color: 'accent', glow: true },
  ],
)

// 旋转长桥
const grandBridge = rotatorGroup('grandBridge',
  [0.2, 0, 0],
  [90, 0],
  [
    node('gb0', [-1.6, 0, 0], ['gb1'], { port: true }),
    node('gb1', [0, 0, 0], ['gb0', 'gb2']),
    node('gb2', [1.6, 0, 0], ['gb1'], { port: true }),
  ],
  [
    { kind: 'box', pos: [0, -0.12, 0], size: [4.1, 0.3, 1.35], color: 'path', walkable: true },
    { kind: 'box', pos: [0, 0.24, 0.63], size: [3.8, 0.09, 0.09], color: 'accent' },
    { kind: 'box', pos: [0, 0.24, -0.63], size: [3.8, 0.09, 0.09], color: 'accent' },
    { kind: 'cyl', pos: [0, -0.5, 0], size: [0.5, 0.65, 0.8], color: 'stoneDark' },
  ],
  [0, 0.72, 0],
  { duration: 1.2 },
)

// 北台（第二块压力板）
const northIsle = staticGroup('northIsle',
  [
    node('np0', [1.8, 0, 0], ['np1'], { port: true }),
    node('np1', [2.9, 0, 0], ['np0']),
  ],
  [
    { kind: 'cyl', pos: [2.6, -0.28, 0], size: [1.35, 1.5, 0.56], color: 'stone', walkable: true },
    { kind: 'torus', pos: [2.6, 0.01, 0], rot: [90, 0, 0], size: [1.31, 0.08], color: 'accent2' },
    { kind: 'cone', pos: [2.6, -1.5, 0], rot: [180, 0, 0], size: [1.1, 1.9], color: 'stoneDark' },
  ],
)

// 终章升降台（压力板即站台）
const dreamLift = lifterGroup('dreamLift',
  [2.9, 0, 0],
  [0, YG],
  [node('l0', [0, 0, 0], [], { port: true })],
  [
    { kind: 'cyl', pos: [0, -0.09, 0], size: [0.98, 1.08, 0.24], color: 'path', walkable: true },
    { kind: 'torus', pos: [0, 0.05, 0], rot: [90, 0, 0], size: [0.95, 0.06], color: 'accent' },
    { kind: 'cyl', pos: [0, -0.42, 0], size: [0.55, 0.7, 0.5], color: 'stoneDark' },
  ],
  { duration: 1.8 },
)
dreamLift.handle = { pos: [0, 0.58, 0] }

// 大门高台
const gatePlatform = staticGroup('gatePlatform',
  [
    node('gp0', [2.9, YG, 0], ['gp1'], { port: true }),
    node('gp1', [2.9, YG, 1.2], ['gp0']),
  ],
  [
    { kind: 'cyl', pos: [2.9, YG - 0.3, 0.4], size: [2.05, 2.3, 0.6], color: 'stone', walkable: true },
    { kind: 'torus', pos: [2.9, YG + 0.01, 0.4], rot: [90, 0, 0], size: [2.01, 0.09], color: 'accent' },
    { kind: 'cone', pos: [2.9, YG - 1.9, 0.4], rot: [180, 0, 0], size: [1.7, 2.6], color: 'stoneDark' },
    { kind: 'obelisk', pos: [1.5, YG, 1.6], size: 1.0 },
    { kind: 'obelisk', pos: [4.3, YG, 1.6], size: 1.0 },
    { kind: 'flag', pos: [4.35, YG, -0.4], size: 1.4, color: 'accent' },
    { kind: 'flag', pos: [1.45, YG, -0.4], size: 1.4, color: 'accent' },
  ],
)

const level: LevelDef = makeLevel({
  id: 8,
  name: '梦境终点',
  subtitle: '所有灯火汇成一扇门',
  hint: '唤醒沉桥 · 对齐长桥 · 站上升台 —— 两块压力板共同开启终点之门',
  paletteKey: 'finale',
  camera: { target: [-1.2, 1.4, 0], viewSize: 14.5, azimuth: 14, elevation: 27 },
  spawn: 'spawnIsle:g0',
  goal: 'gatePlatform:gp1',
  door: { pos: [2.9, YG, 2.45], rotY: 180, scale: 1.2 },
  doorRequiresPlates: true,
  groups: [spawnIsle, dreamBridge, midIsle, grandBridge, northIsle, dreamLift, gatePlatform],
  plates: [
    plate('plateStart', 'spawnIsle:g1', [-6.4, 0, 0], 'dreamBridge', 1),
    plate('plateNorth', 'northIsle:np1', [2.9, 0, 0], 'dreamLift', 1),
  ],
  decor: [
    decor('island', [-10, 2.5, -8], { scale: 1.3 }),
    decor('island', [9, 4, -9], { scale: 1.2 }),
    decor('island', [3, -3, -12], { scale: 1.1 }),
    decor('islandBig', [-4, -5, -16], { scale: 1.4 }),
    decor('hangingIsland', [-6, 8.5, -10], { scale: 1.3 }),
    decor('hangingIsland', [7, 9.5, -9], { scale: 1.0 }),
    decor('obelisk', [-9, 1.5, 3.5], { scale: 1.2 }),
    decor('ruinPillar', [7.8, 0.5, -2.5], { scale: 1.1 }),
    decor('flower', [-6.9, 0, 1.0], { color: '#ffd97a' }),
    decor('flower', [-5.8, 0, -1.1], { color: '#ff8ab0' }),
    decor('bush', [-5.4, 0, 1.4], { scale: 0.8 }),
  ],
  water: { y: -1.35, radius: 46 },
  particles: 'stars',
})

export default level
