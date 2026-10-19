'use client'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronLeft, ChevronRight, CodeXml, Copy, ExternalLink, Eye, X } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useEffect, useRef, useState } from 'react'
import { useMuseum } from '@/museum/store'
import { roomColors, roomCssVars } from '@/museum/theme'
import { closeFocus, pathFor, stepExhibit } from '@/museum/actions'
import { PosterArt } from './PosterArt'

export function ExhibitPanel() {
  const focused = useMuseum((s) => s.focused)
  const layout = useMuseum((s) => s.layout)
  const projects = useMuseum((s) => s.projects)
  const rooms = useMuseum((s) => s.rooms)
  const touring = useMuseum((s) => s.tour.active)
  const theme = useMuseum((s) => s.theme)
  const ex = focused && layout ? layout.exhibits[focused] : null
  const project = ex ? projects[ex.slug] : null
  const roomIndex = ex ? (ex.roomIndex ?? rooms.findIndex((r) => r.projects.some((p) => p.slug === ex.slug))) : -1
  const room = roomIndex >= 0 ? rooms[roomIndex] : null
  const [preview, setPreview] = useState(false)
  const [copied, setCopied] = useState(false)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setPreview(false)
    setCopied(false)
    if (focused) panel.current?.focus({ preventScroll: true })
  }, [focused])

  const copyLink = async () => {
    if (!ex) return
    try {
      await navigator.clipboard.writeText(window.location.origin + pathFor(roomIndex, ex.slug))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {}
  }

  const accent = room ? roomColors(room, theme).accent : 'var(--color-primary)'
  const day = theme === 'day'

  return (
    <AnimatePresence>
      {ex && project && (
        <motion.aside
          key={ex.id}
          ref={panel}
          tabIndex={-1}
          role="dialog"
          aria-label={`${project.title} details`}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
          className="glass scrollbar-thin absolute inset-x-2 bottom-2 z-30 max-h-[48dvh] overflow-y-auto rounded-3xl outline-none sm:inset-x-auto sm:top-20 sm:right-4 sm:bottom-4 sm:max-h-none sm:w-[26rem]"
          style={day ? undefined : { boxShadow: `0 0 60px -20px ${accent}` }}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-line bg-panel/80 px-5 py-3 backdrop-blur-md">
            <p className="truncate font-mono text-[10px] tracking-[0.28em]" style={{ color: accent }}>
              {ex.number} / {room?.title.toUpperCase() ?? project.category.toUpperCase()}
            </p>
            <div className="flex items-center gap-1">
              {!touring && (
                <>
                  <button type="button" onClick={() => stepExhibit(-1)} className="rounded-full p-2 text-muted hover:bg-ink/5 hover:text-ink" aria-label="Previous work">
                    <ChevronLeft size={17} />
                  </button>
                  <button type="button" onClick={() => stepExhibit(1)} className="rounded-full p-2 text-muted hover:bg-ink/5 hover:text-ink" aria-label="Next work">
                    <ChevronRight size={17} />
                  </button>
                </>
              )}
              <button type="button" onClick={closeFocus} className="rounded-full p-2 text-muted hover:bg-ink/5 hover:text-ink" aria-label="Close (Esc)">
                <X size={17} />
              </button>
            </div>
          </div>

          <div className="p-5">
            <div className="overflow-hidden rounded-2xl border border-line">
              {preview && project.links.live ? (
                <iframe
                  src={project.links.live}
                  title={`${project.title} live preview`}
                  className="aspect-[16/10] w-full bg-white"
                  loading="lazy"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              ) : project.media.loop ? (
                <video src={project.media.loop} poster={project.media.poster} className="aspect-[16/10] w-full object-cover object-top" autoPlay muted loop playsInline />
              ) : (
                <PosterArt project={project} number={ex.number} vars={room ? roomCssVars(room) : {}} />
              )}
            </div>

            <h2 className="mt-5 font-display text-3xl leading-tight font-semibold">{project.title}</h2>
            {project.tagline && <p className="mt-2 text-[15px] leading-relaxed text-ink/85">{project.tagline}</p>}

            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="font-mono tracking-widest text-muted">YEAR</dt>
                <dd className="mt-0.5 text-ink">{project.year}</dd>
              </div>
              <div>
                <dt className="font-mono tracking-widest text-muted">ROLE</dt>
                <dd className="mt-0.5 text-ink">{project.role || '—'}</dd>
              </div>
            </dl>

            {project.tech.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Technology">
                {project.tech.map((t) => (
                  <li key={t} className="rounded-full border px-2.5 py-1 font-mono text-[11px] text-ink/90" style={{ borderColor: `color-mix(in oklab, ${accent} 35%, transparent)` }}>
                    {t}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              {project.links.live ? (
                <a
                  href={project.links.live}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white"
                  style={{ background: accent, color: day ? '#ffffff' : '#04050a', boxShadow: day ? undefined : `0 0 24px ${accent}66` }}
                >
                  Visit live site <ExternalLink size={15} aria-hidden />
                </a>
              ) : (
                <span className="inline-flex items-center rounded-full border border-dashed border-line px-4 py-2.5 text-sm text-muted">Live link coming soon</span>
              )}
              {project.links.live && project.allowEmbed && (
                <button
                  type="button"
                  onClick={() => setPreview((v) => !v)}
                  aria-pressed={preview}
                  className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm hover:border-ink/30"
                >
                  <Eye size={15} aria-hidden /> {preview ? 'Show capture' : 'Live preview'}
                </button>
              )}
              {project.links.repo && (
                <a href={project.links.repo} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm hover:border-ink/30">
                  <CodeXml size={15} aria-hidden /> Source
                </a>
              )}
              <button type="button" onClick={copyLink} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm hover:border-ink/30">
                {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />} {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>

            {project.body && (
              <div className="prose-museum mt-5 border-t border-line pt-4 text-sm">
                <Markdown remarkPlugins={[remarkGfm]}>{project.body}</Markdown>
              </div>
            )}

            {project.media.gallery.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-2">
                {project.media.gallery.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={src} src={src} alt="" loading="lazy" className="aspect-video w-full rounded-xl border border-line object-cover" />
                ))}
              </div>
            )}

            <p className="mt-6 font-mono text-[10px] tracking-widest text-muted">
              ESC CLOSE · ← → BROWSE{' '}
            </p>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
