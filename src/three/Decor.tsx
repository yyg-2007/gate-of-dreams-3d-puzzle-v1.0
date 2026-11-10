/**
 * 环境装饰：悬浮岛屿、树木、花草、遗迹、灯笼等。
 * 全部为原创低多边形组合体，静态渲染，随主题呼吸浮动。
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { DecorDef, LevelPalette } from '../levels/types'
import { colorOf } from './primitives'

function useBob(seed: number, amp = 0.12, speed = 0.5): React.RefObject<THREE.Group> {
  const ref = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = seed * 0 + Math.sin(state.clock.elapsedTime * speed + seed * 7.3) * amp
    }
  })
  return ref
}

const mat = (color: string, rough = 0.85, flat = false) => (
  <meshStandardMaterial color={color} roughness={rough} metalness={0.03} flatShading={flat} />
)

/** 倒锥悬浮岛：岩体 + 草顶 + 垂饰石 */
function Island({ def, palette, big = false }: { def: DecorDef; palette: LevelPalette; big?: boolean }): React.ReactElement {
  const s = def.scale ?? 1
  const ref = useBob(def.pos[0] + def.pos[2], 0.14, 0.4)
  const rock = colorOf(palette, 'stoneDark')
  const grass = colorOf(palette, def.color ?? 'accent2')
  return (
    <group ref={ref} position={def.pos} scale={s} rotation={[0, def.rotY ?? 0, 0]}>
      <mesh position={[0, -1.15, 0]} castShadow>
        <coneGeometry args={[1.5, 2.3, 7]} />
        {mat(rock, 0.9, true)}
      </mesh>
      <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.52, 1.3, 0.34, 7]} />
        {mat(grass, 0.9, true)}
      </mesh>
      <mesh position={[0.4, 0.55, 0.2]} castShadow>
        <coneGeometry args={[0.34, 0.85, 7]} />
        {mat(colorOf(palette, 'accent'), 0.85, true)}
      </mesh>
      <mesh position={[0.4, 1.02, 0.2]}>
        <sphereGeometry args={[0.36, 12, 9]} />
        {mat(grass)}
      </mesh>
      <mesh position={[-0.55, 0.5, -0.25]} castShadow>
        <sphereGeometry args={[0.3, 12, 9]} />
        {mat(grass)}
      </mesh>
      <mesh position={[-0.2, -2.4, 0.15]}>
        <octahedronGeometry args={[0.28, 0]} />
        {mat(rock, 0.9, true)}
      </mesh>
      <mesh position={[0.35, -3.1, -0.2]} scale={0.7}>
        <octahedronGeometry args={[0.22, 0]} />
        {mat(rock, 0.9, true)}
      </mesh>
      {big && (
        <mesh position={[-0.7, 0.75, 0.4]}>
          <sphereGeometry args={[0.26, 12, 9]} />
          {mat(grass)}
        </mesh>
      )}
    </group>
  )
}

/** 倒挂岛（上方世界） */
function HangingIsland({ def, palette }: { def: DecorDef; palette: LevelPalette }): React.ReactElement {
  const s = def.scale ?? 1
  const ref = useBob(def.pos[0], 0.2, 0.3)
  const rock = colorOf(palette, 'stoneDark')
  return (
    <group ref={ref} position={def.pos} scale={s} rotation={[0, def.rotY ?? 0, 0]}>
      <mesh position={[0, 1.2, 0]}>
        <coneGeometry args={[1.4, 2.4, 7]} />
        {mat(rock, 0.9, true)}
      </mesh>
      <mesh position={[0, -0.02, 0]}>
        <cylinderGeometry args={[1.28, 1.44, 0.3, 7]} />
        {mat(colorOf(palette, 'accent'), 0.9, true)}
      </mesh>
      <mesh position={[0.4, -0.7, 0.2]}>
        <coneGeometry args={[0.3, 0.9, 6]} />
        {mat(rock, 0.9, true)}
      </mesh>
    </group>
  )
}

