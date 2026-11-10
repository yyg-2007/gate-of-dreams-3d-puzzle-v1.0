/**
 * 第五关：镜像空间
 * 左右双塔完全镜像。中央双头转桥连通两岸；
 * 左塔顶端的压力板为右塔顶端的终点门充能（门锁定，需触发全部压力板）。
 */
import { makeLevel, node, stairNodes, staticGroup, rotatorGroup, stairsMesh, decor, plate } from './builders'
import type { LevelDef } from './types'

// 中央立柱
const column = staticGroup('column',
  [
    node('cW', [-0.8, 0, 0], ['cE'], { port: true }),
    node('cE', [0.8, 0, 0], ['cW'], { port: true }),
  ],
  [
    { kind: 'cyl', pos: [0, -0.36, 0], size: [1.5, 1.75, 0.64], color: 'stone', walkable: true },
    { kind: 'torus', pos: [0, 0.01, 0], rot: [90, 0, 0], size: [1.46, 0.09], color: 'accent2' },
    { kind: 'cone', pos: [0, -1.75, 0], rot: [180, 0, 0], size: [1.3, 2.3], color: 'stoneDark' },
    { kind: 'crystal', pos: [0, 0.9, 0], size: 0.22, color: 'accent2', glow: true },
    { kind: 'cyl', pos: [0, 0.55, 0], size: [0.06, 0.06, 0.8], color: 'stoneDark', noShadow: true },
  ],
)

// 中央双头转桥
const mirrorBridge = rotatorGroup('mirrorBridge',
  [0, 0, 0],
  [90, 0],
  [
    node('mb0', [-3.2, 0, 0], ['mb1'], { port: true }),
    node('mb1', [-0.8, 0, 0], ['mb0', 'mb2'], { port: true }),
    node('mb2', [0.8, 0, 0], ['mb1', 'mb3'], { port: true }),
    node('mb3', [3.2, 0, 0], ['mb2'], { port: true }),
  ],
  [
    { kind: 'box', pos: [0, -0.12, 0], size: [7.0, 0.3, 1.25], color: 'path', walkable: true },
    { kind: 'box', pos: [0, 0.22, 0.59], size: [6.6, 0.09, 0.08], color: 'stone' },
    { kind: 'box', pos: [0, 0.22, -0.59], size: [6.6, 0.09, 0.08], color: 'stone' },
    { kind: 'cyl', pos: [0, -0.5, 0], size: [0.55, 0.75, 0.8], color: 'stoneDark' },
    { kind: 'disc', pos: [-3.2, -0.02, 0], size: [0.32, 0.32, 0.08], color: 'accent2', glow: true },
    { kind: 'disc', pos: [3.2, -0.02, 0], size: [0.32, 0.32, 0.08], color: 'accent2', glow: true },
  ],
  [0, 0.72, 0],
  { duration: 1.2 },
)

// 左塔（压力板侧）
const leftTower = staticGroup('leftTower',
  [
    node('lt0', [-3.2, 0, 0], ['lt1'], { port: true }),
    node('lt1', [-4.2, 0, 0], ['lt0', 'lu0']),
    ...stairNodes('lu', [-4.2, 0, 0], [-5.0, 1.7, 0], 6),
  ],
  [
    { kind: 'cyl', pos: [-4.4, -0.28, 0], size: [1.9, 2.1, 0.56], color: 'stone', walkable: true },
    { kind: 'torus', pos: [-4.4, 0.01, 0], rot: [90, 0, 0], size: [1.86, 0.08], color: 'accent2' },
    { kind: 'cone', pos: [-4.4, -1.5, 0], rot: [180, 0, 0], size: [1.6, 1.9], color: 'stoneDark' },
    stairsMesh([-4.2, 0, 0], 90, 1.3, 1.7, 1.0, 6, { color: 'stone' }),
  ],
)

