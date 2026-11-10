/**
 * 建筑网格工厂：MeshDef → Object3D。
 * 几何体与材质全局缓存复用（同参数不重复创建），控制面数与内存。
 */
import * as THREE from 'three'
import type { LevelPalette, MeshDef, Vec3 } from '../levels/types'

const geometryCache = new Map<string, THREE.BufferGeometry>()
const materialCache = new Map<string, THREE.Material>()

export function colorOf(palette: LevelPalette, color?: string): string {
  if (!color) return palette.stone
  switch (color) {
    case 'stone': return palette.stone
    case 'stoneDark': return palette.stoneDark
    case 'path': return palette.path
    case 'accent': return palette.accent
    case 'accent2': return palette.accent2
    case 'water': return palette.water
    default: return color
  }
}

function getMaterial(palette: LevelPalette, def: MeshDef): THREE.Material {
  const color = colorOf(palette, def.color)
  const key = `${color}|${def.glow ? 1 : 0}|${def.opacity ?? 1}|${def.kind === 'stairs' || def.kind === 'spire' || def.kind === 'crystal' ? 'flat' : 'smooth'}`
  let m = materialCache.get(key)
  if (!m) {
    if (def.glow) {
      m = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color),
        emissiveIntensity: 1.5,
        roughness: 0.35,
        metalness: 0,
      })
    } else {
      m = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.85,
        metalness: 0.03,
        flatShading: key.endsWith('flat'),
      })
    }
    if ((def.opacity ?? 1) < 1) {
      ;(m as THREE.MeshStandardMaterial).transparent = true
      ;(m as THREE.MeshStandardMaterial).opacity = def.opacity ?? 1
    }
    materialCache.set(key, m)
  }
  return m
}

function getGeometry(def: MeshDef): THREE.BufferGeometry {
  const size = def.size ?? 1
  const s = typeof size === 'number' ? [size, size, size] : size
  const key = `${def.kind}|${s.join(',')}|${def.steps ?? 0}`
  let geo = geometryCache.get(key)
  if (geo) return geo

  switch (def.kind) {
    case 'box':
      geo = new THREE.BoxGeometry(s[0], s[1], s[2])
      break
    case 'cyl':
    case 'disc':
      geo = new THREE.CylinderGeometry(s[0], s[1], s[2], def.kind === 'disc' ? 36 : 24)
      break
    case 'cone':
      geo = new THREE.ConeGeometry(s[0], s[1], 26)
      break
    case 'sphere':
      geo = new THREE.SphereGeometry(s[0], 24, 18)
      break
    case 'dome':
      geo = new THREE.SphereGeometry(s[0], 24, 14, 0, Math.PI * 2, 0, Math.PI / 2)
      break
    case 'torus':
    case 'ring':
      geo = new THREE.TorusGeometry(s[0], s[1], 14, 44)
      break
    case 'spire':
      geo = new THREE.ConeGeometry(s[0], s[1], 6)
      break
    case 'crystal':
      geo = new THREE.OctahedronGeometry(s[0], 0)
      break
    case 'arch':
      geo = buildArch(s[0], s[1], s[2])
      break
    case 'stairs':
      geo = buildStairs(s[0], s[1], s[2], def.steps ?? 6)
      break
    default:
      geo = new THREE.BoxGeometry(1, 1, 1)
  }
  geometryCache.set(key, geo)
  return geo
}

/** 拱门：外形 w×h 矩形，挖去圆顶门洞（自动壁厚），沿 Z 挤出 depth */
function buildArch(w: number, h: number, depth: number): THREE.BufferGeometry {
  const t = Math.max(0.16, w * 0.17)
  const iw = w - 2 * t
  const innerTop = h - t
  const spring = innerTop - iw / 2
  const shape = new THREE.Shape()
  shape.moveTo(-w / 2, 0)
  shape.lineTo(-w / 2, h)
  shape.lineTo(w / 2, h)
  shape.lineTo(w / 2, 0)
  shape.lineTo(-w / 2, 0)
  const hole = new THREE.Path()
  hole.moveTo(-iw / 2, 0)
  hole.lineTo(-iw / 2, spring)
  hole.absarc(0, spring, iw / 2, Math.PI, 0, true)
  hole.lineTo(iw / 2, 0)
  hole.lineTo(-iw / 2, 0)
  shape.holes.push(hole)
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 })
  geo.translate(0, 0, -depth / 2)
  return geo
}

