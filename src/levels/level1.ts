/**
 * 第一关：梦境入口
 * 教学：点击移动 + 旋转月牙桥连通两岸。
 * 谜题：月牙桥初始指向侧方（断开），点击中央旋钮转回水平位，
 *       桥两端节点与两岸端口在世界坐标中重合，道路真正连通。
 */
import { makeLevel, node, stairNodes, staticGroup, rotatorGroup, stairsMesh, decor, plate as _plate } from './builders'
import type { LevelDef } from './types'

void _plate

const startGroup = staticGroup('start',
  [
    node('s0', [-6.9, 0, 0], ['s1']),
    node('s1', [-5.5, 0, 0], ['s0', 's2']),
    node('s2', [-4.1, 0, 0], ['s1'], { port: true }),
  ],
  [
    // 平台主体
    { kind: 'cyl', pos: [-5.8, -0.26, 0], size: [1.95, 2.15, 0.52], color: 'stone', walkable: true },
    // 装饰沿边
    { kind: 'torus', pos: [-5.8, 0.01, 0], rot: [90, 0, 0], size: [1.92, 0.07], color: 'accent2' },
    // 悬空底座
    { kind: 'cone', pos: [-5.8, -1.35, 0], rot: [180, 0, 0], size: [1.55, 1.7], color: 'stoneDark' },
    { kind: 'cyl', pos: [-5.8, -2.45, 0], size: [0.5, 0.32, 0.9], color: 'stoneDark' },
    // 入口拱门
    { kind: 'arch', pos: [-7.55, 0, 0], rot: [0, 90, 0], size: [1.7, 2.3, 0.4], color: 'stone' },
    { kind: 'disc', pos: [-7.55, 2.44, 0], size: [0.55, 0.55, 0.14], color: 'accent', glow: true },
    // 双灯柱
    { kind: 'lamp', pos: [-5.7, 0, 1.35], size: 0.9, color: 'accent' },
    { kind: 'lamp', pos: [-5.7, 0, -1.35], size: 0.9, color: 'accent' },
  ],
)

const bridgeGroup = rotatorGroup('moonBridge',
  [0, 0, 0],
  [90, 0],
  [
    node('b0', [-4, 0, 0], ['b1'], { port: true }),
    node('b1', [-1.35, 0, 0], ['b0', 'b2']),
    node('b2', [1.35, 0, 0], ['b1', 'b3']),
    node('b3', [4, 0, 0], ['b2'], { port: true }),
  ],
  [
    { kind: 'box', pos: [0, -0.12, 0], size: [8.6, 0.3, 1.4], color: 'path', walkable: true },
    // 栏杆
    { kind: 'box', pos: [0, 0.22, 0.66], size: [8.2, 0.1, 0.09], color: 'stone' },
    { kind: 'box', pos: [0, 0.22, -0.66], size: [8.2, 0.1, 0.09], color: 'stone' },
    // 中央基座
    { kind: 'cyl', pos: [0, -0.55, 0], size: [0.62, 0.85, 0.85], color: 'stoneDark' },
    { kind: 'torus', pos: [0, 0.02, 0], rot: [90, 0, 0], size: [0.95, 0.08], color: 'accent' },
    // 两端端口装饰
    { kind: 'disc', pos: [-4, -0.02, 0], size: [0.34, 0.34, 0.08], color: 'accent2', glow: true },
    { kind: 'disc', pos: [4, -0.02, 0], size: [0.34, 0.34, 0.08], color: 'accent2', glow: true },
  ],
  [0, 0.72, 0],
  { duration: 1.15 },
)

const goalIsle = staticGroup('goalIsle',
  [
    node('g0', [4.1, 0, 0], ['g1'], { port: true }),
    node('g1', [5.6, 0, 0], ['g0', 'u0']),
    ...stairNodes('u', [5.6, 0, 0], [7.05, 1.2, 0], 5, { portEnd: false }),
  ],
  [
    { kind: 'cyl', pos: [5.1, -0.26, 0], size: [1.95, 2.15, 0.52], color: 'stone', walkable: true },
    { kind: 'torus', pos: [5.1, 0.01, 0], rot: [90, 0, 0], size: [1.92, 0.07], color: 'accent2' },
    { kind: 'cone', pos: [5.1, -1.35, 0], rot: [180, 0, 0], size: [1.55, 1.7], color: 'stoneDark' },
    // 台阶（从平台边缘升上门廊台）
    stairsMesh([5.6, 0, 0], 90, 1.5, 1.2, 1.45, 5, { color: 'stone' }),
    { kind: 'box', pos: [6.35, 0.55, 0.5], size: [1.5, 0.09, 0.09], color: 'stone' },
    { kind: 'box', pos: [6.35, 0.55, -0.5], size: [1.5, 0.09, 0.09], color: 'stone' },
  ],
)

const terraceGroup = staticGroup('terrace',
  [
    node('t0', [7.1, 1.2, 0], ['t1']),
    node('t1', [7.95, 1.2, 0], ['t0']),
  ],
  [
    { kind: 'cyl', pos: [7.85, 0.94, 0], size: [1.35, 1.5, 0.52], color: 'stone', walkable: true },
    { kind: 'torus', pos: [7.85, 1.21, 0], rot: [90, 0, 0], size: [1.32, 0.06], color: 'accent' },
    { kind: 'cone', pos: [7.85, 0.05, 0], rot: [180, 0, 0], size: [1.1, 1.1], color: 'stoneDark' },
    // 门框柱
    { kind: 'lamp', pos: [7.5, 1.2, 1.1], size: 0.8, color: 'accent' },
    { kind: 'lamp', pos: [7.5, 1.2, -1.1], size: 0.8, color: 'accent' },
  ],
)

const level: LevelDef = makeLevel({
  id: 1,
  name: '梦境入口',
  subtitle: '月牙桥在沉睡，唤醒它',
  hint: '点击地面移动 · 点击桥梁中央的旋钮，转动月牙桥对齐两岸',
  paletteKey: 'dawn',
  camera: { target: [1.2, 0.6, 0], viewSize: 11, azimuth: 22, elevation: 32 },
  spawn: 'start:s0',
  goal: 'terrace:t1',
  door: { pos: [8.75, 1.2, 0], rotY: 90, scale: 1 },
  groups: [startGroup, bridgeGroup, goalIsle, terraceGroup],
  plates: [],
  decor: [
    decor('flower', [-5.1, 0, 0.75], { color: '#ff8a7a' }),
    decor('flower', [-6.4, 0, -0.7], { color: '#f4b942' }),
    decor('flower', [4.7, 0, 0.9], { color: '#ff8ab0' }),
    decor('bush', [4.4, 0, -1.0], { scale: 0.9 }),
    decor('grassTuft', [6.2, 0, 1.1], {}),
    decor('grassTuft', [5.4, 0, -1.2], {}),
    decor('tree', [8.6, 1.2, -0.95], { scale: 0.85, color: '#58c9b9' }),
    decor('island', [-9, 2.4, -9], { scale: 1.0 }),
    decor('island', [12, 4.2, -11], { scale: 1.3 }),
    decor('island', [-2, -2.8, -13], { scale: 0.9 }),
    decor('island', [16, 1.2, -7], { scale: 0.8 }),
    decor('islandBig', [0, -4, -18], { scale: 1.2 }),
    decor('ruinPillar', [-9.5, 0, -3.5], { scale: 1 }),
    decor('ruinPillar', [-10.3, -0.4, -2.6], { scale: 0.8 }),
  ],
  water: { y: -1.15, radius: 42 },
  particles: 'petals',
})

export default level