const leftTop = staticGroup('leftTop',
  [
    node('lw0', [-5.0, 1.7, 0], ['lw1']),
    node('lw1', [-5.8, 1.7, 0], ['lw0']),
  ],
  [
    { kind: 'cyl', pos: [-5.6, 1.44, 0], size: [1.25, 1.4, 0.52], color: 'stone', walkable: true },
    { kind: 'torus', pos: [-5.6, 1.71, 0], rot: [90, 0, 0], size: [1.21, 0.06], color: 'accent' },
    { kind: 'cone', pos: [-5.6, 0.5, 0], rot: [180, 0, 0], size: [1.0, 1.4], color: 'stoneDark' },
    { kind: 'lamp', pos: [-5.2, 1.7, 1.0], size: 0.7, color: 'accent' },
  ],
)

// 右塔（终点侧，与左塔镜像）
const rightTower = staticGroup('rightTower',
  [
    node('rt0', [3.2, 0, 0], ['rt1'], { port: true }),
    node('rt1', [4.2, 0, 0], ['rt0', 'ru0']),
    ...stairNodes('ru', [4.2, 0, 0], [5.0, 1.7, 0], 6),
  ],
  [
    { kind: 'cyl', pos: [4.4, -0.28, 0], size: [1.9, 2.1, 0.56], color: 'stone', walkable: true },
    { kind: 'torus', pos: [4.4, 0.01, 0], rot: [90, 0, 0], size: [1.86, 0.08], color: 'accent2' },
    { kind: 'cone', pos: [4.4, -1.5, 0], rot: [180, 0, 0], size: [1.6, 1.9], color: 'stoneDark' },
    stairsMesh([4.2, 0, 0], 90, 1.3, 1.7, 1.0, 6, { color: 'stone' }),
  ],
)

const rightTop = staticGroup('rightTop',
  [
    node('rw0', [5.0, 1.7, 0], ['rw1']),
    node('rw1', [5.8, 1.7, 0], ['rw0']),
  ],
  [
    { kind: 'cyl', pos: [5.6, 1.44, 0], size: [1.25, 1.4, 0.52], color: 'stone', walkable: true },
    { kind: 'torus', pos: [5.6, 1.71, 0], rot: [90, 0, 0], size: [1.21, 0.06], color: 'accent' },
    { kind: 'cone', pos: [5.6, 0.5, 0], rot: [180, 0, 0], size: [1.0, 1.4], color: 'stoneDark' },
    { kind: 'lamp', pos: [5.2, 1.7, -1.0], size: 0.7, color: 'accent' },
  ],
)

const level: LevelDef = makeLevel({
  id: 5,
  name: '镜像空间',
  subtitle: '两个世界，一次回声',
  hint: '旋转双头桥连通两岸 · 左塔顶端的压力板为终点之门充能',
  paletteKey: 'mirror',
  camera: { target: [0, 1.0, 0], viewSize: 13, azimuth: 88, elevation: 30 },
  spawn: 'column:cW',
  goal: 'rightTop:rw1',
  door: { pos: [6.55, 1.7, 0], rotY: 90, scale: 0.92 },
  doorRequiresPlates: true,
  groups: [column, mirrorBridge, leftTower, leftTop, rightTower, rightTop],
  plates: [
    plate('mirrorPlate', 'leftTop:lw1', [-5.8, 1.7, 0], 'mirrorBridge', 0),
  ],
  decor: [
    decor('island', [-9, 2, -8], { scale: 1.2 }),
    decor('island', [9, 2, -8], { scale: 1.2 }),
    decor('island', [0, -3, -11], { scale: 1.0 }),
    decor('hangingIsland', [-6, 8, -10], { scale: 0.9 }),
    decor('hangingIsland', [6, 8, -10], { scale: 0.9 }),
    decor('flower', [-4.9, 0, 1.0], { color: '#f0a8c8' }),
    decor('flower', [4.9, 0, -1.0], { color: '#68d8c8' }),
    decor('bush', [-4.0, 0, -1.4], { scale: 0.7 }),
    decor('bush', [4.0, 0, 1.4], { scale: 0.7 }),
    decor('obelisk', [-8, 1.2, 3.5], { scale: 0.9 }),
    decor('obelisk', [8, 1.2, 3.5], { scale: 0.9 }),
  ],
  water: { y: -1.35, radius: 46 },
  particles: 'stars',
})

export default level