/** 台阶：自 pos 起沿 +Z 上升 totalH，纵深 totalR，steps 级（实心叠砌） */
function buildStairs(width: number, totalH: number, totalR: number, steps: number): THREE.BufferGeometry {
  const geos: THREE.BufferGeometry[] = []
  const d = totalR / steps
  const sh = totalH / steps
  for (let i = 0; i < steps; i++) {
    const g = new THREE.BoxGeometry(width, sh * (i + 1), d)
    g.translate(0, (sh * (i + 1)) / 2, (i + 0.5) * d)
    geos.push(g)
  }
  // 两侧扶手基座
  const side = new THREE.BoxGeometry(0.09, totalH * 0.55, totalR)
  side.translate(width / 2 + 0.045, totalH * 0.28, totalR / 2)
  geos.push(side.clone().translate(-width - 0.09, 0, 0))
  return mergeGeometries(geos)
}

/** 极简几何合并（避免引入 BufferGeometryUtils 的重量，手写足够） */
function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let vCount = 0
  let iCount = 0
  for (const g of geos) {
    vCount += g.attributes.position.count
    iCount += g.index ? g.index.count : g.attributes.position.count
  }
  const pos = new Float32Array(vCount * 3)
  const norm = new Float32Array(vCount * 3)
  const uv = new Float32Array(vCount * 2)
  const idx = new Uint32Array(iCount)
  let vOff = 0
  let iOff = 0
  for (const g of geos) {
    if (!g.index) continue
    const p = g.attributes.position as THREE.BufferAttribute
    const n = g.attributes.normal as THREE.BufferAttribute
    const u = g.attributes.uv as THREE.BufferAttribute
    pos.set(p.array as Float32Array, vOff * 3)
    norm.set(n.array as Float32Array, vOff * 3)
    uv.set(u.array as Float32Array, vOff * 2)
    const gi = g.index
    for (let i = 0; i < gi.count; i++) idx[iOff + i] = gi.getX(i) + vOff
    iOff += gi.count
    vOff += p.count
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  out.setAttribute('normal', new THREE.BufferAttribute(norm, 3))
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  out.setIndex(new THREE.BufferAttribute(idx, 1))
  return out
}

const euler = new THREE.Euler()

/** MeshDef → Object3D（含变换与标记） */
export function buildMesh(def: MeshDef, palette: LevelPalette): THREE.Object3D {
  if (def.kind === 'lamp') return buildLamp(def, palette)
  if (def.kind === 'flag') return buildFlag(def, palette)
  if (def.kind === 'petalBasin') return buildBasin(def, palette)
  if (def.kind === 'obelisk') return buildObelisk(def, palette)

  const mesh = new THREE.Mesh(getGeometry(def), getMaterial(palette, def))
  if (def.pos) mesh.position.set(def.pos[0], def.pos[1], def.pos[2])
  if (def.rot) {
    euler.set(def.rot[0] * Math.PI / 180, def.rot[1] * Math.PI / 180, def.rot[2] * Math.PI / 180)
    mesh.rotation.copy(euler)
  }
  mesh.castShadow = !def.noShadow && !def.glow
  mesh.receiveShadow = !def.noShadow
  return mesh
}

function buildLamp(def: MeshDef, palette: LevelPalette): THREE.Object3D {
  const g = new THREE.Group()
  const h = typeof def.size === 'number' ? def.size : 0.9
  const postColor = colorOf(palette, 'stoneDark')
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, h, 8), new THREE.MeshStandardMaterial({ color: postColor, roughness: 0.8 }))
  post.position.y = h / 2
  post.castShadow = true
  const glowColor = colorOf(palette, def.color ?? 'accent')
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 14, 10),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(glowColor), emissive: new THREE.Color(glowColor), emissiveIntensity: 2.0, roughness: 0.3 }),
  )
  bulb.position.y = h + 0.06
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.1, 10), post.material)
  cap.position.y = h + 0.17
  cap.castShadow = true
  g.add(post, bulb, cap)
  if (def.pos) g.position.set(def.pos[0], def.pos[1], def.pos[2])
  return g
}

