import type { GeneratedRoom } from './buildRooms'
import type { Project } from '@/lib/types'

/*
 * World coordinates (metres). +z points from the building out to the courtyard,
 * so a visitor at the spawn looks toward -z. Yaw 0 = looking -z.
 *
 *   courtyard   z ∈ [8, 36]
 *   facade      z = 8 (door |x| < 2.5)
 *   hall        |x| < 4, z ∈ [-5, 8]
 *   rotunda     centre (0, -14), radius 10
 *   gallery     |x| < 3, z < -23.3, rooms alternate left / right every 12 m
 */

export type Vec2 = { x: number; z: number }
export type Segment = { ax: number; az: number; bx: number; bz: number }
export type CircleCollider = { x: number; z: number; r: number }
export type Pose = { x: number; z: number; yaw: number; pitch: number }
export type LightAnchor = { x: number; y: number; z: number; color: string; intensity: number; distance: number }

export const DIMS = {
  eye: 1.7,
  playerRadius: 0.35,
  courtyard: { minX: -16, maxX: 16, minZ: 8, maxZ: 36 },
  facade: { z: 8, doorHalf: 2.5, doorH: 4.6, h: 11 },
  hall: { halfW: 4, z0: 8, z1: -5.1, h: 5 },
  rotunda: { cx: 0, cz: -14, r: 10, h: 8.5, sculptureR: 1.5 },
  gallery: { halfW: 3, z0: -23.3, h: 6, firstDoor: -32, pitch: 12, endMargin: 8 },
  room: { halfWidth: 5, depth: 12, h: 5.5, doorHalf: 1.5, doorH: 3.6 },
} as const

export type SlotName = 'L1' | 'L2' | 'Lmid' | 'H' | 'Rmid' | 'R2' | 'R1'

type SlotDef = { lx: number; lz: number; rotY: number; nx: number; nz: number; hero: boolean }

const WALL_INSET = 4.94
const SLOTS: Record<SlotName, SlotDef> = {
  L1: { lx: WALL_INSET, lz: 3.6, rotY: -Math.PI / 2, nx: -1, nz: 0, hero: false },
  Lmid: { lx: WALL_INSET, lz: 5.9, rotY: -Math.PI / 2, nx: -1, nz: 0, hero: false },
  L2: { lx: WALL_INSET, lz: 8.2, rotY: -Math.PI / 2, nx: -1, nz: 0, hero: false },
  H: { lx: 0, lz: 11.94, rotY: Math.PI, nx: 0, nz: -1, hero: true },
  R2: { lx: -WALL_INSET, lz: 8.2, rotY: Math.PI / 2, nx: 1, nz: 0, hero: false },
  Rmid: { lx: -WALL_INSET, lz: 5.9, rotY: Math.PI / 2, nx: 1, nz: 0, hero: false },
  R1: { lx: -WALL_INSET, lz: 3.6, rotY: Math.PI / 2, nx: 1, nz: 0, hero: false },
}

/** Which slots are used for 0..5 works, in visiting order (a loop from the door and back). */
export const SLOT_SETS: SlotName[][] = [
  [],
  ['H'],
  ['Lmid', 'Rmid'],
  ['Lmid', 'H', 'Rmid'],
  ['L1', 'L2', 'R2', 'R1'],
  ['L1', 'L2', 'H', 'R2', 'R1'],
]

export const FRAME = {
  side: { w: 2.8, h: 1.75, y: 1.85, view: 3.2 },
  hero: { w: 3.6, h: 2.25, y: 2.0, view: 4.0 },
  featured: { w: 4.2, h: 2.6, y: 2.3, view: 4.6 },
} as const

export type ExhibitLayout = {
  /** Unique exhibit id: the project slug, or 'featured' for the rotunda copy. */
  id: string
  slug: string
  roomIndex: number | null
  /** 1-based position inside its room. */
  order: number
  /** Catalogue number across the whole museum ("07"). */
  number: string
  hero: boolean
  w: number
  h: number
  /** World-space frame centre + facing. */
  position: [number, number, number]
  rotationY: number
  normal: Vec2
  /** Room-local transform (rendered inside the room group). */
  local: { lx: number; y: number; lz: number; rotY: number } | null
  focus: Pose
  hotspot: Vec2
}

export type RoomLayout = {
  room: GeneratedRoom
  index: number
  side: -1 | 1
  doorZ: number
  position: [number, number, number]
  rotationY: number
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
  center: Vec2
  entry: Pose
  corridor: Vec2
  exhibits: ExhibitLayout[]
  benches: { lx: number; lz: number }[]
  plants: { lx: number; lz: number }[]
  stanchions: boolean
}

