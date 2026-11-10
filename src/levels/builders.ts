/**
 * 关卡建造辅助工具 —— 让 8 个关卡的数据保持简洁、一致。
 * 关键约定：
 *  - 节点间距 ≥ 0.9，端口 (port) 节点必须能与其他组节点精确重合（误差 < 0.4）。
 *  - 楼梯用 stairNodes 生成坡道节点串，mesh 用 stairs 渲染台阶。
 */
import type { DecorDef, GroupDef, MeshDef, PlateDef, Vec3, WalkNodeDef, LevelDef, LevelPalette } from './types'

export function node(
  id: string,
  pos: Vec3,
  links: string[] = [],
  opts: { port?: boolean } = {},
): WalkNodeDef {
  return { id, pos, links, port: opts.port }
}

/** 沿一系列点生成顺序连接的节点串 */
export function chain(prefix: string, points: Vec3[], opts: { portAt?: number[] } = {}): WalkNodeDef[] {
  return points.map((p, i) =>
    node(
      `${prefix}${i}`,
      p,
      i > 0 ? [`${prefix}${i - 1}`] : [],
      { port: opts.portAt?.includes(i) ?? false },
    ),
  )
}

/** 环形路径节点（按 angles 顺序连接，closed 时首尾相连） */
export function ringNodes(
  prefix: string,
  center: [number, number],
  radius: number,
  anglesDeg: number[],
  y: number,
  closed = true,
): WalkNodeDef[] {
  const pts: Vec3[] = anglesDeg.map((a) => {
    const r = a * Math.PI / 180
    return [center[0] + Math.cos(r) * radius, y, center[1] + Math.sin(r) * radius] as Vec3
  })
  const nodes = chain(prefix, pts)
  if (closed && nodes.length > 2) {
    nodes[0].links.push(`${prefix}${nodes.length - 1}`)
    nodes[nodes.length - 1].links.push(`${prefix}0`)
  }
  return nodes
}

/** 楼梯节点串：从 from 到 to（含高差），自动中间踏步节点 */
export function stairNodes(
  prefix: string,
  from: Vec3,
  to: Vec3,
  steps = 6,
  opts: { portStart?: boolean; portEnd?: boolean } = {},
): WalkNodeDef[] {
  const pts: Vec3[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    pts.push([
      from[0] + (to[0] - from[0]) * t,
      from[1] + (to[1] - from[1]) * t,
      from[2] + (to[2] - from[2]) * t,
    ])
  }
  const nodes = chain(prefix, pts, { portAt: opts.portStart ? [0] : opts.portEnd ? [steps] : [] })
  return nodes
}

/* ---------------- 网格速写 ---------------- */

export function mesh(kind: MeshDef['kind'], pos: Vec3, size: number | Vec3, extra: Partial<MeshDef> = {}): MeshDef {
  return { kind, pos, size, ...extra }
}

export function stairsMesh(pos: Vec3, rotYDeg: number, width: number, totalHeight: number, totalRun: number, steps: number, extra: Partial<MeshDef> = {}): MeshDef {
  return {
    kind: 'stairs',
    pos,
    rot: [0, rotYDeg, 0],
    size: [width, totalHeight, totalRun],
    steps,
    walkable: true,
    ...extra,
  }
}

/** 平台圆盘（顶面可行走） */
export function disc(walkable = true, extra: Partial<MeshDef> = {}): Partial<MeshDef> {
  return { walkable, ...extra }
}

/* ---------------- 组速写 ---------------- */

export function staticGroup(id: string, nodes: WalkNodeDef[], meshes: MeshDef[], extra: Partial<GroupDef> = {}): GroupDef {
  return { id, kind: 'static', nodes, meshes, ...extra }
}

export function rotatorGroup(
  id: string,
  pos: Vec3,
  states: number[],
  nodes: WalkNodeDef[],
  meshes: MeshDef[],
  handlePos: Vec3,
  extra: Partial<GroupDef> = {},
): GroupDef {
  return {
    id, kind: 'rotator', axis: 'y', pos, states,
    initialState: extra.initialState ?? 0,
    nodes, meshes,
    handle: { pos: handlePos },
    duration: extra.duration ?? 1.1,
    ...extra,
  }
}

export function sliderGroup(
  id: string,
  axis: 'x' | 'y' | 'z',
  pos: Vec3,
  states: number[],
  nodes: WalkNodeDef[],
  meshes: MeshDef[],
  extra: Partial<GroupDef> = {},
): GroupDef {
  return {
    id, kind: 'slider', axis, pos, states,
    initialState: extra.initialState ?? 0,
    nodes, meshes, duration: extra.duration ?? 1.2,
    ...extra,
  }
}

export function lifterGroup(
  id: string,
  pos: Vec3,
  states: number[],
  nodes: WalkNodeDef[],
  meshes: MeshDef[],
  extra: Partial<GroupDef> = {},
): GroupDef {
  return {
    id, kind: 'lifter', axis: 'y', pos, states,
    initialState: extra.initialState ?? 0,
    nodes, meshes, duration: extra.duration ?? 1.4,
    ...extra,
  }
}

