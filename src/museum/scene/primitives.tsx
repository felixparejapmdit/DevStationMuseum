'use client'
import { Text } from '@react-three/drei'
import type { ComponentProps, ReactNode } from 'react'
import type * as THREE from 'three'
import { useScene } from '../store'
import { FONTS, lightMat, lineMat, mats, neon } from './materials'

type V3 = [number, number, number]

export function Block({
  size,
  position,
  material,
  rotationY = 0,
  userData,
  shadow = false,
}: {
  size: V3
  position: V3
  material: THREE.Material
  rotationY?: number
  userData?: Record<string, unknown>
  /** Casts and receives the daylight sun shadow (courtyard only). */
  shadow?: boolean
}) {
  return (
    <mesh position={position} rotation-y={rotationY} material={material} userData={userData} castShadow={shadow} receiveShadow={shadow}>
      <boxGeometry args={size} />
    </mesh>
  )
}

/**
 * Thin architectural line. `kind="line"`: neon tube at night, black steel by day.
 * `kind="light"`: neon at night, warm cove / skylight strip by day.
 */
export function NeonBar({ size, position, color, intensity, kind = 'line' }: { size: V3; position: V3; color: string; intensity?: number; kind?: 'line' | 'light' }) {
  const t = useScene()
  const material = t.name === 'night' && intensity !== undefined ? neon(color, intensity) : kind === 'light' ? lightMat(t, color) : lineMat(t, color)
  return (
    <mesh position={position} material={material}>
      <boxGeometry args={size} />
    </mesh>
  )
}

type TextProps = Omit<ComponentProps<typeof Text>, 'font' | 'color'> & { font?: keyof typeof FONTS; children: ReactNode; color?: string }

/** Wall lettering in the brand fonts. Defaults to the theme's ink colour. */
export function Label({ font = 'body', color, ...props }: TextProps) {
  const t = useScene()
  return <Text font={FONTS[font]} anchorX="center" anchorY="middle" color={color ?? t.ink} {...props} />
}

/** Feature lettering: glowing neon at night, flat painted vinyl by day. */
export function NeonText({ color, intensity = 2.6, font = 'display', ...props }: TextProps & { color: string; intensity?: number }) {
  const t = useScene()
  return <Text font={FONTS[font]} anchorX="center" anchorY="middle" material={neon(color, t.name === 'night' ? intensity : 1)} {...props} />
}

/** Gallery bench. Long axis = local x. Oak by day, upholstered by night. */
export function Bench({ position, rotationY = 0, length = 2 }: { position: V3; rotationY?: number; length?: number }) {
  const m = mats(useScene())
  return (
    <group position={position} rotation-y={rotationY}>
      <Block size={[length, 0.08, 0.5]} position={[0, 0.44, 0]} material={m.seat} shadow />
      {[-1, 1].map((s) => (
        <Block key={s} size={[0.06, 0.4, 0.44]} position={[s * (length / 2 - 0.15), 0.2, 0]} material={m.frame} shadow />
      ))}
    </group>
  )
}

/** Potted plant: low-poly leaves in a stone or terracotta pot. */
export function Plant({ position, scale = 1, accent }: { position: V3; scale?: number; accent: string }) {
  const t = useScene()
  const m = mats(t)
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.3, 0]} material={m.pot} castShadow receiveShadow>
        <cylinderGeometry args={[0.32, 0.26, 0.6, 20]} />
      </mesh>
      {t.name === 'night' && (
        <mesh position={[0, 0.61, 0]} material={neon(accent, 1.6)}>
          <torusGeometry args={[0.32, 0.012, 6, 32]} />
        </mesh>
      )}
      <mesh position={[0, 0.62, 0]} rotation-x={-Math.PI / 2} material={m.soil}>
        <circleGeometry args={[0.3, 20]} />
      </mesh>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const a = i * 2.4
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.14, 1.0 + (i % 3) * 0.22, Math.sin(a) * 0.14]}
            rotation={[0.4 * Math.sin(a), a, 0.3 * Math.cos(a)]}
            scale={[0.26, 0.5 + (i % 2) * 0.15, 0.09]}
            material={m.leaf}
            castShadow
          >
            <icosahedronGeometry args={[1, 0]} />
          </mesh>
        )
      })}
    </group>
  )
}

/** Stanchion posts with a rope, in front of a hero piece. */
export function Stanchions({ position, width = 4, rotationY = 0, accent }: { position: V3; width?: number; rotationY?: number; accent: string }) {
  const t = useScene()
  const m = mats(t)
  const posts = [-width / 2, 0, width / 2]
  const brass = t.name === 'day' ? '#b8954f' : undefined
  const postMat = brass ? lineMat({ ...t, line: () => ({ color: brass, glow: 1 }) }, brass) : m.metal
  return (
    <group position={position} rotation-y={rotationY}>
      {posts.map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.02, 0]} material={postMat} castShadow>
            <cylinderGeometry args={[0.16, 0.18, 0.04, 20]} />
          </mesh>
          <mesh position={[0, 0.48, 0]} material={postMat} castShadow>
            <cylinderGeometry args={[0.025, 0.025, 0.92, 10]} />
          </mesh>
          <mesh position={[0, 0.96, 0]} material={t.name === 'night' ? neon(accent, 2.2) : postMat}>
            <sphereGeometry args={[0.045, 12, 8]} />
          </mesh>
        </group>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * width) / 4, 0.86, 0]} rotation-z={Math.PI / 2} material={t.name === 'night' ? neon(accent, 0.9) : neon(accent, 1)}>
          <cylinderGeometry args={[0.018, 0.018, width / 2 - 0.08, 8]} />
        </mesh>
      ))}
    </group>
  )
}
