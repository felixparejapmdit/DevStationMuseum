'use client'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { Project } from '@/lib/types'
import type { ExhibitLayout } from '../layout/layoutMuseum'
import { getMuseum, useMuseum, useScene } from '../store'
import { player } from '../player'
import { audio } from '../audio'
import { additive, coneTexture, dimmableNeon, FONTS, frameShadowTexture, glowTexture, mats as materialsFor, neon, noRaycast } from './materials'
import { ensureCanvasFonts, makePosterTexture } from './poster'
import { Text } from '@react-three/drei'

type Props = {
  ex: ExhibitLayout
  project: Project
  accent: string
  secondary: string
  /** Absolute ceiling height above the floor (for the track-light fixture). */
  ceilingY: number
  /** Render with world transform (rotunda) instead of room-local. */
  world?: boolean
  /** Category / room line on the plaque. */
  caption: string
}

/** Fits a texture to the frame like CSS `object-fit: cover`, anchored to the top (websites read top-down). */
function cover(tex: THREE.Texture, imageAspect: number, frameAspect: number) {
  tex.repeat.set(1, 1)
  tex.offset.set(0, 0)
  if (imageAspect > frameAspect) {
    tex.repeat.x = frameAspect / imageAspect
    tex.offset.x = (1 - tex.repeat.x) / 2
  } else {
    tex.repeat.y = imageAspect / frameAspect
    tex.offset.y = 1 - tex.repeat.y
  }
}

function useExhibitMedia(project: Project, accent: string, secondary: string, number: string, w: number, h: number, near: boolean) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const tier = useMuseum((s) => s.tier)
  const frameAspect = w / h

  // Still image: real capture if present, else generated artwork.
  useEffect(() => {
    let disposed = false
    let current: THREE.Texture | null = null
    const swap = (t: THREE.Texture) => {
      if (disposed) return t.dispose()
      current?.dispose()
      current = t
      setTexture(t)
    }
    void ensureCanvasFonts().then(() => {
      if (!disposed && !project.media.poster) swap(makePosterTexture(project, accent, secondary, number, frameAspect, getMuseum().theme === 'day'))
    })
    if (project.media.poster) {
      new THREE.TextureLoader().load(
        project.media.poster,
        (t) => {
          t.colorSpace = THREE.SRGBColorSpace
          t.anisotropy = 4
          const img = t.image as HTMLImageElement
          cover(t, img.width / img.height, frameAspect)
          swap(t)
        },
        undefined,
        () => void ensureCanvasFonts().then(() => swap(makePosterTexture(project, accent, secondary, number, frameAspect, getMuseum().theme === 'day'))),
      )
    }
    return () => {
      disposed = true
      current?.dispose()
    }
  }, [project, accent, secondary, number, frameAspect])

  // Video loop: only while the visitor is close and the device can afford it.
  const [video, setVideo] = useState<THREE.VideoTexture | null>(null)
  const wantVideo = near && !!project.media.loop && tier !== 'low'
  useEffect(() => {
    if (!wantVideo || !project.media.loop) return
    const el = document.createElement('video')
    el.src = project.media.loop
    el.muted = true
    el.loop = true
    el.playsInline = true
    el.crossOrigin = 'anonymous'
    const tex = new THREE.VideoTexture(el)
    tex.colorSpace = THREE.SRGBColorSpace
    el.addEventListener('loadedmetadata', () => cover(tex, el.videoWidth / el.videoHeight, frameAspect), { once: true })
    el.play()
      .then(() => setVideo(tex))
      .catch(() => undefined)
    return () => {
      el.pause()
      el.removeAttribute('src')
      el.load()
      tex.dispose()
      setVideo(null)
    }
  }, [wantVideo, project.media.loop, frameAspect])

  return video ?? texture
}

