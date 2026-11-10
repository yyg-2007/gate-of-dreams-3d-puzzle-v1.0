/**
 * 第四关：天空之塔
 * 垂直爬塔：把手升降台送上中层；中层压力板唤起第二台升降台直抵塔顶。
 */
import { makeLevel, node, staticGroup, lifterGroup, decor, plate } from './builders'
import type { LevelDef } from './types'

const YMID = 3.2
const YTOP = 6.4

// 底座浮岛
const base = staticGroup('base',
  [
    node('n0', [0, 0, 2.4], ['n1'], { port: true }),
    node('n1', [0, 0, 1.2], ['n0', 'n2']),
    node('n2', [0, 0, 0], ['n1']),
  ],
  [
    { kind: 'cyl', pos: [0, -0.3, 0], size: [2.7, 3.0, 0.6], color: 'stone', walkable: true },
    { kind: 'torus', pos: [0, 0.01, 0], rot: [90, 0, 0], size: [2.66, 0.09], color: 'accent2' },
    { kind: 'cone', pos: [0, -1.7, 0], rot: [180, 0, 0], size: [2.3, 2.4], color: 'stoneDark' },
    { kind: 'cyl', pos: [0, -3.1, 0], size: [0.6, 0.45, 1.2], color: 'stoneDark' },
    { kind: 'lamp', pos: [-1.7, 0, 1.7], size: 0.9, color: 'accent' },
  ],
)

// 一号升降台（把手控制）
const lift1 = lifterGroup('lift1',
  [0, 0, 2.4],
  [0, YMID],
  [node('l0', [0, 0, 0], [], { port: true })],
  [
    { kind: 'cyl', pos: [0, -0.12, 0], size: [0.95, 1.05, 0.24], color: 'path', walkable: true },
    { kind: 'torus', pos: [0, 0.02, 0], rot: [90, 0, 0], size: [0.92, 0.06], color: 'accent' },
    { kind: 'cyl', pos: [0, -0.45, 0], size: [0.55, 0.7, 0.5], color: 'stoneDark' },
  ],
  { duration: 1.6 },
)
// 把手立在台面上
lift1.handle = { pos: [0, 0.55, 0] }

// 塔
const tower = staticGroup('tower', [], [
  { kind: 'cyl', pos: [0, 2.9, 0], size: [1.3, 1.5, 5.8], color: 'stone' },
  { kind: 'torus', pos: [0, 1.7, 0], rot: [90, 0, 0], size: [1.36, 0.08], color: 'accent2' },
  { kind: 'torus', pos: [0, 4.4, 0], rot: [90, 0, 0], size: [1.36, 0.08], color: 'accent2' },
])

// 中层平台（路径沿东侧绕行，全程可见）
const mid = staticGroup('mid',
  [
    node('p0', [0, YMID, 2.4], ['p1'], { port: true }),
    node('p1', [1.5, YMID, 1.4], ['p0', 'p2']),
    node('p2', [2.1, YMID, -0.6], ['p1', 'p3']),
    node('p3', [1.8, YMID, -2.0], ['p2'], { port: true }),
  ],
  [
    { kind: 'cyl', pos: [0, YMID - 0.28, 0], size: [2.55, 2.55, 0.4], color: 'stone', walkable: true },
    { kind: 'torus', pos: [0, YMID - 0.07, 0], rot: [90, 0, 0], size: [2.51, 0.07], color: 'accent' },
  ],
)

// 二号升降台（压力板控制）
const lift2 = lifterGroup('lift2',
  [1.8, YMID, -2.0],
  [0, YTOP - YMID],
  [node('l0', [0, 0, 0], [], { port: true })],
  [
    { kind: 'cyl', pos: [0, -0.12, 0], size: [0.95, 1.05, 0.24], color: 'path', walkable: true },
    { kind: 'torus', pos: [0, 0.02, 0], rot: [90, 0, 0], size: [0.92, 0.06], color: 'accent' },
    { kind: 'cyl', pos: [0, -0.45, 0], size: [0.55, 0.7, 0.5], color: 'stoneDark' },
  ],
  { duration: 1.6 },
)

// 塔顶
const top = staticGroup('top',
  [
    node('q0', [1.8, YTOP, -2.0], ['q1'], { port: true }),
    node('q1', [0.9, YTOP, -0.8], ['q0', 'q2']),
    node('q2', [0, YTOP, 0], ['q1']),
  ],
  [
    { kind: 'cyl', pos: [0, YTOP - 0.26, 0], size: [2.75, 2.9, 0.52], color: 'stone', walkable: true },
    { kind: 'torus', pos: [0, YTOP - 0.01, 0], rot: [90, 0, 0], size: [2.71, 0.08], color: 'accent' },
    { kind: 'dome', pos: [0, YTOP - 0.52, 0], size: 1.6, color: 'stoneDark' },
    { kind: 'flag', pos: [0, YTOP + 1.3, 0], size: 1.6, color: 'accent' },
    { kind: 'lamp', pos: [-1.6, YTOP, -1.4], size: 0.8, color: 'accent' },
    { kind: 'lamp', pos: [1.7, YTOP, 0.9], size: 0.8, color: 'accent' },
  ],
)

const level: LevelDef = makeLevel({
  id: 4,
  name: '天空之塔',
  subtitle: '乘云而上',
  hint: '先站上升降台再点击把手 · 中层的压力板会唤醒更高的升降台',
  paletteKey: 'sky',
  camera: { target: [0.4, 3.2, 0], viewSize: 14.5, azimuth: 24, elevation: 26 },
  spawn: 'base:n2',
  goal: 'top:q2',
  door: { pos: [0, YTOP, 0.95], rotY: 180, scale: 0.95 },
  groups: [base, lift1, tower, mid, lift2, top],
  plates: [
    // 压力板位于二号升降台停靠点：角色站上台时触发，连人带台一起升起
    plate('plateMid', 'mid:p3', [1.8, YMID, -2.0], 'lift2', 1),
  ],
  decor: [
    decor('island', [-8, 0.5, -8], { scale: 1.3 }),
    decor('island', [9, 1.5, -7], { scale: 1.1 }),
    decor('island', [5, -3.5, -10], { scale: 1.4 }),
    decor('island', [-4, -4.5, -11], { scale: 1.2 }),
    decor('islandBig', [0, -6, -16], { scale: 1.5 }),
    decor('hangingIsland', [-6, 9, -9], { scale: 1.2 }),
    decor('hangingIsland', [7, 10.5, -8], { scale: 0.9 }),
    decor('tree', [8.7, 2.0, -6.4], { scale: 0.85, color: '#4fb8c8' }),
    decor('ruinPillar', [-7.6, 0.8, 3.8], { scale: 1 }),
    decor('obelisk', [6.8, 1.2, 4.2], { scale: 1 }),
    decor('flower', [-1.5, 0, 0.9], { color: '#ff9a76' }),
  ],
  water: { y: -1.4, radius: 46 },
  particles: 'fireflies',
})

export default level
