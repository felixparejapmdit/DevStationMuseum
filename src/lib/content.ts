import 'server-only'
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { z } from 'zod'
import type { Project } from './types'
import { buildRooms } from '@/museum/layout/buildRooms'
import { museumConfig } from '@/museum.config'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'projects')
const MEDIA_DIR = path.join(process.cwd(), 'public', 'media')

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(z.url().optional())

export const frontmatterSchema = z.object({
  title: z.string().min(1),
  tagline: z.string().default(''),
  category: z.string().min(1).default('Projects'),
  room: z.string().optional(),
  order: z.number().int().optional(),
  featured: z.boolean().default(false),
  year: z.number().int().min(1990).max(2100),
  role: z.string().default(''),
  tech: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
  allowEmbed: z.boolean().default(false),
  links: z
    .object({ live: optionalUrl, repo: optionalUrl, caseStudy: optionalUrl })
    .default({ live: undefined, repo: undefined, caseStudy: undefined }),
  media: z
    .object({ poster: z.string().optional(), loop: z.string().optional(), gallery: z.array(z.string()).default([]) })
    .default({ gallery: [] }),
})

/** Picks up files written by `npm run capture` (public/media/<slug>/poster.jpg, loop.webm, gallery-*.jpg). */
function detectMedia(slug: string) {
  const dir = path.join(MEDIA_DIR, slug)
  if (!fs.existsSync(dir)) return { gallery: [] as string[] }
  const files = fs.readdirSync(dir).sort()
  const find = (re: RegExp) => files.find((f) => re.test(f))
  const poster = find(/^poster\.(webp|avif|jpe?g|png)$/i)
  const loop = find(/^loop\.(webm|mp4)$/i)
  return {
    poster: poster ? `/media/${slug}/${poster}` : undefined,
    loop: loop ? `/media/${slug}/${loop}` : undefined,
    gallery: files.filter((f) => /^gallery-.*\.(webp|avif|jpe?g|png)$/i.test(f)).map((f) => `/media/${slug}/${f}`),
  }
}

export function parseProject(slug: string, raw: string): Project & { draft: boolean } {
  const { data, content } = matter(raw)
  const fm = frontmatterSchema.parse(data)
  const detected = detectMedia(slug)
  return {
    slug,
    title: fm.title,
    tagline: fm.tagline,
    category: fm.category,
    room: fm.room,
    order: fm.order,
    featured: fm.featured,
    year: fm.year,
    role: fm.role,
    tech: fm.tech,
    draft: fm.draft,
    allowEmbed: fm.allowEmbed,
    links: fm.links,
    media: {
      poster: fm.media.poster ?? detected.poster,
      loop: fm.media.loop ?? detected.loop,
      gallery: fm.media.gallery.length ? fm.media.gallery : detected.gallery,
    },
    body: content.trim(),
  }
}

let cache: Project[] | null = null

export function getProjects(): Project[] {
  if (cache && process.env.NODE_ENV === 'production') return cache
  const files = fs.existsSync(CONTENT_DIR) ? fs.readdirSync(CONTENT_DIR).filter((f) => /\.mdx?$/.test(f)) : []
  const projects = files
    .map((file) => {
      const slug = file.replace(/\.mdx?$/, '')
      try {
        return parseProject(slug, fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8'))
      } catch (err) {
        throw new Error(`Invalid frontmatter in content/projects/${file}: ${(err as Error).message}`)
      }
    })
    .filter((p) => !p.draft)
    .map(({ draft: _draft, ...p }) => p)
  cache = projects
  return projects
}

export function getMuseumData() {
  const projects = getProjects()
  const rooms = buildRooms(projects, museumConfig)
  return { projects, rooms }
}