export type MuseumLayout = {
  rooms: RoomLayout[]
  pairs: number
  galleryEndZ: number
  segments: Segment[]
  circles: CircleCollider[]
  spawn: Pose
  featured: ExhibitLayout | null
  /** Every exhibit by id (room exhibits keyed by slug, plus 'featured'). */
  exhibits: Record<string, ExhibitLayout>
  lights: LightAnchor[]
  bollards: Vec2[]
  rotundaPlanters: Vec2[]
}

const seg = (ax: number, az: number, bx: number, bz: number): Segment => ({ ax, az, bx, bz })

function rectSegments(minX: number, minZ: number, maxX: number, maxZ: number): Segment[] {
  return [
    seg(minX, minZ, maxX, minZ),
    seg(maxX, minZ, maxX, maxZ),
    seg(maxX, maxZ, minX, maxZ),
    seg(minX, maxZ, minX, minZ),
  ]
}

function arcSegments(cx: number, cz: number, r: number, from: number, to: number, steps: number): Segment[] {
  const out: Segment[] = []
  for (let i = 0; i < steps; i++) {
    const t0 = from + ((to - from) * i) / steps
    const t1 = from + ((to - from) * (i + 1)) / steps
    out.push(seg(cx + r * Math.sin(t0), cz + r * Math.cos(t0), cx + r * Math.sin(t1), cz + r * Math.cos(t1)))
  }
  return out
}

/** Solid [from, to] pieces of a straight wall once door gaps are cut out. */
export function wallWithGaps(from: number, to: number, gaps: [number, number][]): [number, number][] {
  const lo = Math.min(from, to)
  const hi = Math.max(from, to)
  const sorted = [...gaps].sort((a, b) => a[0] - b[0])
  const pieces: [number, number][] = []
  let cursor = lo
  for (const [g0, g1] of sorted) {
    if (g0 > cursor) pieces.push([cursor, g0])
    cursor = Math.max(cursor, g1)
  }
  if (cursor < hi) pieces.push([cursor, hi])
  return pieces
}

export const yawFacing = (nx: number, nz: number) => Math.atan2(nx, nz)

export const doorZFor = (index: number) => DIMS.gallery.firstDoor - DIMS.gallery.pitch * Math.floor(index / 2)
export const sideFor = (index: number): -1 | 1 => (index % 2 === 0 ? -1 : 1)

/** Room-local (lx, lz) → world (x, z). Local +lz points from the door into the room; +lx is the visitor's left. */
export function roomToWorld(side: -1 | 1, doorZ: number, lx: number, lz: number): Vec2 {
  return { x: side * (DIMS.gallery.halfW + lz), z: doorZ - side * lx }
}

function makeExhibit(
  project: Project,
  id: string,
  roomIndex: number | null,
  order: number,
  number: string,
  size: { w: number; h: number; y: number; view: number },
  hero: boolean,
  world: Vec2,
  normal: Vec2,
  rotationY: number,
  local: ExhibitLayout['local'],
): ExhibitLayout {
  const fx = world.x + normal.x * size.view
  const fz = world.z + normal.z * size.view
  return {
    id,
    slug: project.slug,
    roomIndex,
    order,
    number,
    hero,
    w: size.w,
    h: size.h,
    position: [world.x, size.y, world.z],
    rotationY,
    normal,
    local,
    focus: {
      x: fx,
      z: fz,
      yaw: yawFacing(normal.x, normal.z),
      pitch: Math.atan2(size.y - DIMS.eye, size.view) * 0.8,
    },
    hotspot: { x: world.x + normal.x * 2.1, z: world.z + normal.z * 2.1 },
  }
}

