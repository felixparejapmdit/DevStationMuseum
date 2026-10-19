'use client'
import { Grid, Sky, Stars } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { site } from '@/site.config'
import { DIMS } from '../layout/layoutMuseum'
import { getMuseum, useMuseum, useScene } from '../store'
import { player } from '../player'
import { audio } from '../audio'
import { COLORS } from '../theme'
import { mats, neon, noRaycast, paverTexture, standard } from './materials'
import { Bench, Block, Label, NeonBar, NeonText } from './primitives'

const { facade } = DIMS

/** Bollard lamp whose cap switches on (with a click) as the visitor approaches. */
function Bollard({ x, z }: { x: number; z: number }) {
  const t = useScene()
  const m = mats(t)
  const lampColor = t.name === 'day' ? '#fff3dc' : COLORS.cyan
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(lampColor).multiplyScalar(0.3) }), [lampColor])
  useEffect(() => () => mat.dispose(), [mat])
  const on = useRef(0)
  const lit = useRef(false)
  const base = useMemo(() => new THREE.Color(lampColor), [lampColor])
  const peak = t.name === 'day' ? 1.1 : 3
  useFrame((_, dt) => {
    const near = getMuseum().started && Math.hypot(player.x - x, player.z - z) < 7
    if (near && !lit.current) {
      lit.current = true
      audio.tick()
    }
    if (near) on.current = Math.min(1, on.current + dt * 3)
    mat.color.copy(base).multiplyScalar(0.3 + (peak - 0.3) * on.current)
  })
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.45, 0]} material={m.frame} castShadow>
        <cylinderGeometry args={[0.09, 0.11, 0.9, 12]} />
      </mesh>
      <mesh position={[0, 0.82, 0]} material={mat}>
        <cylinderGeometry args={[0.095, 0.095, 0.1, 12]} />
      </mesh>
    </group>
  )
}

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const m = mats(useScene())
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.4, 0]} material={m.wood} castShadow>
        <cylinderGeometry args={[0.08, 0.14, 2.8, 8]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[Math.sin(i * 2.1) * 0.5, 3 + i * 0.55, Math.cos(i * 2.1) * 0.5]} scale={1.2 - i * 0.2} material={m.leaf} castShadow>
          <icosahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
    </group>
  )
}