/** 原创树：叠球树冠 */
export function Tree({ pos, scale = 1, color = '#58c9b9', seed = 0 }: {
  pos: [number, number, number]
  scale?: number
  color?: string
  seed?: number
}): React.ReactElement {
  const ref = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (ref.current) ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.7 + seed) * 0.02
  })
  return (
    <group ref={ref} position={pos} scale={scale}>
      <mesh position={[0, 0.32, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.09, 0.64, 7]} />
        {mat('#8a6a4f', 0.95, true)}
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <sphereGeometry args={[0.34, 12, 9]} />
        {mat(color)}
      </mesh>
      <mesh position={[0.16, 1.08, 0.08]} castShadow>
        <sphereGeometry args={[0.24, 12, 9]} />
        {mat(color)}
      </mesh>
      <mesh position={[-0.15, 1.02, -0.1]}>
        <sphereGeometry args={[0.2, 12, 9]} />
        {mat(color)}
      </mesh>
    </group>
  )
}

function Pine({ pos, scale = 1, color = '#4fae9a' }: { pos: [number, number, number]; scale?: number; color?: string }): React.ReactElement {
  return (
    <group position={pos} scale={scale}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 0.44, 7]} />
        {mat('#8a6a4f', 0.95, true)}
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow>
        <coneGeometry args={[0.3, 0.55, 7]} />
        {mat(color, 0.9, true)}
      </mesh>
      <mesh position={[0, 0.95, 0]} castShadow>
        <coneGeometry args={[0.22, 0.45, 7]} />
        {mat(color, 0.9, true)}
      </mesh>
    </group>
  )
}

function Flower({ pos, color = '#ff8a7a', seed = 0 }: { pos: [number, number, number]; color?: string; seed?: number }): React.ReactElement {
  const ref = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (ref.current) ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.4 + seed * 3) * 0.07
  })
  return (
    <group ref={ref} position={pos}>
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.012, 0.016, 0.18, 5]} />
        {mat('#6aa06a', 0.9)}
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[Math.cos((i / 5) * Math.PI * 2) * 0.055, 0.2, Math.sin((i / 5) * Math.PI * 2) * 0.055]} rotation={[Math.PI / 3, (i / 5) * Math.PI * 2, 0]} scale={[1, 0.55, 1]}>
          <sphereGeometry args={[0.035, 8, 6]} />
          {mat(color, 0.6)}
        </mesh>
      ))}
      <mesh position={[0, 0.21, 0]}>
        <sphereGeometry args={[0.03, 8, 6]} />
        {mat('#ffe08a', 0.5)}
      </mesh>
    </group>
  )
}

function GrassTuft({ pos, seed = 0 }: { pos: [number, number, number]; seed?: number }): React.ReactElement {
  const ref = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (ref.current) ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 1.8 + seed * 2) * 0.06
  })
  return (
    <group ref={ref} position={pos}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[(i - 1) * 0.045, 0.07, i * 0.02]} rotation={[0, 0, (i - 1) * 0.3]}>
          <coneGeometry args={[0.02, 0.15, 4]} />
          {mat('#7ab86a', 0.9, true)}
        </mesh>
      ))}
    </group>
  )
}

function Bush({ pos, scale = 1, color = '#6ab888' }: { pos: [number, number, number]; scale?: number; color?: string }): React.ReactElement {
  return (
    <group position={pos} scale={scale}>
      <mesh position={[0, 0.16, 0]} castShadow scale={[1.15, 0.85, 1]}>
        <sphereGeometry args={[0.2, 10, 8]} />
        {mat(color)}
      </mesh>
      <mesh position={[0.14, 0.12, 0.06]}>
        <sphereGeometry args={[0.13, 10, 8]} />
        {mat(color)}
      </mesh>
    </group>
  )
}

function Rock({ pos, scale = 1, palette }: { pos: [number, number, number]; scale?: number; palette: LevelPalette }): React.ReactElement {
  return (
    <group position={pos} scale={scale} rotation={[0, pos[0] * 3.1, 0]}>
      <mesh position={[0, 0.1, 0]} castShadow>
        <dodecahedronGeometry args={[0.16, 0]} />
        {mat(colorOf(palette, 'stoneDark'), 0.95, true)}
      </mesh>
    </group>
  )
}

