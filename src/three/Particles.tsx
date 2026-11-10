/**
 * 主题粒子：花瓣 / 星星 / 萤火 / 落雪。Points + 自定义漂移，开销极低。
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function Particles({ kind, area = 26, count = 120 }: {
  kind: 'petals' | 'stars' | 'fireflies' | 'snow'
  area?: number
  count?: number
}): React.ReactElement {
  const ref = useRef<THREE.Points>(null)

  const { positions, seeds, geo } = useMemo(() => {
    const n = kind === 'stars' ? count * 2 : count
    const positions = new Float32Array(n * 3)
    const seeds = new Float32Array(n * 4) // phase, speed, sway, size
    for (let i = 0; i < n; i++) {
      positions[i * 3] = (Math.random() - 0.5) * area
      positions[i * 3 + 1] = kind === 'stars'
        ? 4 + Math.random() * 40
        : Math.random() * 12 - 1
      positions[i * 3 + 2] = (Math.random() - 0.5) * area
      seeds[i * 4] = Math.random() * Math.PI * 2
      seeds[i * 4 + 1] = 0.15 + Math.random() * 0.35
      seeds[i * 4 + 2] = 0.4 + Math.random() * 1.2
      seeds[i * 4 + 3] = 0.5 + Math.random()
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return { positions, seeds, geo }
  }, [kind, area, count])

  const color = kind === 'petals' ? '#ffb8c8' : kind === 'stars' ? '#ffffff' : kind === 'fireflies' ? '#ffe08a' : '#ffffff'
  const size = kind === 'stars' ? 0.22 : kind === 'snow' ? 0.09 : 0.075

  useFrame((state, dt) => {
    const pts = ref.current
    if (!pts) return
    const t = state.clock.elapsedTime
    const attr = pts.geometry.attributes.position as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    const n = arr.length / 3
    for (let i = 0; i < n; i++) {
      const ph = seeds[i * 4]
      const sp = seeds[i * 4 + 1]
      const sw = seeds[i * 4 + 2]
      if (kind === 'stars') {
        arr[i * 3 + 1] += Math.sin(t * 0.6 + ph) * 0.0005
        continue
      }
      arr[i * 3] += Math.sin(t * sp + ph) * sw * dt * 0.4
      if (kind === 'fireflies') {
        arr[i * 3 + 1] += Math.cos(t * sp * 0.8 + ph) * dt * 0.12
      } else {
        arr[i * 3 + 1] -= sp * dt * (kind === 'snow' ? 0.5 : 0.32)
        arr[i * 3 + 2] += Math.cos(t * sp * 0.7 + ph) * sw * dt * 0.3
        if (arr[i * 3 + 1] < -2) arr[i * 3 + 1] = 11
      }
    }
    attr.needsUpdate = true
  })

  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <pointsMaterial
        color={color}
        size={size}
        sizeAttenuation
        transparent
        opacity={kind === 'stars' ? 0.85 : 0.75}
        depthWrite={false}
        blending={kind === 'stars' || kind === 'fireflies' ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </points>
  )
}

/** 通关时从门口迸发的星屑（一次性，由 winT 驱动） */
export function WinBurst({ origin, progress }: { origin: [number, number, number]; progress: number }): React.ReactElement | null {
  const ref = useRef<THREE.Points>(null)
  const geo = useMemo(() => {
    const n = 90
    const positions = new Float32Array(n * 3)
    const vels = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      positions[i * 3] = origin[0]
      positions[i * 3 + 1] = origin[1] + 0.6
      positions[i * 3 + 2] = origin[2]
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const speed = 1.2 + Math.random() * 2.4
      vels[i * 3] = Math.sin(phi) * Math.cos(theta) * speed
      vels[i * 3 + 1] = Math.cos(phi) * speed * 0.9 + 1.2
      vels[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.userData.vels = vels
    return g
  }, [origin])

  useFrame(() => {
    const pts = ref.current
    if (!pts) return
    const attr = pts.geometry.attributes.position as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    const vels = pts.geometry.userData.vels as Float32Array
    const t = progress * 2.4
    for (let i = 0; i < arr.length / 3; i++) {
      arr[i * 3] = origin[0] + vels[i * 3] * t
      arr[i * 3 + 1] = origin[1] + 0.6 + vels[i * 3 + 1] * t - 2.2 * t * t
      arr[i * 3 + 2] = origin[2] + vels[i * 3 + 2] * t
    }
    attr.needsUpdate = true
  })

  if (progress >= 1) return null
  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <pointsMaterial color="#ffd97a" size={0.11} sizeAttenuation transparent opacity={1 - progress} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}
