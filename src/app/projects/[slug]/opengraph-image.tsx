import { ImageResponse } from 'next/og'
import { getMuseumData } from '@/lib/content'
import { site } from '@/site.config'
import { roomColors } from '@/museum/theme'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export function generateStaticParams() {
  return getMuseumData().projects.map((p) => ({ slug: p.slug }))
}

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { rooms } = getMuseumData()
  const room = rooms.find((r) => r.projects.some((p) => p.slug === slug))
  const project = room?.projects.find((p) => p.slug === slug)
  const accent = room ? roomColors(room, 'day').accent : '#2447d6'
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: `radial-gradient(circle at 85% 15%, ${accent}55, transparent 55%), linear-gradient(135deg, #f7f5f0, #e9e4da)`, color: '#1d1f24' }}>
        <div style={{ fontSize: 24, letterSpacing: 8, color: accent }}>{(room?.title ?? 'THE COLLECTION').toUpperCase()}</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 84, fontWeight: 700 }}>{project?.title ?? 'Project'}</div>
          <div style={{ fontSize: 30, marginTop: 16, color: '#4a4f59', maxWidth: 980 }}>{project?.tagline ?? ''}</div>
        </div>
        <div style={{ fontSize: 24, color: '#686d78' }}>{`${site.name} · ${site.museumName}`}</div>
      </div>
    ),
    size,
  )
}
