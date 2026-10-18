import { describe, expect, it } from 'vitest'
import type { Project } from '@/lib/types'
import { buildRooms, type MuseumConfig } from './buildRooms'
import { DIMS, layoutMuseum, locate, SLOT_SETS } from './layoutMuseum'
import { hasLineOfSight, move, resolve } from './collision'
import { buildTour } from './tour'

const make = (i: number, category = 'Web', extra: Partial<Project> = {}): Project => ({
  slug: `p-${i}`,
  title: `Project ${i}`,
  tagline: '',
  category,
  featured: false,
  year: 2020 + (i % 5),
  role: '',
  tech: [],
  links: {},
  media: { gallery: [] },
  allowEmbed: false,
  body: '',
  ...extra,
})

const config: MuseumConfig = { maxPerRoom: 5, groupBy: 'category' }

describe('buildRooms', () => {
  it('handles any number of projects', () => {
    for (const n of [0, 1, 4, 5, 6, 23, 100]) {
      const projects = Array.from({ length: n }, (_, i) => make(i))
      const rooms = buildRooms(projects, config)
      expect(rooms.length).toBe(Math.ceil(n / 5))
      expect(rooms.flatMap((r) => r.projects)).toHaveLength(n)
      rooms.forEach((r) => expect(r.projects.length).toBeLessThanOrEqual(5))
    }
  })

  it('splits a large category into numbered rooms with unique ids', () => {
    const projects = [...Array.from({ length: 7 }, (_, i) => make(i, 'AI & Automation')), make(99, 'Tools')]
    const rooms = buildRooms(projects, config)
    expect(rooms.map((r) => r.id)).toEqual(['ai-and-automation-1', 'ai-and-automation-2', 'tools'])
    expect(rooms[0].title).toBe('AI & Automation · I')
    expect(rooms[1].title).toBe('AI & Automation · II')
    expect(new Set(rooms.map((r) => r.id)).size).toBe(rooms.length)
  })

  it('respects categoryOrder, explicit order and maxPerRoom bounds', () => {
    const projects = [make(1, 'B', { order: 2 }), make(2, 'A'), make(3, 'B', { order: 1 })]
    const rooms = buildRooms(projects, { ...config, categoryOrder: ['B', 'A'] })
    expect(rooms.map((r) => r.group)).toEqual(['B', 'A'])
    expect(rooms[0].projects.map((p) => p.slug)).toEqual(['p-3', 'p-1'])
    expect(buildRooms(Array.from({ length: 12 }, (_, i) => make(i)), { ...config, maxPerRoom: 50 })).toHaveLength(3)
  })

  it('supports chronological and manual grouping', () => {
    const projects = Array.from({ length: 11 }, (_, i) => make(i, i % 2 ? 'X' : 'Y'))
    expect(buildRooms(projects, { ...config, groupBy: 'chronological' }).map((r) => r.title)).toEqual(['Gallery 01', 'Gallery 02', 'Gallery 03'])
    const manual = buildRooms([make(1, 'X', { room: 'Highlights' }), make(2, 'X')], { ...config, groupBy: 'manual' })
    expect(manual.map((r) => r.group)).toEqual(['Highlights', 'X'])
  })
})

