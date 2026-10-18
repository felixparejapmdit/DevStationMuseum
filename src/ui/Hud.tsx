'use client'
import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { CircleHelp, Footprints, Gauge, LayoutGrid, Map as MapIcon, MousePointer2, Route, Search, Volume2, VolumeX } from 'lucide-react'
import type { ReactNode } from 'react'
import { site } from '@/site.config'
import { getMuseum, useMuseum } from '@/museum/store'
import { goToEntrance, setMode, showHint, startTour, stopTour, toggleMute } from '@/museum/actions'
import { MiniMap } from './FloorPlan'

export function IconButton({
  label,
  shortcut,
  onClick,
  active,
  children,
  href,
  secondary,
}: {
  label: string
  shortcut?: string
  onClick?: () => void
  active?: boolean
  children: ReactNode
  href?: string
  /** Hidden on phones to keep the toolbar to one short row. */
  secondary?: boolean
}) {
  const cls = `group relative ${secondary ? 'hidden sm:grid' : 'grid'} size-10 place-items-center rounded-full border transition ${
    active ? 'border-cyan/70 bg-cyan/15 text-cyan' : 'border-white/10 bg-panel/70 text-ink hover:border-white/25 hover:bg-panel-2'
  } backdrop-blur-md`
  const tip = (
    <span className="pointer-events-none absolute top-full right-0 mt-2 hidden whitespace-nowrap rounded-md bg-panel-2 px-2 py-1 text-[11px] text-ink shadow-lg group-hover:block group-focus-visible:block">
      {label}
      {shortcut && <kbd className="ml-1.5 font-mono text-muted">{shortcut}</kbd>}
    </span>
  )
  if (href)
    return (
      <Link href={href} className={cls} aria-label={label}>
        {children}
        {tip}
      </Link>
    )
  return (
    <button type="button" className={cls} aria-label={label} aria-pressed={active} onClick={onClick}>
      {children}
      {tip}
    </button>
  )
}

const ZONE_LABEL = { courtyard: 'Courtyard', entrance: 'Entrance Hall', rotunda: 'Rotunda', gallery: 'Grand Gallery', room: 'Room' } as const
const QUALITY_CYCLE = ['auto', 'high', 'medium', 'low'] as const
let hinted = false

