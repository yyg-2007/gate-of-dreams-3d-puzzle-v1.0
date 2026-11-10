/**
 * 天空穹顶：三段渐变 + 太阳光晕（着色器实现，无光照开销）。
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { LevelPalette } from '../levels/types'

const vert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`

const frag = /* glsl */ `
  varying vec3 vDir;
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uBottom;
  uniform vec3 uSunColor;
  uniform vec3 uSunDir;
  uniform float uTime;
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col = mix(uBottom, uHorizon, smoothstep(-0.55, 0.02, h));
    col = mix(col, uTop, smoothstep(0.03, 0.65, h));
    // 太阳与光晕
    float s = max(dot(d, normalize(uSunDir)), 0.0);
    col += uSunColor * pow(s, 220.0) * 1.2;
    col += uSunColor * pow(s, 24.0) * 0.28;
    // 轻微的呼吸色
    col += uHorizon * 0.03 * (0.5 + 0.5 * sin(uTime * 0.2));
    gl_FragColor = vec4(col, 1.0);
  }
`

export function SkyDome({ palette }: { palette: LevelPalette }): React.ReactElement {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color(palette.skyTop) },
      uHorizon: { value: new THREE.Color(palette.skyHorizon) },
      uBottom: { value: new THREE.Color(palette.skyBottom) },
      uSunColor: { value: new THREE.Color(palette.sun) },
      uSunDir: { value: new THREE.Vector3(...palette.sunDir).normalize() },
      uTime: { value: 0 },
    }),
    [palette],
  )

  useFrame((_, dt) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += dt
  })

  return (
    <mesh frustumCulled={false} renderOrder={-100}>
      <sphereGeometry args={[180, 32, 20]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
      />
    </mesh>
  )
}

/** 云团：低多边形扁球簇，缓慢漂移（远景云海随视角方位旋转，恒在背景侧） */
export function Clouds({ palette, count = 9, area = 60, y = 9, viewState }: {
  palette: LevelPalette
  count?: number
  area?: number
  y?: number
  viewState?: React.MutableRefObject<{ zoom: number; stepCurrent: number }>
}): React.ReactElement {
  const groupRef = useRef<THREE.Group>(null)
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (Math.sin(i * 127.1) * 0.5 + 0.5) * area - area / 2,
        // 恒定远景深度（-30 附近小抖动），避免云团穿入场景
        z: -30 + Math.sin(i * 311.7) * 6,
        y: y - 8.5 + Math.sin(i * 74.7) * 1.6,
        s: 1.4 + Math.abs(Math.sin(i * 91.3)) * 1.8,
        speed: 0.16 + Math.abs(Math.sin(i * 53.1)) * 0.22,
      })),
    [count, area, y],
  )

  useFrame((_, dt) => {
    const g = groupRef.current
    if (!g) return
    // 云海整体随视角旋转，保持在相机对侧
    if (viewState) g.rotation.y = viewState.current.stepCurrent * (Math.PI / 2)
    g.children.forEach((c, i) => {
      c.position.x += seeds[i].speed * dt
      if (c.position.x > area / 2 + 6) c.position.x = -area / 2 - 6
    })
  })

  return (
    <group ref={groupRef}>
      {seeds.map((s, i) => (
        <group key={i} position={[s.x, s.y, s.z]} scale={s.s}>
          {[0, 1, 2, 3].map((j) => (
            <mesh
              key={j}
              position={[
                (j - 1.5) * 0.9,
                Math.abs(Math.sin(j * 2.4)) * 0.35,
                Math.sin(j * 5.3) * 0.55,
              ]}
              scale={[1 - Math.abs(j - 1.5) * 0.22, 0.55, 0.9]}
            >
              <sphereGeometry args={[0.85, 14, 10]} />
              <meshStandardMaterial color={palette.skyBottom} transparent opacity={0.82} roughness={1} depthWrite={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}
