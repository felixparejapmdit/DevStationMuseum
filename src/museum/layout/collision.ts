import type { CircleCollider, Segment, Vec2 } from './layoutMuseum'

export type CollisionWorld = { segments: Segment[]; circles: CircleCollider[] }

function closestOnSegment(px: number, pz: number, s: Segment): Vec2 {
  const dx = s.bx - s.ax
  const dz = s.bz - s.az
  const len2 = dx * dx + dz * dz
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - s.ax) * dx + (pz - s.az) * dz) / len2))
  return { x: s.ax + dx * t, z: s.az + dz * t }
}

/** Pushes a circle of radius `r` at `p` out of every collider (walls are zero-thickness segments). */
export function resolve(p: Vec2, r: number, world: CollisionWorld, iterations = 3): Vec2 {
  let { x, z } = p
  for (let it = 0; it < iterations; it++) {
    let moved = false
    for (const s of world.segments) {
      // Cheap reject on the segment's bounding box.
      if (x < Math.min(s.ax, s.bx) - r || x > Math.max(s.ax, s.bx) + r) continue
      if (z < Math.min(s.az, s.bz) - r || z > Math.max(s.az, s.bz) + r) continue
      const q = closestOnSegment(x, z, s)
      const dx = x - q.x
      const dz = z - q.z
      const d = Math.hypot(dx, dz)
      if (d < r) {
        if (d > 1e-6) {
          x = q.x + (dx / d) * r
          z = q.z + (dz / d) * r
        } else {
          // Exactly on the line: push along the segment normal.
          const nx = -(s.bz - s.az)
          const nz = s.bx - s.ax
          const nl = Math.hypot(nx, nz) || 1
          x = q.x + (nx / nl) * r
          z = q.z + (nz / nl) * r
        }
        moved = true
      }
    }
    for (const c of world.circles) {
      const dx = x - c.x
      const dz = z - c.z
      const min = r + c.r
      const d2 = dx * dx + dz * dz
      if (d2 < min * min) {
        const d = Math.sqrt(d2) || 1e-6
        x = c.x + (dx / d) * min
        z = c.z + (dz / d) * min
        moved = true
      }
    }
    if (!moved) break
  }
  return { x, z }
}

/** Moves from `from` by (dx, dz), sub-stepping so fast moves cannot tunnel through walls. */
export function move(from: Vec2, dx: number, dz: number, r: number, world: CollisionWorld): Vec2 {
  const dist = Math.hypot(dx, dz)
  const steps = Math.max(1, Math.ceil(dist / (r * 0.5)))
  let p = from
  for (let i = 0; i < steps; i++) {
    p = resolve({ x: p.x + dx / steps, z: p.z + dz / steps }, r, world)
  }
  return p
}

/** True when the straight path between two points is free of walls (used by glide). */
export function hasLineOfSight(a: Vec2, b: Vec2, world: CollisionWorld): boolean {
  for (const s of world.segments) {
    if (segmentsIntersect(a.x, a.z, b.x, b.z, s.ax, s.az, s.bx, s.bz)) return false
  }
  return true
}

function segmentsIntersect(
  p1x: number, p1z: number, p2x: number, p2z: number,
  q1x: number, q1z: number, q2x: number, q2z: number,
): boolean {
  const d = (p2x - p1x) * (q2z - q1z) - (p2z - p1z) * (q2x - q1x)
  if (Math.abs(d) < 1e-9) return false
  const t = ((q1x - p1x) * (q2z - q1z) - (q1z - p1z) * (q2x - q1x)) / d
  const u = ((q1x - p1x) * (p2z - p1z) - (q1z - p1z) * (p2x - p1x)) / d
  return t > 0 && t < 1 && u > 0 && u < 1
}
