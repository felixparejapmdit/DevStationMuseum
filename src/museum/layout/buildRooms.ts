import type { Project } from '@/lib/types'
import { PALETTES } from '@/museum/theme'

export const SLOTS_PER_ROOM = 5

export type RoomTheme = {
  title: string
  subtitle: string
  accent: string
  secondary: string
}

export type MuseumConfig = {
  maxPerRoom: number
  groupBy: 'category' | 'chronological' | 'manual'
  categoryOrder?: string[]
  roomOverrides?: Record<string, Partial<RoomTheme>>
}

export type GeneratedRoom = RoomTheme & {
  id: string
  index: number
  /** Index into PALETTES / MOOD_ROOTS, used for per-room ambience. */
  mood: number
  group: string
  projects: Project[]
}

type Group = { key: string; label: string; projects: Project[] }

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'room'
  )
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
const roman = (n: number) => ROMAN[n - 1] ?? String(n)

/** Explicit `order` first, then newest first, then title. */
export function compareProjects(a: Project, b: Project): number {
  const oa = a.order ?? Number.POSITIVE_INFINITY
  const ob = b.order ?? Number.POSITIVE_INFINITY
  if (oa !== ob) return oa - ob
  if (a.year !== b.year) return b.year - a.year
  return a.title.localeCompare(b.title)
}

function groupBy(projects: Project[], keyOf: (p: Project) => string, order: string[] = []): Group[] {
  const map = new Map<string, Project[]>()
  for (const p of projects) {
    const k = keyOf(p)
    map.set(k, [...(map.get(k) ?? []), p])
  }
  const rank = (k: string) => {
    const i = order.indexOf(k)
    return i === -1 ? Number.POSITIVE_INFINITY : i
  }
  return [...map.keys()]
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map((k) => ({ key: k, label: k, projects: [...map.get(k)!].sort(compareProjects) }))
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

function yearRange(projects: Project[]): string {
  const years = projects.map((p) => p.year)
  const lo = Math.min(...years)
  const hi = Math.max(...years)
  return lo === hi ? String(lo) : `${lo}–${hi}`
}

/** Turns any number of projects into any number of rooms of at most `maxPerRoom` works. */
export function buildRooms(projects: Project[], config: MuseumConfig): GeneratedRoom[] {
  const max = Math.min(SLOTS_PER_ROOM, Math.max(1, Math.floor(config.maxPerRoom)))
  let groups: Group[]

  if (config.groupBy === 'chronological') {
    const sorted = [...projects].sort((a, b) => a.year - b.year || compareProjects(a, b))
    groups = chunk(sorted, max).map((ps, i) => ({
      key: `gallery-${i + 1}`,
      label: `Gallery ${String(i + 1).padStart(2, '0')}`,
      projects: ps,
    }))
  } else if (config.groupBy === 'manual') {
    const assigned = projects.filter((p) => p.room)
    const rest = projects.filter((p) => !p.room)
    groups = [
      ...groupBy(assigned, (p) => p.room!, config.categoryOrder),
      ...groupBy(rest, (p) => p.category, config.categoryOrder),
    ]
  } else {
    groups = groupBy(projects, (p) => p.category, config.categoryOrder)
  }

  const rooms: GeneratedRoom[] = []
  const usedIds = new Set<string>()

  for (const group of groups) {
    const parts = chunk(group.projects, max)
    parts.forEach((ps, partIndex) => {
      const index = rooms.length
      const override = config.roomOverrides?.[group.key] ?? {}
      const multi = parts.length > 1
      let id = slugify(group.key) + (multi ? `-${partIndex + 1}` : '')
      while (usedIds.has(id)) id += '-x'
      usedIds.add(id)
      const palette = PALETTES[index % PALETTES.length]
      rooms.push({
        id,
        index,
        mood: index % PALETTES.length,
        group: group.key,
        title: (override.title ?? group.label) + (multi ? ` · ${roman(partIndex + 1)}` : ''),
        subtitle:
          override.subtitle ?? `${ps.length} ${ps.length === 1 ? 'work' : 'works'} · ${yearRange(ps)}`,
        accent: override.accent ?? palette.accent,
        secondary: override.secondary ?? palette.secondary,
        projects: ps,
      })
    })
  }
  return rooms
}