describe('layoutMuseum', () => {
  it('places every exhibit inside its room, facing into it', () => {
    for (const n of [1, 2, 3, 4, 5, 9, 23]) {
      const rooms = buildRooms(Array.from({ length: n }, (_, i) => make(i)), config)
      const layout = layoutMuseum(rooms)
      for (const r of layout.rooms) {
        expect(r.exhibits).toHaveLength(r.room.projects.length)
        expect(r.exhibits.length).toBe(SLOT_SETS[r.room.projects.length].length)
        for (const ex of r.exhibits) {
          const b = r.bounds
          expect(ex.position[0]).toBeGreaterThanOrEqual(b.minX - 0.01)
          expect(ex.position[0]).toBeLessThanOrEqual(b.maxX + 0.01)
          expect(ex.position[2]).toBeGreaterThanOrEqual(b.minZ - 0.01)
          expect(ex.position[2]).toBeLessThanOrEqual(b.maxZ + 0.01)
          // The viewing spot is inside the same room and the frame is visible from it.
          expect(locate(layout, ex.focus.x, ex.focus.z)).toEqual({ zone: 'room', roomIndex: r.index })
          const toFrame = { x: ex.position[0] - ex.focus.x, z: ex.position[2] - ex.focus.z }
          const forward = { x: -Math.sin(ex.focus.yaw), z: -Math.cos(ex.focus.yaw) }
          expect(toFrame.x * forward.x + toFrame.z * forward.z).toBeGreaterThan(0)
        }
      }
    }
  })

  it('never overlaps rooms and grows the gallery with the room count', () => {
    const rooms = buildRooms(Array.from({ length: 48 }, (_, i) => make(i)), config)
    const layout = layoutMuseum(rooms)
    expect(layout.rooms).toHaveLength(10)
    expect(layout.pairs).toBe(5)
    for (const a of layout.rooms)
      for (const b of layout.rooms) {
        if (a === b) continue
        const overlap = a.bounds.minX < b.bounds.maxX && b.bounds.minX < a.bounds.maxX && a.bounds.minZ < b.bounds.maxZ && b.bounds.minZ < a.bounds.maxZ
        expect(overlap).toBe(false)
      }
    expect(Math.min(...layout.rooms.map((r) => r.bounds.minZ))).toBeGreaterThan(layout.galleryEndZ)
  })

  it('features the flagged project in the rotunda', () => {
    const rooms = buildRooms([make(1), make(2, 'Web', { featured: true })], config)
    const layout = layoutMuseum(rooms)
    expect(layout.featured?.slug).toBe('p-2')
    expect(locate(layout, layout.featured!.focus.x, layout.featured!.focus.z).zone).toBe('rotunda')
  })

  it('still builds an empty museum', () => {
    const layout = layoutMuseum([])
    expect(layout.rooms).toHaveLength(0)
    expect(layout.featured).toBeNull()
    expect(buildTour(layout).length).toBeGreaterThan(0)
  })
})

describe('collision', () => {
  const rooms = buildRooms(Array.from({ length: 13 }, (_, i) => make(i)), config)
  const layout = layoutMuseum(rooms)

  it('stops the visitor at walls', () => {
    // Walk straight into the left wall of the entrance hall.
    let p = { x: 0, z: 2 }
    for (let i = 0; i < 200; i++) p = move(p, -0.1, 0, DIMS.playerRadius, layout)
    expect(p.x).toBeCloseTo(-DIMS.hall.halfW + DIMS.playerRadius, 2)
  })

  it('lets the visitor walk from the courtyard to the back of the gallery', () => {
    // Slightly off-centre: dead-centre into a round obstacle has no side to slide to.
    let p = { x: 0.2, z: 30 }
    for (let i = 0; i < 2000; i++) p = move(p, 0, -0.1, DIMS.playerRadius, layout)
    // Slides around the rotunda sculpture and ends at the gallery's end wall.
    expect(p.z).toBeCloseTo(layout.galleryEndZ + DIMS.playerRadius, 1)
  })

  it('walks into every room through its door', () => {
    for (const r of layout.rooms) {
      let p = { x: 0, z: r.doorZ }
      for (let i = 0; i < 40; i++) p = move(p, r.side * 0.1, 0, DIMS.playerRadius, layout)
      expect(locate(layout, p.x, p.z)).toEqual({ zone: 'room', roomIndex: r.index })
    }
  })

  it('pushes points out of obstacles', () => {
    const p = resolve({ x: 0, z: -14 + 0.5 }, DIMS.playerRadius, layout)
    expect(Math.hypot(p.x, p.z + 14)).toBeGreaterThanOrEqual(DIMS.rotunda.sculptureR + DIMS.playerRadius - 1e-6)
  })

  it('every guided-tour leg is free of walls', () => {
    let at = { x: layout.spawn.x, z: layout.spawn.z }
    for (const step of buildTour(layout)) {
      const to = step.kind === 'move' ? step.to : step.kind === 'focus' ? layout.exhibits[step.id].focus : null
      if (!to) continue
      expect(hasLineOfSight(at, to, layout), `${JSON.stringify(at)} → ${JSON.stringify(to)}`).toBe(true)
      at = { x: to.x, z: to.z }
    }
  })
})
