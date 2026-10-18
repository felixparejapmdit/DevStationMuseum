import type { Project } from '@/lib/types'

/** HTML twin of the generated in-world poster, used until a real capture exists. */
export function PosterArt({ project, accent, secondary, number }: { project: Project; accent: string; secondary: string; number: string }) {
  if (project.media.poster) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={project.media.poster} alt={`${project.title} screenshot`} className="aspect-[16/10] w-full object-cover object-top" />
    )
  }
  return (
    <div
      className="relative flex aspect-[16/10] w-full flex-col justify-between overflow-hidden p-5"
      style={{
        background: `radial-gradient(circle at 85% 20%, ${accent}55, transparent 55%), radial-gradient(circle at 10% 95%, ${secondary}44, transparent 50%), linear-gradient(135deg, #06070d, #0d0f1a)`,
      }}
      role="img"
      aria-label={`${project.title} artwork`}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-2/5 opacity-40"
        style={{
          backgroundImage: `linear-gradient(${accent}33 1px, transparent 1px), linear-gradient(90deg, ${accent}33 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
          transform: 'perspective(200px) rotateX(45deg)',
          transformOrigin: 'bottom',
        }}
      />
      <p className="relative font-mono text-[10px] tracking-[0.25em]" style={{ color: accent }}>
        {number} — {project.category.toUpperCase()}
      </p>
      <div className="relative">
        <p className="font-display text-2xl leading-tight font-bold text-white">{project.title}</p>
        <p className="mt-1 line-clamp-2 text-xs text-white/60">{project.tagline}</p>
      </div>
    </div>
  )
}
