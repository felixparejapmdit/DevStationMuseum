'use client'
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { portraitFov } from './actions'
import { Suspense, useEffect } from 'react'
import * as THREE from 'three'
import { EYE } from './player'
import { getMuseum, useMuseum, useScene, type Tier } from './store'
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

/** Sky, fog, sun and fill light for the active theme. */
function Atmosphere() {
  const t = useScene()
  const tier = useMuseum((s) => s.tier)
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    gl.toneMappingExposure = t.exposure
  }, [gl, t.exposure])
  const shadows = t.sun.shadows && tier !== 'low'
  return (
    <>
      <color attach="background" args={[t.background]} />
      <fog attach="fog" args={t.fog} />
      <ambientLight intensity={t.ambient[1]} color={t.ambient[0]} />
      <hemisphereLight args={t.hemisphere} />
      <directionalLight
        position={t.sun.position}
        intensity={t.sun.intensity}
        color={t.sun.color}
        castShadow={shadows}
        shadow-mapSize={[tier === 'high' ? 2048 : 1024, tier === 'high' ? 2048 : 1024]}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={34}
        shadow-camera-bottom={-34}
        shadow-camera-near={1}
        shadow-camera-far={140}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      <Environment resolution={128} frames={1}>
        {t.name === 'day' ? (
          <>
            {/* Soft gallery daylight: a bright sky panel and warm bounce from the floor. */}
            <Lightformer form="rect" intensity={1.6} color="#ffffff" position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[16, 16, 1]} />
            <Lightformer form="rect" intensity={0.6} color="#ffe9cf" position={[0, -4, 0]} rotation-x={-Math.PI / 2} scale={[20, 20, 1]} />
            <Lightformer form="rect" intensity={0.8} color="#eef3ff" position={[-10, 3, 0]} rotation-y={Math.PI / 2} scale={[20, 4, 1]} />
          </>
        ) : (
          <>
            {/* Kept low: these only add glints to metal and the floor, not overall colour. */}
            <Lightformer form="ring" intensity={2} color={COLORS.cyan} position={[0, 6, -12]} scale={6} />
            <Lightformer form="rect" intensity={1} color={COLORS.magenta} position={[-10, 3, 0]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
            <Lightformer form="rect" intensity={1} color={COLORS.violet} position={[10, 3, 0]} rotation-y={-Math.PI / 2} scale={[20, 1, 1]} />
            <Lightformer form="rect" intensity={0.8} color="#ffffff" position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
          </>
        )}
      </Environment>
    </>
  )
}

export default function MuseumCanvas() {
  const layout = useMuseum((s) => s.layout)
  const tier = useMuseum((s) => s.tier)
  const theme = useMuseum((s) => s.theme)
  const nearRooms = useMuseum((s) => s.nearRooms)
  if (!layout) return null
  const spawn = layout.spawn

  return (
    <Canvas
      dpr={DPR[tier]}
      shadows="percentage"
      gl={{ antialias: tier === 'low', powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: 62, near: 0.05, far: 220, position: [spawn.x, EYE, spawn.z] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <PerformanceMonitor onDecline={() => adjustTier('down')} onIncline={() => adjustTier('up')} flipflops={3} onFallback={() => getMuseum().set({ tier: 'low' })} />

      {/* Background / fog attach to the scene itself, so the atmosphere stays at the root. */}
      <Suspense fallback={null}>
        <Atmosphere key={theme} />
      </Suspense>

      {/* Keyed by theme: switching day/night rebuilds materials, lights and posters cleanly. */}
      <group key={theme}>
        <Suspense fallback={null}>
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
        <LightPool layout={layout} />
      </group>

      <ResponsiveFov />
      <PlayerRig />
      <Interaction />
      <FootCursor />
      {tier !== 'low' && <Effects key={theme} tier={tier} />}
    </Canvas>
  )
}
