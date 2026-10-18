import { DIMS, type MuseumLayout, type Vec2 } from './layoutMuseum'

export type TourStep =
  | { kind: 'move'; to: Vec2 }
  | { kind: 'look'; yaw: number; pitch: number; label: string; dwell: number }
  | { kind: 'focus'; id: string }

/**
 * A guided route through every room. Waypoints are chosen so straight lines
 * between consecutive points never cross walls, benches or the sculpture.
 */
export function buildTour(layout: MuseumLayout): TourStep[] {
  const steps: TourStep[] = []
  const move = (x: number, z: number) => steps.push({ kind: 'move', to: { x, z } })

  move(layout.spawn.x, layout.spawn.z)
  steps.push({ kind: 'look', yaw: 0, pitch: 0.16, label: 'Welcome', dwell: 3.5 })
  move(0, 12)
  move(0, 2)
  steps.push({ kind: 'look', yaw: Math.PI / 2, pitch: 0.05, label: 'About', dwell: 5 })
  move(0, -6)
  if (layout.featured) {
    steps.push({ kind: 'focus', id: 'featured' })
  } else {
    move(3.2, -11)
    move(3.2, -17)
  }
  move(0, DIMS.gallery.z0 + 1.8)

  for (let k = 0; k < layout.pairs; k++) {
    const z = DIMS.gallery.firstDoor - DIMS.gallery.pitch * k
    move(0, z)
    for (const room of layout.rooms.filter((r) => Math.floor(r.index / 2) === k)) {
      move(room.entry.x, room.entry.z)
      for (const ex of room.exhibits) steps.push({ kind: 'focus', id: ex.id })
      move(room.entry.x, room.entry.z)
      move(0, z)
    }
  }
  move(0, layout.galleryEndZ + 3.5)
  steps.push({ kind: 'look', yaw: 0, pitch: 0.12, label: 'Thank you for visiting', dwell: 5 })
  return steps
}
