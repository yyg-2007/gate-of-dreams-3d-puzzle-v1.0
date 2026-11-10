/**
 * 梦境水面：双色调波纹着色器（顶点微波动 + 环纹），无光照计算，开销极低。
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { LevelPalette } from '../levels/types'

const vert = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vWave;
  void main() {
    vUv = uv;
    vec3 p = position;
    float w = sin(p.x * 0.9 + uTime * 0.8) * 0.06 + cos(p.y * 1.1 - uTime * 0.6) * 0.05;
    p.z += w;
    vWave = w;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

const frag = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uTime;
  varying vec2 vUv;
  varying float vWave;
  void main() {
    float ripple = sin(vUv.x * 46.0 + uTime * 1.1) * sin(vUv.y * 38.0 - uTime * 0.9);
    vec3 col = mix(uColorA, uColorB, vWave * 2.4 + 0.5);
    col += ripple * 0.045;
    gl_FragColor = vec4(col, 0.94);
  }
`

export function Water({ palette, y, radius, pos = [0, 0, 0] }: {
  palette: LevelPalette
  y: number
  radius: number
  pos?: [number, number, number]
}): React.ReactElement {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(palette.water) },
      uColorB: { value: new THREE.Color(palette.waterDeep) },
    }),
    [palette],
  )
  useFrame((_, dt) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += dt
  })
  return (
    <mesh position={[pos[0], y, pos[2]]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-10}>
      <circleGeometry args={[radius, 48]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}