export function Exhibit({ ex, project, accent, secondary, ceilingY, world = false, caption }: Props) {
  const t = useScene()
  const surface = materialsFor(t)
  const day = t.name === 'day'
  const { w, h } = ex
  const centerY = ex.position[1]
  const [near, setNear] = useState(false)
  const media = useExhibitMedia(project, accent, secondary, ex.number, w, h, near)

  const m = useMemo(
    () => ({
      screen: new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(t.screenBase), toneMapped: false }),
      edge: dimmableNeon(accent),
      wash: additive(glowTexture(), accent, 0),
      cone: additive(coneTexture(), '#fff4e0', 0),
      pool: additive(glowTexture(), '#fff4e0', 0),
      shadow: new THREE.MeshBasicMaterial({ map: frameShadowTexture(), color: '#000000', transparent: true, opacity: 0.3, depthWrite: false }),
      ring: new THREE.MeshBasicMaterial({ color: new THREE.Color(accent).multiplyScalar(day ? 1 : 2), transparent: true, opacity: 0, depthWrite: false }),
      lens: dimmableNeon('#fff2d6'),
    }),
    [accent, day, t.screenBase],
  )
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m])

  useEffect(() => {
    m.screen.map = media
    m.screen.needsUpdate = true
  }, [media, m])

  // Spotlight geometry: from a ceiling fixture in front of the frame down onto it.
  const spot = useMemo(() => {
    const fixture = new THREE.Vector3(0, ceilingY - centerY - 0.3, Math.min(1.7, ceilingY * 0.32))
    const dir = new THREE.Vector3().sub(fixture)
    const length = dir.length()
    const geo = new THREE.ConeGeometry(Math.max(w, h) * 0.62, length, 32, 1, true)
    geo.translate(0, -length / 2, 0)
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize())
    return { fixture, geo, quat }
  }, [ceilingY, centerY, w, h])
  useEffect(() => () => spot.geo.dispose(), [spot])

  const on = useRef(0)
  const litOnce = useRef(false)
  const litAt = useRef<number | null>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const accentColor = useMemo(() => new THREE.Color(accent), [accent])
  const lensColor = useMemo(() => new THREE.Color('#fff2d6'), [])

  useFrame((state, dt) => {
    const s = getMuseum()
    const dx = player.x - ex.position[0]
    const dz = player.z - ex.position[2]
    const d = Math.hypot(dx, dz)
    const sameSpace = ex.roomIndex === null ? s.location.zone === 'rotunda' : s.location.roomIndex === ex.roomIndex
    const target = s.started && sameSpace ? 1 : 0
    if (target && !litOnce.current) {
      litOnce.current = true
      setTimeout(audio.tick.bind(audio), ex.order * 140)
    }
    if (!target) {
      litOnce.current = false
      litAt.current = null
    } else if (litAt.current === null) {
      // Stagger switch-on so the track lights pop on one after another as you walk in.
      litAt.current = state.clock.elapsedTime + ex.order * 0.14
    }
    const rate = target ? 2.4 : 1.2
    if (!target || state.clock.elapsedTime >= (litAt.current ?? 0)) {
      on.current += (target - on.current) * Math.min(1, dt * rate)
    }
    const v = on.current
    m.screen.color.setScalar(t.screenBase + (1 - t.screenBase) * v)
    m.wash.opacity = t.wash * v
    m.cone.opacity = t.cone * v
    m.pool.opacity = (day ? 0 : 0.22) * v
    m.edge.color.copy(accentColor).multiplyScalar(0.08 + 2.6 * v)
    m.lens.color.copy(lensColor).multiplyScalar(0.05 + 4 * v)
    const focused = s.focused === ex.id
    m.ring.opacity = focused || s.tour.active ? 0 : v * ((day ? 0.55 : 0.35) + 0.25 * Math.sin(state.clock.elapsedTime * 2.4))
    if (ringRef.current) ringRef.current.scale.setScalar(1 + 0.06 * Math.sin(state.clock.elapsedTime * 2.4))
    const isNear = d < 11 && sameSpace
    if (isNear !== near) setNear(isNear)
  })

  const position: [number, number, number] = world ? ex.position : [ex.local!.lx, ex.local!.y, ex.local!.lz]
  const rotationY = world ? ex.rotationY : ex.local!.rotY
  const hit = { kind: 'exhibit', id: ex.id }
  const matBorder = day ? 0.14 : 0
  const plaqueX = w / 2 + 0.5 + matBorder
  const plaqueY = 1.38 - centerY

  return (
    <group position={position} rotation-y={rotationY} userData={hit}>
      {day ? (
        /* Soft shadow the hanging frame casts on the wall (skylight from above). */
        <mesh position={[0.04, -0.08, 0.006]} material={m.shadow} raycast={noRaycast}>
          <planeGeometry args={[(w + matBorder * 2) * 1.32, (h + matBorder * 2) * 1.38]} />
        </mesh>
      ) : (
        <mesh position={[0, 0.05, 0.012]} material={m.wash} raycast={noRaycast}>
          <planeGeometry args={[w * 2.3, h * 2.6]} />
        </mesh>
      )}
      {/* Frame (thin profile), mat (passe-partout by day), screen */}
      <mesh position={[0, 0, 0.04]} material={surface.frame} userData={hit}>
        <boxGeometry args={[w + matBorder * 2 + (day ? 0.06 : 0.16), h + matBorder * 2 + (day ? 0.06 : 0.16), 0.08]} />
      </mesh>
      {day && (
        <mesh position={[0, 0, 0.081]} material={surface.mat} userData={hit}>
          <planeGeometry args={[w + matBorder * 2, h + matBorder * 2]} />
        </mesh>
      )}
      <mesh position={[0, 0, 0.083]} material={m.screen} userData={hit}>
        <planeGeometry args={[w, h]} />
      </mesh>
      {!day &&
        [
          [0, h / 2 + 0.06, w + 0.12, 0.02],
          [0, -h / 2 - 0.06, w + 0.12, 0.02],
          [w / 2 + 0.06, 0, 0.02, h + 0.12],
          [-w / 2 - 0.06, 0, 0.02, h + 0.12],
        ].map(([x, y, sx, sy], i) => (
          <mesh key={i} position={[x, y, 0.086]} material={m.edge} raycast={noRaycast}>
            <boxGeometry args={[sx, sy, 0.012]} />
          </mesh>
        ))}

      {/* Track-light fixture (+ visible beam at night) */}
      <group position={spot.fixture.toArray()}>
        <mesh material={surface.frame} rotation-x={0.6}>
          <cylinderGeometry args={[0.07, 0.09, 0.26, 14]} />
        </mesh>
        <mesh position={[0, -0.12, 0.08]} rotation-x={0.6 + Math.PI / 2} material={m.lens} raycast={noRaycast}>
          <circleGeometry args={[0.07, 16]} />
        </mesh>
        {!day && <mesh geometry={spot.geo} quaternion={spot.quat} material={m.cone} raycast={noRaycast} renderOrder={2} />}
      </group>
      {!day && (
        <mesh position={[0, -centerY + 0.012, 0.9]} rotation-x={-Math.PI / 2} material={m.pool} raycast={noRaycast}>
          <planeGeometry args={[w * 1.3, 1.6]} />
        </mesh>
      )}

      {/* Plaque */}
      <group position={[plaqueX, plaqueY, 0.02]}>
        <mesh material={surface.plaque} userData={hit}>
          <boxGeometry args={[0.66, 0.44, 0.025]} />
        </mesh>
        <mesh position={[-0.33 + 0.012, 0, 0.014]} material={day ? neon(accent, 1) : m.edge} raycast={noRaycast}>
          <boxGeometry args={[0.008, 0.38, 0.004]} />
        </mesh>
        <Text font={FONTS.mono} fontSize={0.026} color={accent} anchorX="left" anchorY="top" position={[-0.28, 0.185, 0.015]} letterSpacing={0.08}>
          {`${ex.number}  /  ${caption.toUpperCase()}`}
        </Text>
        <Text font={FONTS.display} fontSize={0.056} color={t.ink} anchorX="left" anchorY="top" position={[-0.28, 0.14, 0.015]} maxWidth={0.56} lineHeight={1.05}>
          {project.title}
        </Text>
        <Text font={FONTS.body} fontSize={0.024} color={t.inkMuted} anchorX="left" anchorY="bottom" position={[-0.28, -0.18, 0.015]} maxWidth={0.56} lineHeight={1.35}>
          {`${project.year}${project.tech.length ? ' · ' + project.tech.slice(0, 4).join(', ') : ''}`}
        </Text>
      </group>

      {/* Floor marker: click to step up to the work */}
      <mesh ref={ringRef} position={[0, -centerY + 0.02, 2.1]} rotation-x={-Math.PI / 2} material={m.ring} userData={hit}>
        <ringGeometry args={[0.3, 0.38, 40]} />
      </mesh>
    </group>
  )
}
