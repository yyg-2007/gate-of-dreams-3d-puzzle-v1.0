/**
 * 主菜单背景 3D 场景：悬浮小岛 + 拱门 + 提灯少女（待机）。
 * doorRequiresPlates + 无压力板 ⇒ 门保持关闭，永不触发通关。
 */
import { makeLevel, node, staticGroup, decor } from './builders'
import type { LevelDef } from './types'

const level: LevelDef = makeLevel({
  id: 0,
  name: '梦境之屿',
  subtitle: '',
  hint: '',
  paletteKey: 'dusk',
  camera: { target: [-1.1, 1.15, 0], viewSize: 9.5, azimuth: 28, elevation: 24 },
  spawn: 'isle:c0',
  goal: 'isle:c0',
  door: { pos: [0, 0, 0], rotY: 0, scale: 0.01 },
  doorRequiresPlates: true,
  groups: [
    staticGroup('isle',
      [
        node('c0', [0, 0, 0], [], { port: true }),
        node('c1', [1.2, 0, 0.3], ['c0']),
      ],
      [
        { kind: 'cyl', pos: [0.4, -0.28, 0], size: [2.1, 2.4, 0.56], color: 'stone', walkable: true },
        { kind: 'torus', pos: [0.4, 0.01, 0], rot: [90, 0, 0], size: [2.06, 0.08], color: 'accent2' },
        { kind: 'cone', pos: [0.4, -1.6, 0], rot: [180, 0, 0], size: [1.7, 2.4], color: 'stoneDark' },
        { kind: 'cyl', pos: [0.4, -3.0, 0], size: [0.42, 0.3, 1.1], color: 'stoneDark' },
        { kind: 'arch', pos: [-1.15, 0, -0.35], rot: [0, 115, 0], size: [1.6, 2.4, 0.38], color: 'stone' },
        { kind: 'disc', pos: [-1.15, 2.52, -0.35], size: [0.5, 0.5, 0.12], color: 'accent', glow: true },
        { kind: 'lamp', pos: [1.75, 0, 0.75], size: 0.85, color: 'accent' },
      ],
    ),
  ],
  decor: [
    decor('tree', [1.35, 0, -0.75], { scale: 0.95, color: '#58c9b9' }),
    decor('flower', [-0.3, 0, 0.95], { color: '#ff8a7a' }),
    decor('flower', [0.9, 0, 1.1], { color: '#f4b942' }),
    decor('bush', [-0.9, 0, 0.9], { scale: 0.7 }),
    decor('grassTuft', [0.2, 0, 1.25], {}),
    decor('island', [-7, 2.6, -8], { scale: 1.2 }),
    decor('island', [8, 4.5, -9], { scale: 1.5 }),
    decor('island', [5, -3, -12], { scale: 0.9 }),
    decor('hangingIsland', [-5, 7, -9], { scale: 1.1 }),
    decor('hangingIsland', [7, 8.5, -11], { scale: 0.8 }),
    decor('islandBig', [0, -4.5, -18], { scale: 1.3 }),
  ],
  water: { y: -1.4, radius: 40 },
  particles: 'petals',
})

export default level
