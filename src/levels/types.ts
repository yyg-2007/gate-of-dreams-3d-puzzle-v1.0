/**
 * 关卡数据结构 —— 游戏的核心抽象。
 *
 * 设计原则（空间错觉系统的根基）：
 *  1. 每个建筑组 (GroupDef) 拥有「视觉网格 (meshes)」与「行走节点 (nodes)」两套数据。
 *  2. 行走节点之间的连接分两类：
 *     - 组内显式连接 (node.links)：楼梯、平台内部道路，永远成立；
 *     - 组间世界坐标重合连接：两个不同组的节点在世界空间中几乎重合时自动连通。
 *       旋转 / 平移机关改变节点世界坐标，连接因此真实地建立或断开 ——
 *       「看起来接上了」与「实际上能走」由同一套几何规则保证。
 *  3. 相机固定，谜题全部由机关状态与结构对齐驱动，不靠视角造假。
 */

export type Vec3 = [number, number, number]

/** 一个可行走节点（局部于所属组） */
export interface WalkNodeDef {
  id: string
  pos: Vec3
  /** 组内显式连接的节点 id */
  links: string[]
  /** 端口节点：渲染发光提示环，提示玩家此处可与机关对齐 */
  port?: boolean
}

export type MeshKind =
  | 'box' | 'cyl' | 'cone' | 'sphere' | 'torus' | 'disc' | 'dome'
  | 'arch' | 'stairs' | 'spire' | 'crystal' | 'ring' | 'lamp' | 'flag' | 'petalBasin' | 'obelisk'

export interface MeshDef {
  kind: MeshKind
  pos?: Vec3
  /** 欧拉角（度） */
  rot?: Vec3
  /** box: [sx,sy,sz]; cyl/disc: [rTop,rBottom,h]; cone/spire: [r,h]; sphere: r; torus/ring: [r,tube] */
  size?: number | number[]
  /** 调色板键或十六进制色 */
  color?: string
  opacity?: number
  glow?: boolean
  /** stairs 专用：踏步数 */
  steps?: number
  /** 是否可作为点击行走目标表面 */
  walkable?: boolean
  noShadow?: boolean
}

export type GroupKind = 'static' | 'rotator' | 'slider' | 'lifter'

export interface GroupDef {
  id: string
  /** 父组 id：父组的变换（含旋转）会传递给本组 */
  parent?: string
  /** 相对父组的平移 */
  pos?: Vec3
  kind: GroupKind
  /** 机关运动轴（rotator 的旋转轴 / slider·lifter 的平移轴） */
  axis?: 'x' | 'y' | 'z'
  /** 每个状态对应的值：rotator 为角度(度)，slider/lifter 为沿轴位移 */
  states?: number[]
  /** 初始状态下标 */
  initialState?: number
  /** 机关动画时长（秒） */
  duration?: number
  /** 可点击机关把手 */
  handle?: { pos: Vec3 }
  /** 禁用组内自动道路板（组已自带甲板网格时使用） */
  noAutoPlank?: boolean
  nodes: WalkNodeDef[]
  meshes: MeshDef[]
}

/** 压力板：角色站上后永久触发目标机关到目标状态（闩锁式） */
export interface PlateDef {
  id: string
  /** 板所在节点 "groupId:nodeId" */
  node: string
  /** 板的世界坐标（用于渲染） */
  pos: Vec3
  rotY?: number
  /** 触发的目标机关组 */
  target: string
  /** 触发后目标机关进入的状态下标 */
  targetState: number
}

export type DecorKind =
  | 'island' | 'islandBig' | 'tree' | 'pine' | 'flower' | 'bush' | 'rock'
  | 'lanternPost' | 'statue' | 'ruinPillar' | 'grassTuft' | 'hangingIsland' | 'obelisk'

export interface DecorDef {
  kind: DecorKind
  pos: Vec3
  scale?: number
  rotY?: number
  color?: string
}

export interface LevelPalette {
  skyTop: string
  skyHorizon: string
  skyBottom: string
  sun: string
  sunDir: Vec3
  fog: string
  ambient: string
  hemiSky: string
  hemiGround: string
  stone: string
  stoneDark: string
  path: string
  accent: string
  accent2: string
  water: string
  waterDeep: string
}

export interface LevelDef {
  id: number
  name: string
  subtitle: string
  /** 进入关卡后展示的机关/操作提示 */
  hint: string
  palette: LevelPalette
  camera: {
    target: Vec3
    /** 正交视野竖直方向覆盖的世界单位 */
    viewSize: number
    /** 方位角（度，绕 Y）与仰角（度） */
    azimuth: number
    elevation: number
  }
  spawn: string
  goal: string
  /** 终点之门（世界坐标） */
  door: { pos: Vec3; rotY?: number; scale?: number; color?: string }
  /** 门是否需要全部压力板触发后才能开启 */
  doorRequiresPlates?: boolean
  groups: GroupDef[]
  plates?: PlateDef[]
  decor: DecorDef[]
  water?: { y: number; radius: number; pos?: Vec3 }
  /** 关卡主题粒子：花瓣 / 星星 / 萤火 */
  particles?: 'petals' | 'stars' | 'fireflies' | 'snow'
}