function LanternPost({ pos, palette, scale = 1 }: { pos: [number, number, number]; palette: LevelPalette; scale?: number }): React.ReactElement {
  const ref = useRef<THREE.PointLight>(null)
  useFrame((state) => {
    if (ref.current) ref.current.intensity = 2.2 + Math.sin(state.clock.elapsedTime * 2.4 + pos[0]) * 0.5
  })
  return (
    <group position={pos} scale={scale}>
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.05, 1.4, 8]} />
        {mat(colorOf(palette, 'stoneDark'), 0.85)}
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={2.4} roughness={0.3} />
      </mesh>
      <pointLight ref={ref} position={[0, 1.5, 0]} color={palette.accent} intensity={2.2} distance={4.5} decay={2} />
    </group>
  )
}

function Statue({ pos, palette, scale = 1 }: { pos: [number, number, number]; palette: LevelPalette; scale?: number }): React.ReactElement {
  return (
    <group position={pos} scale={scale}>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.36, 0.4, 8]} />
        {mat(colorOf(palette, 'stone'), 0.9)}
      </mesh>
      <mesh position={[0, 0.75, 0]} castShadow>
        <coneGeometry args={[0.2, 0.95, 8]} />
        {mat(colorOf(palette, 'stone'), 0.9)}
      </mesh>
      <mesh position={[0, 1.32, 0]}>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshStandardMaterial color={palette.accent2} emissive={palette.accent2} emissiveIntensity={1.2} roughness={0.4} />
      </mesh>
    </group>
  )
}

function RuinPillar({ pos, palette, scale = 1 }: { pos: [number, number, number]; palette: LevelPalette; scale?: number }): React.ReactElement {
  const ref = useBob(pos[0], 0.05, 0.6)
  return (
    <group ref={ref} position={pos} scale={scale} rotation={[0, pos[2] * 2.3, 0.12]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.17, 1.0, 10]} />
        {mat(colorOf(palette, 'stone'), 0.9)}
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[0.4, 0.12, 0.4]} />
        {mat(colorOf(palette, 'stone'), 0.9)}
      </mesh>
    </group>
  )
}

function Obelisk({ pos, palette, scale = 1 }: { pos: [number, number, number]; palette: LevelPalette; scale?: number }): React.ReactElement {
  return (
    <group position={pos} scale={scale}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <coneGeometry args={[0.22, 2.2, 4]} />
        {mat(colorOf(palette, 'stone'), 0.85, true)}
      </mesh>
      <mesh position={[0, 2.25, 0]}>
        <octahedronGeometry args={[0.1, 0]} />
        <meshStandardMaterial color={palette.accent2} emissive={palette.accent2} emissiveIntensity={2} roughness={0.3} />
      </mesh>
    </group>
  )
}

/** 全部装饰统一渲染入口 */
export function DecorLayer({ defs, palette }: { defs: DecorDef[]; palette: LevelPalette }): React.ReactElement {
  const items = useMemo(() => defs, [defs])
  return (
    <group>
      {items.map((d, i) => {
        switch (d.kind) {
          case 'island': return <Island key={i} def={d} palette={palette} />
          case 'islandBig': return <Island key={i} def={d} palette={palette} big />
          case 'hangingIsland': return <HangingIsland key={i} def={d} palette={palette} />
          case 'tree': return <Tree key={i} pos={d.pos} scale={d.scale} color={d.color} seed={i} />
          case 'pine': return <Pine key={i} pos={d.pos} scale={d.scale} color={d.color} />
          case 'flower': return <Flower key={i} pos={d.pos} color={d.color} seed={i} />
          case 'grassTuft': return <GrassTuft key={i} pos={d.pos} seed={i} />
          case 'bush': return <Bush key={i} pos={d.pos} scale={d.scale} color={d.color} />
          case 'rock': return <Rock key={i} pos={d.pos} scale={d.scale} palette={palette} />
          case 'lanternPost': return <LanternPost key={i} pos={d.pos} palette={palette} scale={d.scale} />
          case 'statue': return <Statue key={i} pos={d.pos} palette={palette} scale={d.scale} />
          case 'ruinPillar': return <RuinPillar key={i} pos={d.pos} palette={palette} scale={d.scale} />
          case 'obelisk': return <Obelisk key={i} pos={d.pos} palette={palette} scale={d.scale} />
          default: return null
        }
      })}
    </group>
  )
}