function buildFlag(def: MeshDef, palette: LevelPalette): THREE.Object3D {
  const g = new THREE.Group()
  const h = typeof def.size === 'number' ? def.size : 1.4
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.035, h, 8),
    new THREE.MeshStandardMaterial({ color: colorOf(palette, 'stoneDark'), roughness: 0.8 }),
  )
  pole.position.y = h / 2
  pole.castShadow = true
  const clothColor = colorOf(palette, def.color ?? 'accent')
  const clothGeo = new THREE.PlaneGeometry(0.5, 0.3, 8, 4)
  const clothPos = clothGeo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < clothPos.count; i++) {
    const x = clothPos.getX(i)
    clothPos.setZ(i, Math.sin(x * 6) * 0.035)
  }
  clothGeo.computeVertexNormals()
  const cloth = new THREE.Mesh(clothGeo, new THREE.MeshStandardMaterial({ color: new THREE.Color(clothColor), roughness: 0.7, side: THREE.DoubleSide }))
  cloth.position.set(0.26, h - 0.22, 0)
  g.add(pole, cloth)
  if (def.pos) g.position.set(def.pos[0], def.pos[1], def.pos[2])
  return g
}

function buildBasin(def: MeshDef, palette: LevelPalette): THREE.Object3D {
  const g = new THREE.Group()
  const r = typeof def.size === 'number' ? def.size : 0.7
  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r * 0.9, 0.22, 24),
    new THREE.MeshStandardMaterial({ color: colorOf(palette, 'stone'), roughness: 0.85 }),
  )
  basin.position.y = 0.11
  basin.castShadow = true
  basin.receiveShadow = true
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.85, r * 0.85, 0.05, 24),
    new THREE.MeshStandardMaterial({ color: colorOf(palette, 'water'), roughness: 0.2, transparent: true, opacity: 0.9 }),
  )
  water.position.y = 0.2
  g.add(basin, water)
  if (def.pos) g.position.set(def.pos[0], def.pos[1], def.pos[2])
  return g
}

/** 方尖碑：四棱锥柱 + 顶端光晶 */
function buildObelisk(def: MeshDef, palette: LevelPalette): THREE.Object3D {
  const g = new THREE.Group()
  const s = typeof def.size === 'number' ? def.size : 1
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.22 * s, 2.2 * s, 4),
    new THREE.MeshStandardMaterial({ color: colorOf(palette, 'stone'), roughness: 0.85, flatShading: true }),
  )
  body.position.y = 1.1 * s
  body.castShadow = true
  const tip = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.1 * s, 0),
    new THREE.MeshStandardMaterial({
      color: colorOf(palette, 'accent2'),
      emissive: colorOf(palette, 'accent2'),
      emissiveIntensity: 2,
      roughness: 0.3,
    }),
  )
  tip.position.y = 2.25 * s
  g.add(body, tip)
  if (def.pos) g.position.set(def.pos[0], def.pos[1], def.pos[2])
  return g
}

/** 组内相邻平坦节点间的自动道路板 */
export function plankBetween(a: Vec3, b: Vec3, palette: LevelPalette): THREE.Mesh {
  const dx = b[0] - a[0]
  const dz = b[2] - a[2]
  const len = Math.hypot(dx, dz)
  const geo = new THREE.BoxGeometry(1.18, 0.26, len + 0.9)
  const mesh = new THREE.Mesh(geo, getMaterial(palette, { kind: 'box', color: 'path' }))
  mesh.position.set((a[0] + b[0]) / 2, a[1] - 0.13, (a[2] + b[2]) / 2)
  mesh.rotation.y = Math.atan2(dx, dz)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

/** 端口发光提示环 */
export function portStud(y: number, palette: LevelPalette): THREE.Mesh {
  const geo = new THREE.TorusGeometry(0.3, 0.035, 8, 28)
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.accent2),
    emissive: new THREE.Color(palette.accent2),
    emissiveIntensity: 1.1,
    roughness: 0.4,
  })
  const m = new THREE.Mesh(geo, mat)
  m.rotation.x = Math.PI / 2
  m.position.y = y + 0.03
  return m
}
