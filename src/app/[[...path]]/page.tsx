import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getMuseumData } from '@/lib/content'
import { site } from '@/site.config'
import { Museum, type InitialTarget } from '@/ui/Museum'

export const dynamicParams = false

type Params = { params: Promise<{ path?: string[] }> }

/** `/` is the courtyard; `/museum/<room>` and `/museum/<room>/<slug>` are deep links into the building. */
function resolve(path: string[] = []): InitialTarget | null {
  if (path.length === 0) return {}
  const [first, roomId, slug] = path
  if (first !== 'museum' || path.length > 3) return null
  const { rooms } = getMuseumData()
  const room = rooms.find((r) => r.id === roomId)
  if (!room) return null
  if (slug && !room.projects.some((p) => p.slug === slug)) return null
  return { roomId, slug }
}

export function generateStaticParams() {
  const { rooms } = getMuseumData()
  return [
    { path: [] as string[] },
    ...rooms.flatMap((r) => [{ path: ['museum', r.id] }, ...r.projects.map((p) => ({ path: ['museum', r.id, p.slug] }))]),
  ]
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const target = resolve((await params).path)
  if (!target?.roomId) return {}
  const { rooms } = getMuseumData()
  const room = rooms.find((r) => r.id === target.roomId)!
  const project = target.slug ? room.projects.find((p) => p.slug === target.slug) : null
  if (project) {
    return {
      title: project.title,
      description: project.tagline,
      alternates: { canonical: `/projects/${project.slug}` },
      openGraph: { title: `${project.title} — ${site.museumName}`, description: project.tagline, images: [`/projects/${project.slug}/opengraph-image`] },
    }
  }
  return { title: room.title, description: room.subtitle }
}

export default async function MuseumPage({ params }: Params) {
  const initial = resolve((await params).path)
  if (!initial) notFound()
  const { projects, rooms } = getMuseumData()
  return (
    <>
      <Museum projects={projects} rooms={rooms} initial={initial} />
      {/* Plain links for search engines and screen-reader users who skip the 3D view. */}
      <nav className="sr-only" aria-label="All works">
        <Link href="/projects">Browse the collection in 2D</Link>
        <ul>
          {projects.map((p) => (
            <li key={p.slug}>
              <Link href={`/projects/${p.slug}`}>{p.title}</Link>: {p.tagline}
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
