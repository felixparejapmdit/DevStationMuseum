'use client'
import Link from 'next/link'
import { motion } from 'motion/react'
import { ArrowRight, LayoutGrid, MousePointer2, Move, Route } from 'lucide-react'
import { site } from '@/site.config'
import { useMuseum } from '@/museum/store'
import type { InitialTarget } from './Museum'

export function Welcome({ onEnter, initial }: { onEnter: (tour?: boolean) => void; initial: InitialTarget }) {
  const ready = useMuseum((s) => s.sceneReady)
  const rooms = useMuseum((s) => s.rooms)
  const touch = useMuseum((s) => s.touch)
  const projects = useMuseum((s) => s.projects)
  const works = Object.keys(projects).length
  const target = initial.slug ? projects[initial.slug] : null
  const targetRoom = rooms.find((r) => r.id === initial.roomId)

  return (
    <motion.div
      className="absolute inset-0 z-40 flex items-end justify-center overflow-y-auto bg-gradient-to-t from-void via-void/70 to-void/20 p-4 sm:items-center sm:p-8"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <motion.section
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
        className="glass w-full max-w-xl rounded-3xl p-7 shadow-[0_30px_120px_-20px_rgba(34,225,255,0.25)] sm:p-10"
      >
        <p className="font-mono text-[11px] tracking-[0.35em] text-cyan">PORTFOLIO MUSEUM</p>
        <h2 id="welcome-title" className="mt-3 font-display text-4xl font-bold leading-[1.05] sm:text-5xl">
          <span className="neon-text text-magenta">{site.shortName}</span>
          <span className="mt-2 block text-ink">{site.museumName}</span>
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">{site.tagline}</p>

        <dl className="mt-6 grid grid-cols-3 gap-3 font-mono text-[11px] tracking-widest text-muted">
          {[
            [works, 'WORKS'],
            [rooms.length, 'ROOMS'],
            [new Set(rooms.map((r) => r.group)).size, 'COLLECTIONS'],
          ].map(([n, label]) => (
            <div key={label} className="rounded-xl border border-line bg-panel/60 px-3 py-2.5">
              <dt className="sr-only">{label}</dt>
              <dd>
                <span className="block font-display text-2xl font-semibold tracking-normal text-ink">{n}</span>
                {label}
              </dd>
            </div>
          ))}
        </dl>

        {(target || targetRoom) && (
          <p className="mt-5 rounded-xl border border-cyan/30 bg-cyan/5 px-4 py-3 text-sm text-ink">
            Your link opens {target ? <strong>{target.title}</strong> : <>the <strong>{targetRoom!.title}</strong> room</>}.
          </p>
        )}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={!ready}
            onClick={() => onEnter(false)}
            className="group inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-cyan px-6 py-3.5 font-semibold text-void shadow-[0_0_30px_rgba(34,225,255,0.45)] transition hover:shadow-[0_0_44px_rgba(34,225,255,0.7)] disabled:cursor-wait disabled:opacity-60"
          >
            {ready ? (target ? 'Enter at this work' : 'Enter the museum') : 'Opening the doors…'}
            <ArrowRight size={18} className="transition group-hover:translate-x-0.5" aria-hidden />
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => onEnter(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-panel-2/80 px-5 py-3.5 font-medium text-ink transition hover:border-magenta/60 disabled:opacity-50"
          >
            <Route size={17} aria-hidden /> Guided tour
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
          {touch ? (
            <>
              <span className="inline-flex items-center gap-1.5"><MousePointer2 size={14} aria-hidden /> Tap the floor to walk</span>
              <span className="inline-flex items-center gap-1.5"><Move size={14} aria-hidden /> Drag to look · joystick to stroll</span>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5"><MousePointer2 size={14} aria-hidden /> Click the floor to glide · drag to look</span>
              <span className="inline-flex items-center gap-1.5"><Move size={14} aria-hidden /> WASD to walk · Shift to run</span>
            </>
          )}
          <Link href="/projects" className="inline-flex items-center gap-1.5 underline-offset-4 hover:text-ink hover:underline">
            <LayoutGrid size={14} aria-hidden /> Browse in 2D
          </Link>
        </div>
        <p className="mt-4 text-[11px] text-muted/70">Sound on for the full experience. Headphones recommended.</p>
      </motion.section>
    </motion.div>
  )
}