export function plate(id: string, node: string, pos: Vec3, target: string, targetState: number, rotY = 0): PlateDef {
  return { id, node, pos, target, targetState, rotY }
}

export function decor(kind: DecorDef['kind'], pos: Vec3, extra: Partial<DecorDef> = {}): DecorDef {
  return { kind, pos, ...extra }
}

/* ---------------- 常用调色板 ---------------- */

export const palettes: Record<string, LevelPalette> = {
  dawn: {
    skyTop: '#7fb2e5', skyHorizon: '#ffd9c0', skyBottom: '#ffeadd',
    sun: '#fff3d6', sunDir: [-40, 38, -55], fog: '#f5dcc8',
    ambient: '#cfe0f0', hemiSky: '#ffe4c8', hemiGround: '#8fb0a8',
    stone: '#f2e3c9', stoneDark: '#d9c09a', path: '#e0a878',
    accent: '#ff8a7a', accent2: '#58c9b9', water: '#7fd4d0', waterDeep: '#3e9fa6',
  },
  noon: {
    skyTop: '#6fc7e8', skyHorizon: '#d8f6ef', skyBottom: '#eefcf7',
    sun: '#fffbe8', sunDir: [-35, 55, -30], fog: '#cdeee6',
    ambient: '#d8eef0', hemiSky: '#e8fff5', hemiGround: '#7fb0a0',
    stone: '#f5f1e6', stoneDark: '#cdbfa4', path: '#e6b980',
    accent: '#f4b942', accent2: '#4fb3a5', water: '#8fe0d8', waterDeep: '#3aa8a0',
  },
  dusk: {
    skyTop: '#8a7bc8', skyHorizon: '#ffb8a0', skyBottom: '#ffd8c2',
    sun: '#ffdfae', sunDir: [50, 26, -35], fog: '#e8b8a8',
    ambient: '#c8b8d8', hemiSky: '#ffc8b0', hemiGround: '#8a7898',
    stone: '#f0dcca', stoneDark: '#c9a98e', path: '#d99a78',
    accent: '#ff8aa8', accent2: '#7a8ae0', water: '#9a9ae0', waterDeep: '#5a6ac0',
  },
  sky: {
    skyTop: '#5ea8ee', skyHorizon: '#bfe4ff', skyBottom: '#e4f4ff',
    sun: '#ffffff', sunDir: [-30, 60, -45], fog: '#c8e6f8',
    ambient: '#d0e4f5', hemiSky: '#e8f6ff', hemiGround: '#88a8c0',
    stone: '#f4f0ea', stoneDark: '#cfc6b8', path: '#e0c8a0',
    accent: '#ff9a76', accent2: '#48b8d8', water: '#90d8f0', waterDeep: '#4898c8',
  },
  mirror: {
    skyTop: '#5b6ee1', skyHorizon: '#9aa8f0', skyBottom: '#c8d0f8',
    sun: '#e8ecff', sunDir: [0, 45, -60], fog: '#a8b4e8',
    ambient: '#b8c0f0', hemiSky: '#c8d0ff', hemiGround: '#7078b0',
    stone: '#e8e8f4', stoneDark: '#b8b8d4', path: '#c0b8e8',
    accent: '#f0a8c8', accent2: '#68d8c8', water: '#8a9ae8', waterDeep: '#5060c0',
  },
  night: {
    skyTop: '#2a2d64', skyHorizon: '#5a5aa0', skyBottom: '#7a68b4',
    sun: '#d8dcff', sunDir: [30, 50, -50], fog: '#42427a',
    ambient: '#7878c0', hemiSky: '#8080cc', hemiGround: '#343460',
    stone: '#c8c4e4', stoneDark: '#9894c0', path: '#b8aac8',
    accent: '#ffd97a', accent2: '#7ae0d0', water: '#5068b8', waterDeep: '#283878',
  },
  garden: {
    skyTop: '#7ac8b8', skyHorizon: '#d8f0c8', skyBottom: '#eefae0',
    sun: '#fff8e0', sunDir: [-45, 42, -40], fog: '#cfe8c0',
    ambient: '#d0ecd8', hemiSky: '#e8f8d8', hemiGround: '#88b088',
    stone: '#f0ead8', stoneDark: '#c8bc9c', path: '#d8c088',
    accent: '#ff8a8a', accent2: '#58b888', water: '#88d8c0', waterDeep: '#40a088',
  },
  finale: {
    skyTop: '#2a2860', skyHorizon: '#7a5aa8', skyBottom: '#c88ab0',
    sun: '#ffe8c8', sunDir: [-20, 45, -55], fog: '#6a5888',
    ambient: '#8878b8', hemiSky: '#a888c0', hemiGround: '#403868',
    stone: '#e0d0e8', stoneDark: '#b0a0c8', path: '#d0b8d0',
    accent: '#ffd97a', accent2: '#ff8ab0', water: '#9078c8', waterDeep: '#504088',
  },
}

/* ---------------- 组装 ---------------- */

export function makeLevel(def: Omit<LevelDef, 'palette'> & { paletteKey: string }): LevelDef {
  const { paletteKey, ...rest } = def
  return { ...rest, palette: palettes[paletteKey] ?? palettes.dawn }
}
