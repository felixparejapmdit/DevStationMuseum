import type { MetadataRoute } from 'next'
import { getMuseumData } from '@/lib/content'
import { site } from '@/site.config'

export default function sitemap(): MetadataRoute.Sitemap {
  const { projects, rooms } = getMuseumData()
  return [
    { url: site.url, priority: 1 },
    { url: `${site.url}/projects`, priority: 0.9 },
    ...rooms.map((r) => ({ url: `${site.url}/museum/${r.id}`, priority: 0.6 })),
    ...projects.map((p) => ({ url: `${site.url}/projects/${p.slug}`, priority: 0.8 })),
  ]
}
