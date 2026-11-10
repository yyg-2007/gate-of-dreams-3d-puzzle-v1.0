/**
 * 原创角色「琉」—— 提灯梦行者。
 * 全程序化建模：圆润袍身、尖顶软帽、怀中提灯（自带暖光）。
 * 动画：行走摆臂摇摆、待机呼吸与灯光脉动、转向阻尼、通关入梦。
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { LevelEngine } from '../systems/engine'

const C_ROBE = '#5b6ee1'
const C_ROBE_DARK = '#4a58b8'
const C_TRIM = '#f4b942'
const C_SKIN = '#ffe8d6'
const C_HAT = '#ff8a7a'
const C_HAT_DARK = '#e0705f'
const C_LANTERN = '#4a3f55'
const C_FLAME = '#ffd97a'

export function Character({ engine, shadow }: { engine: LevelEngine; shadow: boolean }): React.ReactElement {
  const rootRef = useRef<THREE.Group>(null)     // 世界定位 + yaw
  const bodyRef = useRef<THREE.Group>(null)     // bob / breathe
  const armLRef = useRef<THREE.Group>(null)
  const armRRef = useRef<THREE.Group>(null)
  const lanternRef = useRef<THREE.Group>(null)
  const flameLight = useRef<THREE.PointLight>(null)

  const spawnT = useRef(0)

  const mats = useMemo(
    () => ({
      robe: new THREE.MeshStandardMaterial({ color: C_ROBE, roughness: 0.8 }),
      robeDark: new THREE.MeshStandardMaterial({ color: C_ROBE_DARK, roughness: 0.8 }),
      trim: new THREE.MeshStandardMaterial({ color: C_TRIM, roughness: 0.35, metalness: 0.3 }),
      skin: new THREE.MeshStandardMaterial({ color: C_SKIN, roughness: 0.6 }),
      hat: new THREE.MeshStandardMaterial({ color: C_HAT, roughness: 0.75 }),
      hatDark: new THREE.MeshStandardMaterial({ color: C_HAT_DARK, roughness: 0.75 }),
      lantern: new THREE.MeshStandardMaterial({ color: C_LANTERN, roughness: 0.5, metalness: 0.4 }),
      flame: new THREE.MeshStandardMaterial({ color: C_FLAME, emissive: C_FLAME, emissiveIntensity: 2.4, roughness: 0.3 }),
    }),
    [],
  )

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const root = rootRef.current
    if (!root) return
    const c = engine.char
    const t = state.clock.elapsedTime

    // 出场缩放
    spawnT.current = Math.min(1, spawnT.current + dt * 2.2)
    const spawn = spawnT.current
    const back = (x: number) => 1 + 2.7 * Math.pow(x - 1, 3) + 1.7 * Math.pow(x - 1, 2)

    // 通关：缩入光门
    const winK = engine.won ? Math.min(1, engine.winT / 1.25) : 0
    const winScale = 1 - winK * winK

    root.position.set(c.pos.x, c.pos.y, c.pos.z)
    root.rotation.y = c.yaw
    root.scale.setScalar(Math.max(0.001, back(spawn) * winScale))

    const walking = c.moving
    const phase = c.phase

    if (bodyRef.current) {
      const bob = walking ? Math.abs(Math.sin(phase)) * 0.05 : Math.sin(t * 1.8) * 0.012
      bodyRef.current.position.y = bob
      bodyRef.current.rotation.z = walking ? Math.sin(phase) * 0.055 : Math.sin(t * 1.2) * 0.02
      const breathe = 1 + Math.sin(t * 2) * 0.012
      bodyRef.current.scale.set(1, walking ? 1 : breathe, 1)
    }
    if (armLRef.current) armLRef.current.rotation.x = walking ? Math.sin(phase) * 0.6 : Math.sin(t * 1.6) * 0.06
    if (armRRef.current) armRRef.current.rotation.x = walking ? -Math.sin(phase) * 0.6 : -Math.sin(t * 1.6) * 0.06
    if (lanternRef.current) {
      lanternRef.current.rotation.z = walking ? Math.sin(phase + 0.8) * 0.22 : Math.sin(t * 1.3) * 0.08
      lanternRef.current.rotation.x = walking ? Math.cos(phase) * 0.12 : 0
    }
    if (flameLight.current) {
      flameLight.current.intensity = (walking ? 4.6 : 3.6) + Math.sin(t * 5.2) * 0.55
    }
    mats.flame.emissiveIntensity = 2.2 + Math.sin(t * 5.2) * 0.5
  })

  return (
    <group ref={rootRef}>
      <group ref={bodyRef}>
        {/* 袍身 */}
        <mesh position={[0, 0.27, 0]} castShadow={shadow} material={mats.robe}>
          <cylinderGeometry args={[0.14, 0.3, 0.54, 18]} />
        </mesh>
        {/* 袍摆内衬 */}
        <mesh position={[0, 0.06, 0]} material={mats.robeDark}>
          <cylinderGeometry args={[0.295, 0.305, 0.1, 18]} />
        </mesh>
        {/* 金腰带 */}
        <mesh position={[0, 0.36, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.trim}>
          <torusGeometry args={[0.165, 0.022, 8, 24]} />
        </mesh>
        {/* 肩披 */}
        <mesh position={[0, 0.52, 0]} material={mats.robeDark}>
          <coneGeometry args={[0.19, 0.16, 18]} />
        </mesh>
        {/* 头 */}
        <mesh position={[0, 0.65, 0]} castShadow={shadow} material={mats.skin}>
          <sphereGeometry args={[0.145, 20, 16]} />
        </mesh>
        {/* 帽檐 + 尖帽 */}
        <mesh position={[0, 0.755, -0.01]} material={mats.hatDark}>
          <cylinderGeometry args={[0.2, 0.22, 0.035, 18]} />
        </mesh>
        <mesh position={[0, 0.9, -0.02]} rotation={[0.14, 0, 0.1]} castShadow={shadow} material={mats.hat}>
          <coneGeometry args={[0.155, 0.3, 18]} />
        </mesh>
        {/* 左臂 */}
        <group ref={armLRef} position={[-0.17, 0.46, 0]}>
          <mesh position={[0, -0.09, 0]} castShadow={shadow} material={mats.robe}>
            <capsuleGeometry args={[0.045, 0.14, 4, 10]} />
          </mesh>
        </group>
        {/* 右臂 + 提灯 */}
        <group ref={armRRef} position={[0.17, 0.46, 0]}>
          <mesh position={[0, -0.09, 0]} castShadow={shadow} material={mats.robe}>
            <capsuleGeometry args={[0.045, 0.14, 4, 10]} />
          </mesh>
          <group ref={lanternRef} position={[0.015, -0.2, 0.05]}>
            <mesh position={[0, -0.05, 0]} material={mats.lantern}>
              <cylinderGeometry args={[0.008, 0.008, 0.08, 6]} />
            </mesh>
            <mesh position={[0, -0.12, 0]} material={mats.lantern}>
              <cylinderGeometry args={[0.05, 0.055, 0.025, 10]} />
            </mesh>
            <mesh position={[0, -0.19, 0]} material={mats.lantern}>
              <cylinderGeometry args={[0.045, 0.045, 0.012, 10]} />
            </mesh>
            <mesh position={[0, -0.155, 0]} material={mats.flame}>
              <sphereGeometry args={[0.042, 12, 10]} />
            </mesh>
            <pointLight ref={flameLight} position={[0, -0.155, 0]} color={C_FLAME} intensity={4} distance={4.2} decay={2} />
          </group>
        </group>
      </group>
    </group>
  )
}
