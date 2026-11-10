/**
 * 第六关：倒转世界
 * 夜之领域：大地在上，星辰在下。
 * 十字旋转桥（四臂，可乘坐旋转）连通东西浮台；
 * 升降台升至高空，沿天桥走上倒挂的浮空巨岛，抵达悬于倒影中的门。
 */
import { makeLevel, node, stairNodes, staticGroup, rotatorGroup, lifterGroup, stairsMesh, decor } from './builders'
import type { LevelDef } from './types'

const Y = 1.6
const YUP = 3.4
const YSKY = 6.0

// 西侧出生台
const west = staticGroup('west',
  [
    node('s0', [-4.9, Y, 0], ['s1']),
    node('s1', [-3.9, Y, 0], ['s0', 's2']),
    node('s2', [-2.8, Y, 0], ['s1'], { port: true }),
  ],
  [
    { kind: 'cyl', pos: [-4.6, Y - 0.28, 0], size: [2.0, 2.2, 0.56], color: 'stone', walkable: true },
    { kind: 'torus', pos: [-4.6, Y + 0.01, 0], rot: [90, 0, 0], size: [1.96, 0.08], color: 'accent2' },
    { kind: 'cone', pos: [-4.6, Y - 2.2, 0], rot: [0, 0, 0], size: [1.5, 3.2], color: 'stoneDark' },
    { kind: 'arch', pos: [-5.7, Y, 0], rot: [0, 90, 0], size: [1.5, 2.1, 0.36], color: 'stone' },
    { kind: 'disc', pos: [-5.7, Y + 2.24, 0], size: [0.5, 0.5, 0.12], color: 'accent', glow: true },
    { kind: 'lamp', pos: [-4.2, Y, 1.5], size: 0.8, color: 'accent' },
  ],
)

// 十字旋转桥（立方体核心 + 四臂）—— 节点为局部坐标（组 pos 已含 Y）
const cross = rotatorGroup('cross',
  [0, Y, 0],
  [90, 0],
  [
    node('c0', [-2.8, 0, 0], ['c1'], { port: true }),
    node('c1', [-1.4, 0, 0], ['c0', 'c2']),
    node('c2', [0, 0, 0], ['c1', 'c3']),
    node('c3', [1.4, 0, 0], ['c2', 'c4']),
    node('c4', [2.8, 0, 0], ['c3'], { port: true }),
  ],
  [
    { kind: 'box', pos: [0, 0.1, 0], size: [1.7, 1.7, 1.7], color: 'stone' },
    { kind: 'torus', pos: [0, 0, 0], rot: [90, 0, 0], size: [1.28, 0.1], color: 'accent' },
    // 四臂甲板（东臂西臂可行走，南北臂为装饰短臂）
    { kind: 'box', pos: [-2.05, -0.12, 0], size: [1.5, 0.26, 1.25], color: 'path', walkable: true },
    { kind: 'box', pos: [2.05, -0.12, 0], size: [1.5, 0.26, 1.25], color: 'path', walkable: true },
    { kind: 'box', pos: [0, -0.12, 2.05], size: [1.25, 0.26, 1.5], color: 'path' },
    { kind: 'box', pos: [0, -0.12, -2.05], size: [1.25, 0.26, 1.5], color: 'path' },
    { kind: 'crystal', pos: [0, 1.15, 0], size: 0.3, color: 'accent', glow: true },
  ],
  [0, 1.35, 0],
  { duration: 1.4 },
)

// 东侧浮台 + 上行台阶
const east = staticGroup('east',
  [
    node('e0', [2.8, Y, 0], ['e1'], { port: true }),
    node('e1', [3.8, Y, 0], ['e0', 'u0']),
    ...stairNodes('u', [3.8, Y, 0], [4.7, YUP, 0], 6),
  ],
  [
    { kind: 'cyl', pos: [4.4, Y - 0.28, 0], size: [1.9, 2.1, 0.56], color: 'stone', walkable: true },
    { kind: 'torus', pos: [4.4, Y + 0.01, 0], rot: [90, 0, 0], size: [1.86, 0.08], color: 'accent2' },
    { kind: 'cone', pos: [4.4, Y - 2.1, 0], rot: [0, 0, 0], size: [1.4, 3.0], color: 'stoneDark' },
    stairsMesh([3.8, Y, 0], 90, 1.3, YUP - Y, 0.95, 6, { color: 'stone' }),
  ],
)

// 高处小台
const high = staticGroup('high',
  [node('h0', [4.7, YUP, 0], [], { port: true })],
  [
    { kind: 'cyl', pos: [4.9, YUP - 0.26, 0], size: [1.15, 1.3, 0.52], color: 'stone', walkable: true },
    { kind: 'cone', pos: [4.9, YUP - 1.5, 0], rot: [0, 0, 0], size: [0.9, 2.2], color: 'stoneDark' },
  ],
)

