'use client'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Project } from '@/lib/types'
import type { GeneratedRoom } from '@/museum/layout/buildRooms'
import { layoutMuseum, locate, nearRoomsFor } from '@/museum/layout/layoutMuseum'
import { buildTour } from '@/museum/layout/tour'
import { getMuseum, useMuseum } from '@/museum/store'
import { setPose } from '@/museum/player'
import { audio } from '@/museum/audio'
import { closeFocus, focusExhibit, goToEntrance, goToRoom, startTour, stopTour, toggleMute } from '@/museum/actions'
import { Welcome } from './Welcome'
import { Hud } from './Hud'
import { ExhibitPanel } from './ExhibitPanel'
import { MapOverlay } from './FloorPlan'
import { CommandPalette } from './CommandPalette'
import { HelpDialog } from './HelpDialog'
import { DoorTransition } from './DoorTransition'
import { TouchJoystick } from './TouchJoystick'
import { TourBar } from './TourBar'

const MuseumCanvas = dynamic(() => import('@/museum/MuseumCanvas'), { ssr: false })

export type InitialTarget = { roomId?: string; slug?: string }

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/** Reads /museum/<room>/<slug> and moves the visitor there. */
function applyPath(pathname: string, opts: { animate: boolean }) {
  const s = getMuseum()
  if (!s.layout) return
  const [, first, roomId, slug] = pathname.split('/')
  if (first !== 'museum') {
    if (s.focused) closeFocus()
    if (opts.animate) goToEntrance()
    return
  }
  const roomIndex = s.rooms.findIndex((r) => r.id === roomId)
  if (slug && s.layout.exhibits[slug]) void focusExhibit(slug, { push: false })
  else if (roomIndex >= 0) {
    if (s.focused) closeFocus()
    // Already standing in that room (e.g. Back out of a work): just close the panel.
    if (s.location.roomIndex !== roomIndex) goToRoom(roomIndex)
  }
}

export function Museum({ projects, rooms, initial }: { projects: Project[]; rooms: GeneratedRoom[]; initial: InitialTarget }) {
  const [webgl, setWebgl] = useState<boolean | null>(null)
  const started = useMuseum((s) => s.started)
  const layoutReady = useMuseum((s) => !!s.layout)

  // One-time setup: layout, initial pose, device capabilities, preferences.
  useEffect(() => {
    const layout = layoutMuseum(rooms)
    const touch = window.matchMedia('(pointer: coarse)').matches
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const weak = (navigator.hardwareConcurrency ?? 8) <= 4
    let muted = false
    let qualitySetting: 'auto' | 'low' | 'medium' | 'high' = 'auto'
    try {
      muted = localStorage.getItem('museum:muted') === '1'
      qualitySetting = (localStorage.getItem('museum:quality') as typeof qualitySetting) || 'auto'
    } catch {}
    const tier = qualitySetting !== 'auto' ? qualitySetting : touch || weak ? 'medium' : 'high'

    const roomIndex = rooms.findIndex((r) => r.id === initial.roomId)
    const target = initial.slug ? layout.exhibits[initial.slug] : null
    const pose = target ? target.focus : roomIndex >= 0 ? layout.rooms[roomIndex].entry : layout.spawn
    setPose(pose)

    getMuseum().set({
      rooms,
      layout,
      projects: Object.fromEntries(projects.map((p) => [p.slug, p])),
      tourSteps: buildTour(layout),
      touch,
      reducedMotion,
      tier,
      qualitySetting,
      muted,
      mode: 'glide',
      location: locate(layout, pose.x, pose.z),
      nearRooms: nearRoomsFor(layout, pose.x, pose.z),
    })
    setWebgl(hasWebGL())
  }, [projects, rooms, initial])

  // Small automation hook for end-to-end tests and screenshots.
  useEffect(() => {
    ;(window as unknown as { __museum: unknown }).__museum = {
      teleport: (x: number, z: number, yaw = 0, pitch = 0) => {
        const s = getMuseum()
        setPose({ x, z, yaw, pitch })
        if (s.layout) s.set({ location: locate(s.layout, x, z), nearRooms: nearRoomsFor(s.layout, x, z) })
      },
      room: (i: number) => goToRoom(i),
      focus: (id: string) => focusExhibit(id),
      info: () => {
        const s = getMuseum()
        return { location: s.location, nearRooms: s.nearRooms, tier: s.tier, focused: s.focused, rooms: s.rooms.length }
      },
    }
  }, [])

  // Browser back / forward.
  useEffect(() => {
    const onPop = () => applyPath(window.location.pathname, { animate: true })
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Pause audio in background tabs.
  useEffect(() => {
    const onVis = () => (document.hidden ? audio.suspend() : getMuseum().started && audio.resume())
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Global shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return
      const s = getMuseum()
      if (!s.started) return
      const k = e.key.toLowerCase()
      if ((e.metaKey || e.ctrlKey) && k === 'k') {
        e.preventDefault()
        s.set({ overlay: s.overlay === 'search' ? null : 'search' })
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (k === 'escape') {
        if (s.overlay) s.set({ overlay: null })
        else if (s.focused) closeFocus()
        else if (s.tour.active) stopTour()
        else if (document.pointerLockElement) document.exitPointerLock()
        return
      }
      if (s.overlay === 'search') return
      if (k === 'm') s.set({ overlay: s.overlay === 'map' ? null : 'map' })
      else if (k === '/' ) {
        e.preventDefault()
        s.set({ overlay: 'search' })
      } else if (k === '?' || k === 'h') s.set({ overlay: s.overlay === 'help' ? null : 'help' })
      else if (k === 't') (s.tour.active ? stopTour() : void startTour())
      else if (k === 'n' && !s.focused) toggleMute()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const enter = (tour = false) => {
    const s = getMuseum()
    audio.start()
    audio.mute(s.muted)
    s.set({ started: true })
    document.querySelector('canvas')?.focus({ preventScroll: true })
    if (tour) void startTour()
    else if (initial.slug && s.layout?.exhibits[initial.slug]) void focusExhibit(initial.slug, { push: false })
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-void select-none" aria-label="The Neon Archive, a walk-through portfolio museum">
      <h1 className="sr-only">Portfolio museum</h1>
      {webgl && layoutReady && <MuseumCanvas />}
      {webgl === false && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <div className="glass max-w-md rounded-2xl p-8">
            <h2 className="font-display text-2xl font-semibold">The 3D museum needs WebGL</h2>
            <p className="mt-3 text-sm text-muted">This browser or device can&apos;t render the gallery. Every work is also on display in the 2D archive.</p>
            <Link href="/projects" className="mt-6 inline-flex rounded-full bg-cyan px-5 py-2.5 text-sm font-semibold text-void">
              Browse the collection
            </Link>
          </div>
        </div>
      )}
      {webgl && (
        <>
          {started && <Hud />}
          {started && <TouchJoystick />}
          <ExhibitPanel />
          <TourBar />
          <MapOverlay />
          <CommandPalette />
          <HelpDialog />
          <DoorTransition />
          {!started && <Welcome onEnter={enter} initial={initial} />}
        </>
      )}
    </main>
  )
}
