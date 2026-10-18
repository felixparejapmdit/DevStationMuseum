'use client'
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { portraitFov } from './actions'
import { Suspense, useEffect } from 'react'
import * as THREE from 'three'
import { EYE } from './player'
import { getMuseum, useMuseum, type Tier } from './store'
import { COLORS } from './theme'
import { Courtyard } from './scene/Courtyard'
import { Effects } from './scene/Effects'
import { FootCursor, Interaction } from './scene/Interaction'
import { Interior, InteriorFloor } from './scene/Interior'
import { LightPool } from './scene/LightPool'
import { PlayerRig } from './scene/PlayerRig'
import { Room } from './scene/Room'

// React Three Fiber still creates a THREE.Clock internally; hide only that known
// deprecation notice so the console stays clean. Every other three.js message passes through.
THREE.setConsoleFunction((type, message, ...rest) => {
  if (typeof message === 'string' && message.startsWith('THREE.Clock')) return
  ;(console[type as 'log' | 'warn' | 'error'] ?? console.log)(message, ...rest)
})

// Capped so 4K / retina screens don't render 4× the pixels for little visible gain.
const DPR: Record<Tier, [number, number]> = { low: [0.75, 1], medium: [1, 1.25], high: [1, 1.6] }
const DOWN: Record<Tier, Tier> = { high: 'medium', medium: 'low', low: 'low' }
const UP: Record<Tier, Tier> = { low: 'medium', medium: 'high', high: 'high' }

/** Wider vertical FOV on portrait screens so phones don't feel like looking through a slot. */
function ResponsiveFov() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  useEffect(() => {
    camera.fov = portraitFov(size.width / Math.max(1, size.height))
    camera.updateProjectionMatrix()
  }, [camera, size])
  return null
}

function SceneReady() {
  useEffect(() => {
    getMuseum().set({ sceneReady: true })
  }, [])
  return null
}

function adjustTier(dir: 'up' | 'down') {
  const s = getMuseum()
  if (s.qualitySetting !== 'auto') return
  const next = dir === 'down' ? DOWN[s.tier] : s.touch ? s.tier : UP[s.tier]
  if (next !== s.tier) s.set({ tier: next })
}

export default function MuseumCanvas() {
  const layout = useMuseum((s) => s.layout)
  const tier = useMuseum((s) => s.tier)
  const nearRooms = useMuseum((s) => s.nearRooms)
  if (!layout) return null
  const spawn = layout.spawn

  return (
    <Canvas
      dpr={DPR[tier]}
      gl={{ antialias: tier === 'low', powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: 62, near: 0.05, far: 220, position: [spawn.x, EYE, spawn.z] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping
        gl.toneMappingExposure = 1.05
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={[COLORS.void]} />
      <fog attach="fog" args={[COLORS.void, 26, 120]} />
      <ambientLight intensity={0.45} color="#8a96ff" />
      <hemisphereLight args={['#5463d8', '#0a0510', 0.55]} />
      <directionalLight position={[-20, 30, 40]} intensity={0.4} color="#9fb0ff" />

      <PerformanceMonitor onDecline={() => adjustTier('down')} onIncline={() => adjustTier('up')} flipflops={3} onFallback={() => getMuseum().set({ tier: 'low' })} />

      <Suspense fallback={null}>
        <Environment resolution={128} frames={1}>
          {/* Kept low: these only add glints to metal and the floor, not overall colour. */}
          <Lightformer form="ring" intensity={2} color={COLORS.cyan} position={[0, 6, -12]} scale={6} />
          <Lightformer form="rect" intensity={1} color={COLORS.magenta} position={[-10, 3, 0]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
          <Lightformer form="rect" intensity={1} color={COLORS.violet} position={[10, 3, 0]} rotation-y={-Math.PI / 2} scale={[20, 1, 1]} />
          <Lightformer form="rect" intensity={0.8} color="#ffffff" position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        </Environment>
        <Courtyard />
        <InteriorFloor layout={layout} />
        <Interior layout={layout} />
        <SceneReady />
      </Suspense>
      {nearRooms.map((i) => (
        <Suspense key={layout.rooms[i].room.id} fallback={null}>
          <Room layout={layout.rooms[i]} />
        </Suspense>
      ))}

      <ResponsiveFov />
      <LightPool layout={layout} />
      <PlayerRig />
      <Interaction />
      <FootCursor />
      {tier !== 'low' && <Effects tier={tier} />}
    </Canvas>
  )
}
