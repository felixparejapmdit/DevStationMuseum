import type { Metadata } from 'next'
import Link from 'next/link'
import { getMuseumData } from '@/lib/content'
import { site } from '@/site.config'
import { PosterArt } from '@/ui/PosterArt'

export const metadata: Metadata = {
  title: 'The collection',
  description: `Every work on display in ${site.museumName}, room by room.`,
}

export default function ProjectsPage() {
  const { rooms, projects } = getMuseumData()
  let n = 0
  return (
    <main className="mx-auto max-w-6xl px-4 pt-10 pb-24 sm:px-8">
      <header className="flex flex-col gap-6 border-b border-line pb-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] tracking-[0.35em] text-cyan">{site.museumName.toUpperCase()}</p>
          <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">
            The collection <span className="text-muted">· {projects.length} works</span>
          </h1>
          <p className="mt-3 max-w-xl text-muted">{site.tagline}</p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-cyan px-5 py-3 text-sm font-semibold text-void shadow-[0_0_30px_rgba(34,225,255,0.4)]"
        >
          Walk through the museum →
        </Link>
      </header>

      {rooms.map((room, ri) => (
        <section key={room.id} className="mt-14" aria-labelledby={`room-${room.id}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] tracking-[0.3em] text-muted">ROOM {String(ri + 1).padStart(2, '0')}</p>
              <h2 id={`room-${room.id}`} className="mt-1 font-display text-2xl font-semibold" style={{ color: room.accent }}>
                {room.title}
              </h2>
              <p className="mt-1 text-sm text-muted">{room.subtitle}</p>
            </div>
            <Link href={`/museum/${room.id}`} className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
              Visit this room in 3D
            </Link>
          </div>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {room.projects.map((p) => {
              n += 1
              const number = String(n).padStart(2, '0')
              return (
                <li key={p.slug}>
                  <Link
                    href={`/projects/${p.slug}`}
                    className="group block overflow-hidden rounded-2xl border border-line bg-panel transition hover:-translate-y-0.5"
                    style={{ ['--accent' as string]: room.accent }}
                  >
                    <div className="overflow-hidden transition group-hover:shadow-[0_0_40px_-10px_var(--accent)]">
                      <PosterArt project={p} accent={room.accent} secondary={room.secondary} number={number} />
                    </div>
                    <div className="p-4">
                      <h3 className="font-display text-lg font-semibold">{p.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted">{p.tagline}</p>
                      <p className="mt-3 truncate font-mono text-[11px] text-muted/80">{p.tech.slice(0, 4).join(' · ')}</p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </main>
  )
}
