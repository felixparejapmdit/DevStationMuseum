'use client'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { useEffect, useRef, type MouseEvent } from 'react'
import { DIMS, locate, type MuseumLayout } from '@/museum/layout/layoutMuseum'
import { player } from '@/museum/player'
import { getMuseum, useMuseum } from '@/museum/store'
import { focusExhibit, goToPoint, goToRoom } from '@/museum/actions'
import { COLORS } from '@/museum/theme'

const { rotunda, hall, gallery, courtyard } = DIMS

/** Counter-rotation so labels stay upright when the plan is drawn landscape. */
const upright = (landscape: boolean, x: number, y: number) => (landscape ? `rotate(90 ${x} ${y})` : undefined)

function Plan({ layout, landscape, interactive }: { layout: MuseumLayout; landscape: boolean; interactive: boolean }) {
  const projects = useMuseum((s) => s.projects)
  const marker = useRef<SVGGElement>(null)

  useEffect(() => {
    let raf = 0
    const loop = () => {
      marker.current?.setAttribute('transform', `translate(${player.x} ${player.z}) rotate(${(-player.yaw * 180) / Math.PI})`)
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [])

  const click = (e: MouseEvent<SVGGElement>) => {
    if (!interactive) return
    const g = e.currentTarget
    const m = g.getScreenCTM()
    if (!m) return
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    const loc = locate(layout, p.x, p.y)
    const inCourtyard = p.x > courtyard.minX + 0.5 && p.x < courtyard.maxX - 0.5 && p.y > courtyard.minZ + 0.5 && p.y < courtyard.maxZ - 0.5
    if (loc.zone === 'courtyard' && !inCourtyard) return
    goToPoint(p.x, p.y, loc.zone === 'room' && loc.roomIndex !== null ? layout.rooms[loc.roomIndex].room.title : '')
  }

  const galleryLen = gallery.z0 - layout.galleryEndZ
  return (
    <g transform={landscape ? 'rotate(-90)' : undefined} onClick={click} className={interactive ? 'cursor-crosshair' : undefined}>
      {/* Courtyard */}
      <rect x={courtyard.minX} y={courtyard.minZ} width={32} height={28} fill="#0a0c15" stroke="#1d2238" strokeWidth={0.15} />
      <rect x={-12.5} y={13} width={6} height={18} fill="#0f1a1a" />
      <rect x={6.5} y={13} width={6} height={18} fill="#0f1a1a" />
      <rect x={-3} y={8} width={6} height={28} fill="#121524" />
      {/* Building */}
      <rect x={-hall.halfW} y={hall.z1} width={hall.halfW * 2} height={hall.z0 - hall.z1} fill="#101320" stroke="#2a3150" strokeWidth={0.15} />
      <circle cx={rotunda.cx} cy={rotunda.cz} r={rotunda.r} fill="#101320" stroke="#2a3150" strokeWidth={0.15} />
      <circle cx={rotunda.cx} cy={rotunda.cz} r={rotunda.sculptureR} fill="none" stroke={COLORS.violet} strokeWidth={0.12} />
      <rect x={-gallery.halfW} y={layout.galleryEndZ} width={gallery.halfW * 2} height={galleryLen} fill="#101320" stroke="#2a3150" strokeWidth={0.15} />
      {layout.rooms.map((r) => {
        const b = r.bounds
        return (
          <g
            key={r.room.id}
            onClick={(e) => {
              if (!interactive) return
              e.stopPropagation()
              goToRoom(r.index)
            }}
            className={interactive ? 'cursor-pointer' : undefined}
          >
            <rect x={b.minX} y={b.minZ} width={b.maxX - b.minX} height={b.maxZ - b.minZ} fill={r.room.accent + '14'} stroke={r.room.accent} strokeWidth={0.18} />
            <text
              x={r.center.x}
              y={r.center.z}
              transform={upright(landscape, r.center.x, r.center.z)}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={interactive ? 0.95 : 1.3}
              fill="#e8ebf5"
              className="font-display"
            >
              {r.room.title.length > 18 ? r.room.title.slice(0, 17) + '…' : r.room.title}
            </text>
            {r.exhibits.map((ex) => (
              <circle
                key={ex.id}
                cx={ex.position[0]}
                cy={ex.position[2]}
                r={0.42}
                fill={r.room.accent}
                className={interactive ? 'cursor-pointer' : undefined}
                onClick={(e) => {
                  if (!interactive) return
                  e.stopPropagation()
                  void focusExhibit(ex.id)
                }}
              >
                <title>{projects[ex.slug]?.title}</title>
              </circle>
            ))}
          </g>
        )
      })}
      {layout.featured && (
        <circle
          cx={layout.featured.position[0]}
          cy={layout.featured.position[2]}
          r={0.55}
          fill={COLORS.amber}
          className={interactive ? 'cursor-pointer' : undefined}
          onClick={(e) => {
            if (!interactive) return
            e.stopPropagation()
            void focusExhibit('featured')
          }}
        >
          <title>Featured: {projects[layout.featured.slug]?.title}</title>
        </circle>
      )}
      {interactive &&
        (
          [
            ['COURTYARD', 0, 22],
            ['ROTUNDA', 0, -18.5],
            ['ENTRANCE', 0, 1.5],
          ] as const
        ).map(([t, x, y]) => (
          <text key={t} x={x} y={y} transform={upright(landscape, x, y)} textAnchor="middle" fontSize={0.8} fill="#5e6684" letterSpacing={0.2} className="font-mono">
            {t}
          </text>
        ))}
      {/* You are here */}
      <g ref={marker}>
        <path d="M0 0 L-3.2 -7 A 7.6 7.6 0 0 1 3.2 -7 Z" fill={COLORS.cyan} opacity={0.14} />
        <circle r={1.5} fill={COLORS.cyan} opacity={0.18} />
        <path d="M0 -1 L0.75 0.75 L0 0.35 L-0.75 0.75 Z" fill={COLORS.cyan} stroke="#04050a" strokeWidth={0.1} />
      </g>
    </g>
  )
}

/** Small north-up map that follows the visitor; click to open the full plan. */
export function MiniMap() {
  const layout = useMuseum((s) => s.layout)
  const svg = useRef<SVGSVGElement>(null)
  useEffect(() => {
    let raf = 0
    const loop = () => {
      svg.current?.setAttribute('viewBox', `${player.x - 17} ${player.z - 17} 34 34`)
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [])
  if (!layout) return null
  return (
    <button
      type="button"
      onClick={() => getMuseum().set({ overlay: 'map' })}
      className="glass block size-40 overflow-hidden rounded-2xl transition hover:border-cyan/40"
      aria-label="Open the floor plan"
      title="Floor plan (M)"
    >
      <svg ref={svg} className="size-full" viewBox="0 0 34 34" aria-hidden>
        <Plan layout={layout} landscape={false} interactive={false} />
      </svg>
    </button>
  )
}

export function MapOverlay() {
  const open = useMuseum((s) => s.overlay === 'map')
  const layout = useMuseum((s) => s.layout)
  const location = useMuseum((s) => s.location)
  const close = () => getMuseum().set({ overlay: null })
  if (!layout) return null
  const z0 = layout.galleryEndZ - 2
  const length = courtyard.maxZ + 1 - z0

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-50 flex items-center justify-center bg-void/70 p-3 backdrop-blur-sm sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="Floor plan"
        >
          <motion.div
            initial={{ scale: 0.97, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, y: 10 }}
            className="glass flex h-full max-h-[52rem] w-full max-w-6xl flex-col overflow-hidden rounded-3xl md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            <aside className="scrollbar-thin flex max-h-56 shrink-0 flex-col overflow-y-auto border-b border-line p-5 md:max-h-none md:w-72 md:border-r md:border-b-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.3em] text-cyan">FLOOR PLAN</p>
                  <h2 className="mt-1 font-display text-2xl font-semibold">Where to?</h2>
                </div>
                <button type="button" onClick={close} className="rounded-full p-2 text-muted hover:bg-white/5 hover:text-ink" aria-label="Close floor plan">
                  <X size={18} />
                </button>
              </div>
              <p className="mt-2 text-xs text-muted">Pick a room, tap a dot to view a work, or click anywhere on the plan to go there.</p>
              <ol className="mt-4 space-y-1.5">
                {layout.rooms.map((r) => (
                  <li key={r.room.id}>
                    <button
                      type="button"
                      onClick={() => goToRoom(r.index)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-white/5 ${
                        location.roomIndex === r.index ? 'bg-white/5 ring-1 ring-white/10' : ''
                      }`}
                    >
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: r.room.accent, boxShadow: `0 0 10px ${r.room.accent}` }} />
                      <span className="min-w-0 flex-1 truncate">{r.room.title}</span>
                      <span className="font-mono text-[11px] text-muted">{r.exhibits.length}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </aside>
            <div className="relative min-h-0 flex-1 p-3">
              <svg className="hidden size-full md:block" viewBox={`${z0} -17 ${length} 34`} preserveAspectRatio="xMidYMid meet">
                <Plan layout={layout} landscape interactive />
              </svg>
              <svg className="size-full md:hidden" viewBox={`-17 ${z0} 34 ${length}`} preserveAspectRatio="xMidYMid meet">
                <Plan layout={layout} landscape={false} interactive />
              </svg>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
