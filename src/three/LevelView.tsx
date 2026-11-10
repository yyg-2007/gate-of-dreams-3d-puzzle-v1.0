/**
 * 关卡渲染层：
 *  - 每个建筑组一个容器，每帧从引擎同步世界矩阵（机关动画由引擎驱动）。
 *  - 自动生成组内相邻平坦节点间的道路板。
 *  - 端口发光环提示可对齐节点；把手 / 压力板可交互。
 *  - 目的地与悬停标记。
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { GroupDef, LevelDef } from '../levels/types'
import type { LevelEngine } from '../systems/engine'
import { buildMesh, colorOf, plankBetween, portStud } from './primitives'
import { Character } from './Character'
import { DreamDoor } from './Door'

/* ---------------- 机关把手 ---------------- */

function Handle({ group, palette, engine }: { group: GroupDef; palette: LevelDef['palette']; engine: LevelEngine }): React.ReactElement {
  const ref = useRef<THREE.Group>(null)
  const knobRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const pos = group.handle!.pos
  const accent = palette.accent

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const hovering = engine.hoverHandle === group.id
    if (knobRef.current) {
      const s = hovering ? 1.25 : 1
      knobRef.current.scale.setScalar(THREE.MathUtils.lerp(knobRef.current.scale.x, s, 0.2))
      const m = knobRef.current.material as THREE.MeshStandardMaterial
      m.emissiveIntensity = 1.6 + Math.sin(t * 3.2) * 0.5 + (hovering ? 1.2 : 0)
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * (engine.anim?.groupId === group.id ? 6 : 0.6)
    }
  })

  return (
    <group ref={ref} position={pos}>
      {/* 把手柱 */}
      <mesh position={[0, -0.18, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 0.4, 10]} />
        <meshStandardMaterial color={palette.stoneDark} roughness={0.7} />
      </mesh>
      {/* 旋钮（点击目标） */}
      <mesh ref={knobRef} position={[0, 0.02, 0]} userData={{ handleGroup: group.id }} castShadow>
        <sphereGeometry args={[0.17, 18, 14]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.6} roughness={0.3} />
      </mesh>
      {/* 方向环 */}
      <mesh ref={ringRef} position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} userData={{ handleGroup: group.id }}>
        <torusGeometry args={[0.3, 0.028, 8, 28]} />
        <meshStandardMaterial color={palette.accent2} emissive={palette.accent2} emissiveIntensity={1.4} roughness={0.4} />
      </mesh>
    </group>
  )
}

/* ---------------- 压力板 ---------------- */

function PressurePlate({ plate, engine, palette }: {
  plate: { id: string; pos: [number, number, number]; rotY?: number }
  engine: LevelEngine
  palette: LevelDef['palette']
}): React.ReactElement {
  const ref = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.MeshStandardMaterial>(null)
  useFrame((_, dt) => {
    const pressed = engine.triggeredPlates.has(plate.id)
    if (ref.current) {
      const targetY = pressed ? -0.035 : 0.03
      ref.current.position.y += (targetY - ref.current.position.y) * Math.min(1, dt * 8)
    }
    if (glowRef.current) {
      const t = glowRef.current.emissiveIntensity
      glowRef.current.emissiveIntensity = THREE.MathUtils.lerp(t, pressed ? 2.6 : 0.7, Math.min(1, dt * 6))
    }
  })
  return (
    <group position={plate.pos} rotation={[0, (plate.rotY ?? 0) * Math.PI / 180, 0]}>
      <mesh position={[0, -0.01, 0]} receiveShadow>
        <cylinderGeometry args={[0.52, 0.58, 0.06, 24]} />
        <meshStandardMaterial color={palette.stoneDark} roughness={0.9} />
      </mesh>
      <mesh ref={ref} position={[0, 0.03, 0]} userData={{ walk: true }} receiveShadow>
        <cylinderGeometry args={[0.4, 0.42, 0.07, 24]} />
        <meshStandardMaterial ref={glowRef} color={palette.accent2} emissive={palette.accent2} emissiveIntensity={0.7} roughness={0.5} />
      </mesh>
    </group>
  )
}

/* ---------------- 端口光环（组内，随组变换） ---------------- */