export function Hud() {
  const location = useMuseum((s) => s.location)
  const rooms = useMuseum((s) => s.rooms)
  const mode = useMuseum((s) => s.mode)
  const muted = useMuseum((s) => s.muted)
  const tour = useMuseum((s) => s.tour)
  const overlay = useMuseum((s) => s.overlay)
  const quality = useMuseum((s) => s.qualitySetting)
  const tier = useMuseum((s) => s.tier)
  const hint = useMuseum((s) => s.hint)
  const locked = useMuseum((s) => s.pointerLocked)
  const touch = useMuseum((s) => s.touch)
  const focused = useMuseum((s) => s.focused)

  // First-visit hint, once per page load.
  useEffect(() => {
    if (hinted) return
    hinted = true
    const t = setTimeout(
      () =>
        showHint(
          touch
            ? 'Tap the floor to walk · drag to look around · tap a work to view it'
            : 'Click the floor to glide · drag to look · WASD to walk · click a work to view it',
          5200,
        ),
      1600,
    )
    return () => clearTimeout(t)
  }, [touch])

  const crumbs: string[] =
    location.zone === 'room' && location.roomIndex !== null
      ? ['Grand Gallery', rooms[location.roomIndex]?.title ?? 'Room']
      : [ZONE_LABEL[location.zone]]

  const cycleQuality = () => {
    const next = QUALITY_CYCLE[(QUALITY_CYCLE.indexOf(quality) + 1) % QUALITY_CYCLE.length]
    const s = getMuseum()
    s.set({ qualitySetting: next, tier: next === 'auto' ? (s.touch ? 'medium' : 'high') : next })
    try {
      localStorage.setItem('museum:quality', next)
    } catch {}
    showHint(`Visual quality: ${next === 'auto' ? 'automatic' : next}`)
  }

  return (
    <>
      {/* Brand + breadcrumb */}
      <div className="pointer-events-none absolute top-0 left-0 z-20 p-4 sm:p-5">
        <div className="pointer-events-auto flex items-center gap-3">
          <button
            type="button"
            onClick={goToEntrance}
            className="grid size-10 place-items-center rounded-full border border-magenta/50 bg-panel/70 font-display text-sm font-bold text-magenta backdrop-blur-md transition hover:shadow-[0_0_24px_rgba(255,61,166,0.5)]"
            aria-label="Return to the courtyard entrance"
            title="Return to entrance"
          >
            FP
          </button>
          <nav aria-label="You are here" className="hidden sm:block">
            <p className="font-mono text-[10px] tracking-[0.3em] text-muted">{site.museumName.toUpperCase()}</p>
            <ol className="flex items-center gap-1.5 text-sm text-ink">
              {crumbs.map((c, i) => (
                <li key={c} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-muted">›</span>}
                  <span className={i === crumbs.length - 1 ? 'font-medium' : 'text-muted'}>{c}</span>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>

      {/* Toolbar */}
      <div className="absolute top-0 right-0 z-20 flex flex-wrap justify-end gap-2 p-4 sm:p-5" role="toolbar" aria-label="Museum controls">
        <IconButton label="Search works" shortcut="Ctrl K" onClick={() => getMuseum().set({ overlay: 'search' })} active={overlay === 'search'}>
          <Search size={17} />
        </IconButton>
        <IconButton label="Floor plan" shortcut="M" onClick={() => getMuseum().set({ overlay: overlay === 'map' ? null : 'map' })} active={overlay === 'map'}>
          <MapIcon size={17} />
        </IconButton>
        <IconButton label={tour.active ? 'End guided tour' : 'Guided tour'} shortcut="T" onClick={() => (tour.active ? stopTour() : void startTour())} active={tour.active}>
          <Route size={17} />
        </IconButton>
        {!touch && (
          <IconButton
            label={mode === 'glide' ? 'Switch to free walk (mouse look)' : 'Switch to click-to-glide'}
            onClick={() => {
              const next = mode === 'glide' ? 'walk' : 'glide'
              setMode(next)
              showHint(next === 'walk' ? 'Free walk: click to capture the mouse, WASD to move, Esc to release.' : 'Glide: click the floor to move, drag to look.', 4200)
            }}
            active={mode === 'walk'}
          >
            {mode === 'glide' ? <MousePointer2 size={17} /> : <Footprints size={17} />}
          </IconButton>
        )}
        <IconButton label={muted ? 'Unmute ambience' : 'Mute ambience'} shortcut="N" onClick={toggleMute} active={!muted}>
          {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </IconButton>
        <IconButton secondary label={`Quality: ${quality === 'auto' ? `auto (${tier})` : quality}`} onClick={cycleQuality}>
          <Gauge size={17} />
        </IconButton>
        <IconButton secondary label="Browse in 2D" href="/projects">
          <LayoutGrid size={17} />
        </IconButton>
        <IconButton secondary label="Help & controls" shortcut="?" onClick={() => getMuseum().set({ overlay: 'help' })} active={overlay === 'help'}>
          <CircleHelp size={17} />
        </IconButton>
      </div>

      {/* Mini map */}
      {!focused && (
        <div className="absolute right-4 bottom-4 z-20 hidden sm:block">
          <MiniMap />
        </div>
      )}

      {/* Crosshair in pointer-lock walk mode */}
      {locked && !focused && (
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 size-1.5 -translate-1/2 rounded-full bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
      )}

      {/* Hints */}
      <div className="pointer-events-none absolute inset-x-0 bottom-24 z-30 flex justify-center px-4 sm:bottom-8">
        <AnimatePresence>
          {hint && (
            <motion.p
              key={hint}
              role="status"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="glass rounded-full px-4 py-2 text-center text-sm text-ink"
            >
              {hint}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
