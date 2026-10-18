'use client'
import { Text } from '@react-three/drei'
import type { ComponentProps, ReactNode } from 'react'
import type * as THREE from 'three'
import { FONTS, MAT, neon } from './materials'

type V3 = [number, number, number]

export function Block({
  size,
  position,
  material,
  rotationY = 0,
  userData,
}: {
  size: V3
  position: V3
  material: THREE.Material
  rotationY?: number
  userData?: Record<string, unknown>
}) {
  return (
    <mesh position={position} rotation-y={rotationY} material={material} userData={userData}>
      <boxGeometry args={size} />
    </mesh>
  )
}

/** Thin emissive bar between two points on one axis. */
export function NeonBar({ size, position, color, intensity = 3 }: { size: V3; position: V3; color: string; intensity?: number }) {
  return (
    <mesh position={position} material={neon(color, intensity)}>
      <boxGeometry args={size} />
    </mesh>
  )
}

type TextProps = Omit<ComponentProps<typeof Text>, 'font'> & { font?: keyof typeof FONTS; children: ReactNode }

/** Wall lettering in the brand fonts. */
export function Label({ font = 'body', ...props }: TextProps) {
  return <Text font={FONTS[font]} anchorX="center" anchorY="middle" {...props} />
}

/** Neon sign lettering: emissive so it blooms. */
export function NeonText({ color, intensity = 2.6, font = 'display', ...props }: TextProps & { color: string; intensity?: number }) {
  return <Text font={FONTS[font]} anchorX="center" anchorY="middle" material={neon(color, intensity)} {...props} />
}

/** Gallery bench: upholstered top on two metal legs. Long axis = local x. */
export function Bench({ position, rotationY = 0, length = 2 }: { position: V3; rotationY?: number; length?: number }) {
  return (
    <group position={position} rotation-y={rotationY}>
      <Block size={[length, 0.1, 0.5]} position={[0, 0.44, 0]} material={MAT.leather()} />
      <Block size={[length - 0.02, 0.04, 0.48]} position={[0, 0.375, 0]} material={MAT.darkMetal()} />
      {[-1, 1].map((s) => (
        <Block key={s} size={[0.06, 0.36, 0.44]} position={[s * (length / 2 - 0.15), 0.18, 0]} material={MAT.metal()} />
      ))}
    </group>
  )
}

/** Sculptural potted plant (low-poly, catches the neon). */
export function Plant({ position, scale = 1, accent }: { position: V3; scale?: number; accent: string }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.3, 0]} material={MAT.stone()}>
        <cylinderGeometry args={[0.32, 0.26, 0.6, 20]} />
      </mesh>
      <mesh position={[0, 0.61, 0]} material={neon(accent, 1.6)}>
        <torusGeometry args={[0.32, 0.012, 6, 32]} />
      </mesh>
      <mesh position={[0, 0.62, 0]} rotation-x={-Math.PI / 2} material={MAT.soil()}>
        <circleGeometry args={[0.3, 20]} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = i * 2.4
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.12, 1.0 + (i % 3) * 0.22, Math.sin(a) * 0.12]}
            rotation={[0.4 * Math.sin(a), a, 0.3 * Math.cos(a)]}
            scale={[0.28, 0.5 + (i % 2) * 0.15, 0.1]}
            material={MAT.leaf()}
          >
            <icosahedronGeometry args={[1, 0]} />
          </mesh>
        )
      })}
    </group>
  )
}

/** Brass stanchion posts with a velvet rope, in front of a hero piece. */
export function Stanchions({ position, width = 4, rotationY = 0, accent }: { position: V3; width?: number; rotationY?: number; accent: string }) {
  const posts = [-width / 2, 0, width / 2]
  return (
    <group position={position} rotation-y={rotationY}>
      {posts.map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.02, 0]} material={MAT.metal()}>
            <cylinderGeometry args={[0.16, 0.18, 0.04, 20]} />
          </mesh>
          <mesh position={[0, 0.48, 0]} material={MAT.metal()}>
            <cylinderGeometry args={[0.025, 0.025, 0.92, 10]} />
          </mesh>
          <mesh position={[0, 0.96, 0]} material={neon(accent, 2.2)}>
            <sphereGeometry args={[0.045, 12, 8]} />
          </mesh>
        </group>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * width) / 4, 0.86, 0]} rotation-z={Math.PI / 2} material={neon(accent, 0.9)}>
          <cylinderGeometry args={[0.018, 0.018, width / 2 - 0.08, 8]} />
        </mesh>
      ))}
    </group>
  )
}