function PortStuds({ group }: { group: GroupDef }): React.ReactElement {
  const studs = useMemo(() => {
    return group.nodes.filter((n) => n.port).map((n) => ({ id: n.id, y: n.pos[1] }))
  }, [group])
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    refs.current.forEach((m, i) => {
      if (m) {
        const s = 1 + Math.sin(t * 2.4 + i * 1.7) * 0.12
        m.scale.setScalar(s)
      }
    })
  })
  return (
    <group>
      {studs.map((s, i) => (
        <mesh
          key={s.id}
          ref={(m) => { refs.current[i] = m }}
          position={[0, s.y + 0.035, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[0.3, 0.038, 8, 26]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.9} transparent opacity={0.85} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

/* ---------------- 单个建筑组容器 ---------------- */

function GroupView({ group, level, engine }: { group: GroupDef; level: LevelDef; engine: LevelEngine }): React.ReactElement {
  const containerRef = useRef<THREE.Group>(null)
  const palette = level.palette

  const children = useMemo(() => {
    const out: React.ReactNode[] = []
    group.meshes.forEach((def, i) => {
      const obj = buildMesh(def, palette)
      // MeshDef.walkable → 射线拾取标记（traverse 覆盖楼梯/灯柱等组合体）
      if (def.walkable) {
        obj.traverse((o) => { o.userData = { ...o.userData, walk: true } })
      }
      out.push(<primitive key={`m${i}`} object={obj} />)
    })
    // 自动道路板：组内显式连接且两端等高（noAutoPlank 组跳过）
    if (!group.noAutoPlank) {
      const posOf = new Map(group.nodes.map((n) => [n.id, n.pos]))
      const done = new Set<string>()
      group.nodes.forEach((n) => {
        n.links.forEach((lid) => {
          const pid = [n.id, lid].sort().join('|')
          if (done.has(pid)) return
          done.add(pid)
          const a = posOf.get(n.id)
          const b = posOf.get(lid)
          if (!a || !b) return
          if (Math.abs(a[1] - b[1]) > 0.05) return
          const len = Math.hypot(a[0] - b[0], a[2] - b[2])
          if (len < 0.05) return
          const plank = plankBetween(a, b, palette)
          plank.userData = { walk: true }
          out.push(<primitive key={`p${pid}`} object={plank} />)
        })
      })
    }
    return out
  }, [group, palette])

  useFrame(() => {
    const c = containerRef.current
    if (!c) return
    engine.groupWorldMatrix(group.id, c.matrix)
    c.matrixWorldNeedsUpdate = true
  })

  return (
    <group ref={containerRef} matrixAutoUpdate={false}>
      {children}
      <PortStuds group={group} />
      {group.handle && <Handle group={group} palette={palette} engine={engine} />}
    </group>
  )
}

/* ---------------- 目的地 / 悬停标记 ---------------- */

function ClickMarkers({ engine, palette }: { engine: LevelEngine; palette: LevelDef['palette'] }): React.ReactElement {
  const destRef = useRef<THREE.Group>(null)
  const hoverRef = useRef<THREE.Mesh>(null)
  const beamRef = useRef<THREE.Mesh>(null)

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    if (destRef.current) {
      const show = engine.destPoint !== null
      destRef.current.visible = show
      if (show && engine.destPoint) {
        destRef.current.position.copy(engine.destPoint)
        const pulse = 1 + Math.sin(t * 5) * 0.15
        destRef.current.children[0].scale.setScalar(pulse)
        if (beamRef.current) {
          const bm = beamRef.current.material as THREE.MeshBasicMaterial
          bm.opacity = 0.25 + Math.sin(t * 5) * 0.08
        }
      }
    }
    if (hoverRef.current) {
      const show = engine.hoverPoint !== null
      hoverRef.current.visible = show
      if (show && engine.hoverPoint) hoverRef.current.position.copy(engine.hoverPoint)
    }
    void dt
  })

  return (
    <group>
      <group ref={destRef}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <ringGeometry args={[0.26, 0.4, 28]} />
          <meshBasicMaterial color={palette.accent} transparent opacity={0.9} depthWrite={false} />
        </mesh>
        <mesh ref={beamRef} position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.1, 0.16, 1.1, 12, 1, true]} />
          <meshBasicMaterial color={palette.accent} transparent opacity={0.25} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <mesh ref={hoverRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.2, 0.28, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.55} depthWrite={false} />
      </mesh>
    </group>
  )
}

/* ---------------- 主渲染 ---------------- */

export function LevelView({ level, engine, quality }: {
  level: LevelDef
  engine: LevelEngine
  quality: 'high' | 'low'
}): React.ReactElement {
  const groups = useMemo(() => level.groups, [level])

  return (
    <group>
      {groups.map((g) => <GroupView key={g.id} group={g} level={level} engine={engine} />)}

      {/* 压力板 */}
      {(level.plates ?? []).map((p) => (
        <PressurePlate key={p.id} plate={p} engine={engine} palette={level.palette} />
      ))}

      {/* 终点之门 */}
      <DreamDoor
        palette={level.palette}
        position={level.door.pos}
        rotY={level.door.rotY}
        scale={level.door.scale ?? 1}
        engine={engine}
      />

      <Character engine={engine} shadow={quality === 'high'} />
      <ClickMarkers engine={engine} palette={level.palette} />
    </group>
  )
}

export function portColor(palette: LevelDef['palette']): string {
  return colorOf(palette, 'accent2')
}
