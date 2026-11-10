/**
 * 梦境之门：拱门 + 传送门盘（旋涡着色器）。
 * locked（暗淡符文环）→ open（明亮旋涡）→ win（爆发增亮）。
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { LevelPalette } from '../levels/types'
import type { LevelEngine } from '../systems/engine'

const portalVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const portalFrag = /* glsl */ `
  uniform float uTime;
  uniform float uOpen;    // 0 锁定 → 1 开启
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec2 vUv;
  void main() {
    vec2 c = vUv - 0.5;
    float r = length(c);
    float a = atan(c.y, c.x);
    float swirl = sin(a * 3.0 + uTime * 1.6 - r * 9.0) * 0.5 + 0.5;
    float glow = smoothstep(0.5, 0.05, r);
    vec3 locked = mix(uColorA * 0.25, uColorA * 0.5, glow);
    vec3 open = mix(uColorB, uColorA, swirl * glow) + glow * 0.55;
    vec3 col = mix(locked, open, uOpen);
    float alpha = mix(0.5 + glow * 0.3, 0.92, uOpen);
    // 边缘圆滑
    alpha *= smoothstep(0.5, 0.46, r);
    gl_FragColor = vec4(col, alpha);
  }
`

export function DreamDoor({ palette, position, rotY = 0, scale = 1, engine }: {
  palette: LevelPalette
  position: [number, number, number]
  rotY?: number
  scale?: number
  engine: LevelEngine
}): React.ReactElement {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const glowRef = useRef<THREE.PointLight>(null)
  const groupRef = useRef<THREE.Group>(null)
  const orbMat = useRef<THREE.MeshStandardMaterial>(null)
  const runeMat = useRef<THREE.MeshStandardMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpen: { value: 0 },
      uColorA: { value: new THREE.Color(palette.accent) },
      uColorB: { value: new THREE.Color(palette.accent2) },
    }),
    [palette],
  )

  useFrame((state, dt) => {
    const m = matRef.current
    if (!m) return
    m.uniforms.uTime.value += dt
    const open = engine.doorOpen
    const winProgress = engine.won ? Math.min(1, engine.winT / 1.5) : 0
    const target = open ? 1 : 0
    m.uniforms.uOpen.value += (target - m.uniforms.uOpen.value) * Math.min(1, dt * 3)
    if (glowRef.current) {
      const base = open ? 3.2 : 0.7
      glowRef.current.intensity = base + Math.sin(state.clock.elapsedTime * 2.2) * 0.4 + winProgress * 6
    }
    if (groupRef.current) {
      const s = scale * (1 + winProgress * 0.15)
      groupRef.current.scale.setScalar(s)
    }
    if (orbMat.current) {
      orbMat.current.emissiveIntensity = (engine.doorOpen ? 2 : 0.4) + winProgress * 2
    }
    if (runeMat.current) {
      runeMat.current.emissiveIntensity = (engine.doorOpen ? 1.6 : 0.25) + winProgress * 1.5
    }
  })

  const archColor = palette.stone

  return (
    <group ref={groupRef} position={position} rotation={[0, rotY * Math.PI / 180, 0]}>
      {/* 门柱 */}
      <mesh position={[-0.78, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.2, 2.2, 10]} />
        <meshStandardMaterial color={archColor} roughness={0.85} />
      </mesh>
      <mesh position={[0.78, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.2, 2.2, 10]} />
        <meshStandardMaterial color={archColor} roughness={0.85} />
      </mesh>
      {/* 门楣环 */}
      <mesh position={[0, 2.2, 0]} rotation={[0, 0, 0]} castShadow>
        <torusGeometry args={[0.82, 0.14, 12, 32, Math.PI]} />
        <meshStandardMaterial color={archColor} roughness={0.85} />
      </mesh>
      <mesh position={[0, 2.32, 0]}>
        <sphereGeometry args={[0.13, 14, 10]} />
        <meshStandardMaterial ref={orbMat} color={palette.accent} emissive={palette.accent} emissiveIntensity={0.4} roughness={0.3} />
      </mesh>
      {/* 符文环 */}
      <mesh position={[0, 1.15, 0.02]}>
        <torusGeometry args={[0.62, 0.03, 8, 40]} />
        <meshStandardMaterial ref={runeMat} color={palette.accent2} emissive={palette.accent2} emissiveIntensity={0.25} roughness={0.4} />
      </mesh>
      {/* 传送门盘 */}
      <mesh position={[0, 1.15, 0]}>
        <circleGeometry args={[0.78, 36]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={portalVert}
          fragmentShader={portalFrag}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* 台阶基座 */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <cylinderGeometry args={[1.15, 1.3, 0.12, 20]} />
        <meshStandardMaterial color={palette.stoneDark} roughness={0.9} />
      </mesh>
      <pointLight ref={glowRef} position={[0, 1.3, 0.5]} color={palette.accent} intensity={1} distance={7} decay={2} />
    </group>
  )
}