// 夜行升降台
const nightLift = lifterGroup('nightLift',
  [4.7, YUP, 0],
  [0, YSKY - YUP],
  [node('l0', [0, 0, 0], [], { port: true })],
  [
    { kind: 'cyl', pos: [0, -0.12, 0], size: [0.95, 1.05, 0.24], color: 'path', walkable: true },
    { kind: 'torus', pos: [0, 0.02, 0], rot: [90, 0, 0], size: [0.92, 0.06], color: 'accent' },
    { kind: 'cyl', pos: [0, -0.45, 0], size: [0.55, 0.7, 0.5], color: 'stoneDark' },
  ],
  { duration: 1.7 },
)
nightLift.handle = { pos: [0, 0.55, 0] }

// 天桥：升降台顶 → 倒挂岛
const skyBridge = staticGroup('skyBridge',
  [
    node('v0', [4.7, YSKY, 0], ['v1'], { port: true }),
    node('v1', [3.4, YSKY, -1.4], ['v0', 'v2']),
    node('v2', [2.1, YSKY, -2.7], ['v1'], { port: true }),
  ],
  [
    { kind: 'cyl', pos: [3.4, YSKY - 0.75, -0.7], rot: [0.5, 0, -0.4], size: [0.12, 0.12, 3.6], color: 'stoneDark', noShadow: true },
  ],
)

// 倒挂巨岛（顶部朝下，岩体向上）
const hangingIsle = staticGroup('hangingIsle',
  [
    node('g0', [2.1, YSKY, -2.7], ['g1'], { port: true }),
    node('g1', [0.9, YSKY, -3.1], ['g0', 'g2']),
    node('g2', [0.0, YSKY, -3.3], ['g1']),
  ],
  [
    { kind: 'cyl', pos: [0.6, YSKY - 0.26, -3.1], size: [2.3, 2.5, 0.5], color: 'stone', walkable: true },
    { kind: 'torus', pos: [0.6, YSKY - 0.02, -3.1], rot: [90, 0, 0], size: [2.26, 0.08], color: 'accent' },
    // 向上收束的倒挂岩体
    { kind: 'cone', pos: [0.6, YSKY + 2.0, -3.1], rot: [0, 0, 0], size: [1.9, 3.6], color: 'stoneDark' },
    { kind: 'spire', pos: [0.6, YSKY + 4.4, -3.1], size: [0.5, 2.2], color: 'stoneDark' },
    { kind: 'cyl', pos: [0.6, YSKY - 0.9, -3.1], size: [0.7, 0.55, 1.0], color: 'stoneDark' },
    { kind: 'crystal', pos: [1.6, YSKY + 0.5, -3.9], size: 0.24, color: 'accent2', glow: true },
    { kind: 'lamp', pos: [-0.7, YSKY, -4.0], size: 0.75, color: 'accent' },
  ],
)

const level: LevelDef = makeLevel({
  id: 6,
  name: '倒转世界',
  subtitle: '上与下互换的领域',
  hint: '旋转十字桥连通两岸 · 站上升降台点把手，天桥尽头是倒悬之岛',
  paletteKey: 'night',
  camera: { target: [0.4, 3.2, -0.6], viewSize: 15, azimuth: 16, elevation: 22 },
  spawn: 'west:s0',
  goal: 'hangingIsle:g2',
  door: { pos: [-0.85, YSKY, -3.5], rotY: 115, scale: 0.95 },
  groups: [west, cross, east, high, nightLift, skyBridge, hangingIsle],
  plates: [],
  decor: [
    decor('hangingIsland', [-8, 7.5, -8], { scale: 1.6 }),
    decor('hangingIsland', [6, 9, -9], { scale: 1.2 }),
    decor('hangingIsland', [-2, 10.5, -11], { scale: 1.0 }),
    decor('island', [-8, -2, -6], { scale: 1.3 }),
    decor('island', [8, -3, -9], { scale: 1.1 }),
    decor('islandBig', [0, -5, -14], { scale: 1.4 }),
    decor('obelisk', [-8.5, -1.2, -3], { scale: 1.2 }),
    decor('ruinPillar', [7.5, -2.2, -2], { scale: 1 }),
    decor('lanternPost', [4.0, Y, 1.6], { scale: 0.85 }),
    decor('flower', [-4.9, Y, -1.2], { color: '#ffd97a' }),
  ],
  water: { y: -1.5, radius: 44 },
  particles: 'stars',
})

export default level
