import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getMuseumData } from '@/lib/content'
import { site } from '@/site.config'
import { PosterArt } from '@/ui/PosterArt'
import { roomCssVars } from '@/museum/theme'

export const dynamicParams = false
type Params = { params: Promise<{ slug: string }> }

function find(slug: string) {
  const { rooms } = getMuseumData()
  let n = 0
  for (const room of rooms) {
    for (const p of room.projects) {
      n += 1
      if (p.slug === slug) return { project: p, room, number: String(n).padStart(2, '0') }
    }
  }
  return null
}

export function generateStaticParams() {
  return getMuseumData().projects.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const hit = find((await params).slug)
  if (!hit) return {}
  return { title: hit.project.title, description: hit.project.tagline }
}

export default async function ProjectPage({ params }: Params) {
  const hit = find((await params).slug)
  if (!hit) notFound()
  const { project: p, room, number } = hit
  return (
    <main className="room-vars mx-auto max-w-4xl px-4 pt-8 pb-24 sm:px-8" style={roomCssVars(room)}>
      <nav className="flex items-center justify-between text-sm text-muted">
        <Link href="/projects" className="hover:text-ink">← The collection</Link>
        <Link href={`/museum/${room.id}/${p.slug}`} className="rounded-full border border-line px-4 py-2 text-ink hover:border-ink/30">
          See it in the museum
        </Link>
      </nav>
      <p className="mt-10 font-mono text-[11px] tracking-[0.3em]" style={{ color: 'var(--room)' }}>
        {number} / {room.title.toUpperCase()}
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">{p.title}</h1>
      {p.tagline && <p className="mt-3 text-lg text-ink/80">{p.tagline}</p>}
      <div className="mt-8 overflow-hidden rounded-3xl border border-line" style={{ boxShadow: '0 30px 80px -40px var(--room)' }}>
        {p.media.loop ? (
          <video src={p.media.loop} poster={p.media.poster} className="aspect-[16/10] w-full object-cover object-top" autoPlay muted loop playsInline />
        ) : (
          <PosterArt project={p} number={number} vars={roomCssVars(room)} />
        )}
      </div>
      <div className="mt-8 grid gap-10 md:grid-cols-[1fr_15rem]">
        <article className="prose-museum">
          <Markdown remarkPlugins={[remarkGfm]}>{p.body}</Markdown>
        </article>
        <aside className="space-y-5 text-sm">
          <div>
            <p className="font-mono text-[10px] tracking-widest text-muted">YEAR</p>
            <p className="mt-1">{p.year}</p>
          </div>
          {p.role && (
            <div>
              <p className="font-mono text-[10px] tracking-widest text-muted">ROLE</p>
              <p className="mt-1">{p.role}</p>
            </div>
          )}
          {p.tech.length > 0 && (
            <div>
              <p className="font-mono text-[10px] tracking-widest text-muted">TECHNOLOGY</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {p.tech.map((t) => (
                  <li key={t} className="rounded-full border border-line px-2.5 py-1 font-mono text-[11px]">{t}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {p.links.live && (
              <a href={p.links.live} target="_blank" rel="noreferrer" className="rounded-full bg-primary px-4 py-2.5 text-center font-semibold text-(--on-primary)">
                Visit live site ↗
              </a>
            )}
            {p.links.repo && (
              <a href={p.links.repo} target="_blank" rel="noreferrer" className="rounded-full border border-line px-4 py-2.5 text-center hover:border-ink/30">
                Source code ↗
              </a>
            )}
          </div>
        </aside>
      </div>
      <p className="mt-16 text-xs text-muted">{site.name} · {site.museumName}</p>
    </main>
  )
}
