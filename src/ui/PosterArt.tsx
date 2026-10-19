import type { CSSProperties } from 'react'
import type { Project } from '@/lib/types'

/**
 * HTML twin of the generated in-world poster, used until a real capture exists.
 * Colours come from the `.room-vars` CSS variables (see roomCssVars), so the same
 * static markup follows the day / night theme.
 */
export function PosterArt({ project, number, vars }: { project: Project; number: string; vars: CSSProperties }) {
  if (project.media.poster) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={project.media.poster} alt={`${project.title} screenshot`} className="aspect-[16/10] w-full object-cover object-top" />
    )
  }
  return (
    <div
      className="room-vars relative flex aspect-[16/10] w-full flex-col justify-between overflow-hidden p-5"
      style={{
        ...vars,
        background:
          'radial-gradient(circle at 85% 20%, color-mix(in oklab, var(--room) 32%, transparent), transparent 55%), radial-gradient(circle at 10% 95%, color-mix(in oklab, var(--room-2) 28%, transparent), transparent 50%), linear-gradient(135deg, var(--poster-1), var(--poster-2))',
      }}
      role="img"
      aria-label={`${project.title} artwork`}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-2/5 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(color-mix(in oklab, var(--room) 25%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--room) 25%, transparent) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          transform: 'perspective(200px) rotateX(45deg)',
          transformOrigin: 'bottom',
        }}
      />
      <p className="relative font-mono text-[10px] tracking-[0.25em]" style={{ color: 'var(--room)' }}>
        {number} — {project.category.toUpperCase()}
      </p>
      <div className="relative">
        <p className="font-display text-2xl leading-tight font-bold" style={{ color: 'var(--poster-ink)' }}>
          {project.title}
        </p>
        <p className="mt-1 line-clamp-2 text-xs" style={{ color: 'var(--poster-sub)' }}>
          {project.tagline}
        </p>
      </div>
    </div>
  )
}