/** City on the horizon: dark silhouettes with neon tops at night, hazy blocks by day. */
function Skyline() {
  const t = useScene()
  const day = t.name === 'day'
  const buildings = useMemo(() => {
    let seed = 7
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
    return Array.from({ length: 46 }, (_, i) => {
      const a = (i / 46) * Math.PI * 1.6 - Math.PI * 0.3
      const r = 70 + rand() * 30
      return {
        x: Math.sin(a) * r,
        z: 20 - Math.cos(a) * r,
        w: 6 + rand() * 10,
        h: 14 + rand() * 46,
        d: 6 + rand() * 10,
        lit: rand() > 0.55,
        color: [COLORS.magenta, COLORS.cyan, COLORS.violet][Math.floor(rand() * 3)],
      }
    })
  }, [])
  const mat = standard(day ? '#d3dae2' : '#07080e', 0.9)
  return (
    <group>
      {buildings.map((b, i) => (
        <group key={i} position={[b.x, b.h / 2, b.z]}>
          <mesh material={mat} raycast={noRaycast}>
            <boxGeometry args={[b.w, b.h, b.d]} />
          </mesh>
          {!day && b.lit && (
            <mesh position={[0, b.h / 2 + 0.1, 0]} material={neon(b.color, 1.4)} raycast={noRaycast}>
              <boxGeometry args={[b.w * 1.01, 0.2, b.d * 1.01]} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
}

/** Large stone paving with a slight tile repeat. */
function usePavers(w: number, h: number) {
  const tex = useMemo(() => {
    const t = paverTexture().clone()
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(w / 4.8, h / 4.8)
    t.needsUpdate = true
    return t
  }, [w, h])
  useEffect(() => () => tex.dispose(), [tex])
  return tex
}

export function Courtyard() {
  const t = useScene()
  const m = mats(t)
  const day = t.name === 'day'
  const floor = { kind: 'floor' }
  const bollards = useMuseum((s) => s.layout?.bollards ?? [])
  const pavers = usePavers(32, 28)
  const groundMat = useMemo(
    () => new THREE.MeshStandardMaterial(day ? { color: '#a9b98f', roughness: 1 } : { color: '#08090f', roughness: 0.55, metalness: 0.2 }),
    [day],
  )
  const plazaMat = useMemo(
    () => new THREE.MeshStandardMaterial(day ? { map: pavers, roughness: 0.85 } : { color: '#08090f', roughness: 0.55, metalness: 0.2 }),
    [day, pavers],
  )
  const pathMat = useMemo(() => new THREE.MeshStandardMaterial(day ? { color: '#d4cdc0', roughness: 0.8 } : { color: '#10121b', roughness: 0.35, metalness: 0.3 }), [day])
  useEffect(() => () => [groundMat, plazaMat, pathMat].forEach((x) => x.dispose()), [groundMat, plazaMat, pathMat])
  const facadeMat = day ? standard('#e9e5dd', 0.9) : m.wall
  const lawn = standard('#7f9a5f', 1)

  return (
    <group>
      {day ? (
        <Sky distance={180} sunPosition={t.sun.position} turbidity={6} rayleigh={1.2} mieCoefficient={0.004} mieDirectionalG={0.85} />
      ) : (
        <Stars radius={140} depth={50} count={2600} factor={4} saturation={0.3} fade speed={0.4} />
      )}
      <Skyline />

      {/* Ground: courtyard plaza + outer plain */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 20]} material={groundMat} raycast={noRaycast} receiveShadow>
        <planeGeometry args={[400, 400]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 22]} material={plazaMat} userData={floor} receiveShadow>
        <planeGeometry args={[32, 28]} />
      </mesh>
      {!day && (
        <Grid position={[0, 0.005, 22]} args={[32, 28]} cellSize={1} cellThickness={0.5} cellColor="#1a1f3a" sectionSize={4} sectionThickness={1} sectionColor="#5a2a7a" fadeDistance={40} fadeStrength={1.5} infiniteGrid={false} raycast={noRaycast} />
      )}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.008, 22]} material={pathMat} userData={floor} receiveShadow>
        <planeGeometry args={[6, 28]} />
      </mesh>
      {!day &&
        [-3, 3].map((x) => <NeonBar key={x} size={[0.05, 0.02, 27.5]} position={[x, 0.012, 22.2]} color={COLORS.cyan} intensity={2.4} />)}

      {/* Planter beds with trees */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Block size={[6, 0.5, 18]} position={[s * 9.5, 0.25, 22]} material={m.stone} shadow />
          <Block size={[5.7, 0.04, 17.7]} position={[s * 9.5, 0.51, 22]} material={day ? lawn : m.soil} shadow />
          {!day && <NeonBar size={[0.03, 0.03, 18]} position={[s * 6.48, 0.5, 22]} color={COLORS.violet} intensity={2.2} />}
          {[15.5, 22, 28.5].map((z, i) => (
            <Tree key={z} position={[s * (9.5 + (i % 2 ? 0.8 : -0.6)), 0.5, z]} scale={0.9 + (i % 2) * 0.25} />
          ))}
          {[18, 26].map((z) => (
            <Bench key={z} position={[s * 5.6, 0, z]} rotationY={Math.PI / 2} length={1.8} />
          ))}
        </group>
      ))}
      {bollards.map((b, i) => (
        <Bollard key={i} x={b.x} z={b.z} />
      ))}

      {/* Facade */}
      {[-1, 1].map((s) => (
        <Block
          key={s}
          size={[16 - facade.doorHalf, facade.h, 0.4]}
          position={[s * (facade.doorHalf + (16 - facade.doorHalf) / 2), facade.h / 2, facade.z]}
          material={facadeMat}
          shadow
        />
      ))}
      <Block
        size={[facade.doorHalf * 2, facade.h - facade.doorH, 0.4]}
        position={[0, facade.doorH + (facade.h - facade.doorH) / 2, facade.z]}
        material={facadeMat}
        shadow
      />
      <FacadeOpening />
      {/* Vertical fins: black steel by day, neon at night */}
      {[-14, -11, -8, -5, 5, 8, 11, 14].map((x) =>
        day ? (
          <Block key={x} size={[0.12, facade.h - 1.2, 0.5]} position={[x, facade.h / 2 + 0.3, facade.z + 0.45]} material={m.frame} shadow />
        ) : (
          <NeonBar key={x} size={[0.06, facade.h - 1.2, 0.06]} position={[x, facade.h / 2 + 0.3, facade.z + 0.23]} color={Math.abs(x) > 9 ? COLORS.violet : COLORS.magenta} intensity={1.8} />
        ),
      )}
      <NeonBar size={[32, 0.06, 0.06]} position={[0, facade.h - 0.05, facade.z + 0.23]} color={COLORS.cyan} intensity={day ? undefined : 2} />
      {/* Name sign */}
      <NeonText color={day ? t.ink : COLORS.magenta} fontSize={1.45} position={[0, 7.9, facade.z + 0.26]} letterSpacing={0.04}>
        {site.shortName}
      </NeonText>
      <NeonText color={day ? t.primary : COLORS.cyan} font="mono" fontSize={0.36} intensity={2.2} position={[0, 6.55, facade.z + 0.26]} letterSpacing={0.32}>
        {`${site.museumName.toUpperCase()}  ·  PORTFOLIO MUSEUM`}
      </NeonText>
      <Label font="body" fontSize={0.22} color={t.inkMuted} position={[0, 5.85, facade.z + 0.26]}>
        {site.role}
      </Label>
      {/* Canopy */}
      <Block size={[7.4, 0.18, 2.4]} position={[0, facade.doorH + 0.35, facade.z + 1.2]} material={m.frame} shadow />
      <NeonBar kind="light" size={[7.2, 0.02, 0.04]} position={[0, facade.doorH + 0.25, facade.z + 2.38]} color={COLORS.cyan} />
    </group>
  )
}

/** Steel (day) or neon (night) portal around the main entrance. */
function FacadeOpening() {
  const day = useScene().name === 'day'
  const { doorHalf, doorH, z } = facade
  const intensity = day ? undefined : 3.2
  return (
    <group>
      <NeonBar size={[0.07, doorH, 0.07]} position={[-doorHalf, doorH / 2, z + 0.24]} color={COLORS.cyan} intensity={intensity} />
      <NeonBar size={[0.07, doorH, 0.07]} position={[doorHalf, doorH / 2, z + 0.24]} color={COLORS.cyan} intensity={intensity} />
      <NeonBar size={[doorHalf * 2 + 0.07, 0.07, 0.07]} position={[0, doorH, z + 0.24]} color={COLORS.cyan} intensity={intensity} />
    </group>
  )
}