export function layoutMuseum(rooms: GeneratedRoom[]): MuseumLayout {
  const { gallery, room: R, rotunda, hall, courtyard, facade } = DIMS
  const segments: Segment[] = []
  const circles: CircleCollider[] = []
  const lights: LightAnchor[] = []
  const exhibits: Record<string, ExhibitLayout> = {}

  // ── Courtyard ───────────────────────────────────────────────────────────
  segments.push(
    seg(courtyard.minX, courtyard.minZ, courtyard.minX, courtyard.maxZ),
    seg(courtyard.maxX, courtyard.minZ, courtyard.maxX, courtyard.maxZ),
    seg(courtyard.minX, courtyard.maxZ, courtyard.maxX, courtyard.maxZ),
    seg(courtyard.minX, facade.z, -facade.doorHalf, facade.z),
    seg(facade.doorHalf, facade.z, courtyard.maxX, facade.z),
  )
  for (const s of [-1, 1]) {
    segments.push(...rectSegments(s < 0 ? -12.5 : 6.5, 13, s < 0 ? -6.5 : 12.5, 31)) // planter beds
    for (const bz of [18, 26]) segments.push(...rectSegments(s * 5.6 - 0.28, bz - 0.9, s * 5.6 + 0.28, bz + 0.9))
  }
  const bollards: Vec2[] = []
  for (const z of [12, 17, 22, 27, 32]) for (const s of [-1, 1]) bollards.push({ x: s * 3.4, z })
  bollards.forEach((b) => circles.push({ ...b, r: 0.18 }))
  lights.push(
    { x: -7, y: 6, z: 11, color: '#ff3da6', intensity: 40, distance: 24 },
    { x: 7, y: 6, z: 11, color: '#22e1ff', intensity: 40, distance: 24 },
    { x: 0, y: 4, z: 25, color: '#9b6bff', intensity: 14, distance: 20 },
  )

  // ── Entrance hall ───────────────────────────────────────────────────────
  segments.push(seg(-hall.halfW, hall.z0, -hall.halfW, hall.z1), seg(hall.halfW, hall.z0, hall.halfW, hall.z1))
  lights.push({ x: 0, y: 4.2, z: 2, color: '#7fd8ff', intensity: 14, distance: 13 })

  // ── Rotunda ─────────────────────────────────────────────────────────────
  const rr = rotunda.r - 0.2
  const southHalf = Math.asin(hall.halfW / rr)
  const northHalf = Math.asin(gallery.halfW / rr)
  segments.push(
    ...arcSegments(rotunda.cx, rotunda.cz, rr, southHalf, Math.PI - northHalf, 22),
    ...arcSegments(rotunda.cx, rotunda.cz, rr, -southHalf, -(Math.PI - northHalf), 22),
  )
  circles.push({ x: rotunda.cx, z: rotunda.cz, r: rotunda.sculptureR })
  const rotundaPlanters: Vec2[] = [
    { x: -6.2, z: -8.2 },
    { x: 6.2, z: -8.2 },
    { x: -6.2, z: -19.8 },
    { x: 6.2, z: -19.8 },
  ]
  rotundaPlanters.forEach((p) => circles.push({ ...p, r: 0.7 }))
  lights.push(
    { x: -5, y: 6, z: -14, color: '#22e1ff', intensity: 30, distance: 18 },
    { x: 5, y: 6, z: -14, color: '#ff3da6', intensity: 30, distance: 18 },
    { x: 0, y: 2.6, z: -14, color: '#9b6bff', intensity: 10, distance: 8 },
  )

  // ── Grand Gallery + rooms ───────────────────────────────────────────────
  const pairs = Math.max(1, Math.ceil(rooms.length / 2))
  const galleryEndZ = gallery.firstDoor - gallery.pitch * (pairs - 1) - gallery.endMargin
  const gaps: Record<-1 | 1, [number, number][]> = { [-1]: [], [1]: [] }

  let catalogue = 0
  const roomLayouts: RoomLayout[] = rooms.map((room, index) => {
    const side = sideFor(index)
    const doorZ = doorZFor(index)
    gaps[side].push([doorZ - R.doorHalf, doorZ + R.doorHalf])
    const toW = (lx: number, lz: number) => roomToWorld(side, doorZ, lx, lz)
    const rotationY = (side * Math.PI) / 2

    // Walls (the front wall is the gallery wall with its door gap).
    const a = toW(R.halfWidth, 0)
    const b = toW(R.halfWidth, R.depth)
    const c = toW(-R.halfWidth, R.depth)
    const d = toW(-R.halfWidth, 0)
    segments.push(seg(a.x, a.z, b.x, b.z), seg(b.x, b.z, c.x, c.z), seg(c.x, c.z, d.x, d.z))

    const count = room.projects.length
    const slotNames = SLOT_SETS[Math.min(count, SLOT_SETS.length - 1)]
    const roomExhibits = slotNames.map((slotName, i) => {
      const project = room.projects[i]
      const slot = SLOTS[slotName]
      const size = slot.hero ? FRAME.hero : FRAME.side
      const world = toW(slot.lx, slot.lz)
      const normal = { x: slot.nz * side, z: -slot.nx * side }
      catalogue += 1
      const ex = makeExhibit(
        project,
        project.slug,
        index,
        i + 1,
        String(catalogue).padStart(2, '0'),
        size,
        slot.hero,
        world,
        normal,
        slot.rotY + rotationY,
        { lx: slot.lx, y: size.y, lz: slot.lz, rotY: slot.rotY },
      )
      exhibits[ex.id] = ex
      return ex
    })

    const hasHero = slotNames.includes('H')
    const benches = [count >= 4 ? { lx: 0, lz: 5.2 } : { lx: 0, lz: 9.4 }]
    for (const bench of benches) {
      const p0 = toW(bench.lx - 1.0, bench.lz - 0.28)
      const p1 = toW(bench.lx + 1.0, bench.lz + 0.28)
      segments.push(...rectSegments(Math.min(p0.x, p1.x), Math.min(p0.z, p1.z), Math.max(p0.x, p1.x), Math.max(p0.z, p1.z)))
    }
    const plants = [
      { lx: 4.2, lz: 11.2 },
      { lx: -4.2, lz: 11.2 },
      { lx: 4.2, lz: 0.9 },
      { lx: -4.2, lz: 0.9 },
    ]
    for (const p of plants) circles.push({ ...toW(p.lx, p.lz), r: 0.45 })
    if (hasHero) {
      const s0 = toW(-2, 10.5)
      const s1 = toW(2, 10.5)
      segments.push(seg(s0.x, s0.z, s1.x, s1.z))
    }

    const centre = toW(0, R.depth / 2)
    lights.push({ x: centre.x, y: 4.4, z: centre.z, color: room.accent, intensity: 22, distance: 15 })

    const xs = [side * gallery.halfW, side * (gallery.halfW + R.depth)]
    return {
      room,
      index,
      side,
      doorZ,
      position: [side * gallery.halfW, 0, doorZ],
      rotationY,
      bounds: { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: doorZ - R.halfWidth, maxZ: doorZ + R.halfWidth },
      center: centre,
      entry: { ...toW(0, 1.6), yaw: -side * (Math.PI / 2), pitch: 0 },
      corridor: { x: 0, z: doorZ },
      exhibits: roomExhibits,
      benches,
      plants,
      stanchions: hasHero,
    } satisfies RoomLayout
  })

  for (const side of [-1, 1] as const) {
    for (const [z0, z1] of wallWithGaps(galleryEndZ, gallery.z0, gaps[side])) {
      segments.push(seg(side * gallery.halfW, z0, side * gallery.halfW, z1))
    }
  }
  segments.push(seg(-gallery.halfW, galleryEndZ, gallery.halfW, galleryEndZ))
  for (let k = 0; k < pairs; k++) {
    lights.push({ x: 0, y: 5.2, z: gallery.firstDoor - gallery.pitch * k, color: '#a9b8ff', intensity: 12, distance: 14 })
  }
  lights.push({ x: 0, y: 4, z: galleryEndZ + 3, color: '#ffb547', intensity: 12, distance: 11 })

  // ── Featured exhibit in the rotunda ────────────────────────────────────
  const all = rooms.flatMap((r) => r.projects)
  const featuredProject = all.find((p) => p.featured) ?? all[0]
  let featured: ExhibitLayout | null = null
  if (featuredProject) {
    const source = exhibits[featuredProject.slug]
    featured = makeExhibit(
      featuredProject,
      'featured',
      null,
      0,
      source?.number ?? '00',
      FRAME.featured,
      true,
      { x: rotunda.cx - (rotunda.r - 0.5), z: rotunda.cz },
      { x: 1, z: 0 },
      Math.PI / 2,
      null,
    )
    exhibits.featured = featured
  }

  return {
    rooms: roomLayouts,
    pairs,
    galleryEndZ,
    segments,
    circles,
    spawn: { x: 0, z: 31, yaw: 0, pitch: 0.12 },
    featured,
    exhibits,
    lights,
    bollards,
    rotundaPlanters,
  }
}

export type Zone = 'courtyard' | 'entrance' | 'rotunda' | 'gallery' | 'room'
export type Location = { zone: Zone; roomIndex: number | null }

/** Rooms whose centre is within reach get mounted; the rest are unloaded. */
export function nearRoomsFor(layout: MuseumLayout, x: number, z: number): number[] {
  return layout.rooms.filter((r) => Math.hypot(r.center.x - x, r.center.z - z) < 24).map((r) => r.index)
}

export function locate(layout: MuseumLayout, x: number, z: number): Location {
  for (const r of layout.rooms) {
    const b = r.bounds
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) return { zone: 'room', roomIndex: r.index }
  }
  const { rotunda, gallery, hall } = DIMS
  if (Math.abs(x) <= gallery.halfW + 0.2 && z < gallery.z0) return { zone: 'gallery', roomIndex: null }
  if (Math.hypot(x - rotunda.cx, z - rotunda.cz) < rotunda.r + 0.2) return { zone: 'rotunda', roomIndex: null }
  if (Math.abs(x) <= hall.halfW + 0.2 && z <= hall.z0 && z > hall.z1 - 0.5) return { zone: 'entrance', roomIndex: null }
  return { zone: 'courtyard', roomIndex: null }
}
