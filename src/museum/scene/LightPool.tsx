'use client'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { LightAnchor, MuseumLayout } from '../layout/layoutMuseum'
import { player } from '../player'

const POOL = 6

/**
 * A fixed number of real point lights that follow the visitor: every few frames
 * the nearest light anchors are assigned to the pool. Keeping the count constant
 * means shaders never recompile when rooms stream in and out.
 */
export function LightPool({ layout }: { layout: MuseumLayout }) {
  const lights = useRef<(THREE.PointLight | null)[]>([])
  const assigned = useRef<(LightAnchor | null)[]>(Array(POOL).fill(null))
  const pending = useRef<(LightAnchor | null)[]>(Array(POOL).fill(null))
  const timer = useRef(0)
  const slots = useMemo(() => Array.from({ length: POOL }, (_, i) => i), [])

  useFrame((_, dt) => {
    timer.current -= dt
    if (timer.current <= 0) {
      timer.current = 0.25
      const nearest = [...layout.lights]
        .map((a) => ({ a, d: Math.hypot(a.x - player.x, a.z - player.z) }))
        .filter((e) => e.d < e.a.distance + 8)
        .sort((x, y) => x.d - y.d)
        .slice(0, POOL)
        .map((e) => e.a)
      // Keep anchors that are still wanted in their slot; queue the rest.
      const wanted = new Set(nearest)
      const free: number[] = []
      for (let i = 0; i < POOL; i++) {
        const cur = assigned.current[i]
        if (cur && wanted.has(cur)) wanted.delete(cur)
        else free.push(i)
      }
      for (const i of free) pending.current[i] = [...wanted].shift() ?? null
      for (const i of free) if (pending.current[i]) wanted.delete(pending.current[i]!)
    }
    for (let i = 0; i < POOL; i++) {
      const light = lights.current[i]
      if (!light) continue
      const cur = assigned.current[i]
      const next = pending.current[i]
      if (next !== null && next !== cur) {
        // Fade out, then jump to the new anchor.
        light.intensity = Math.max(0, light.intensity - dt * 80)
        if (light.intensity <= 0.01) {
          assigned.current[i] = next
          pending.current[i] = null
          light.position.set(next.x, next.y, next.z)
          light.color.set(next.color)
          light.distance = next.distance
        }
      } else if (cur && pending.current[i] === null && !isStillNear(cur)) {
        light.intensity = Math.max(0, light.intensity - dt * 60)
        if (light.intensity <= 0.01) assigned.current[i] = null
      } else if (cur) {
        light.intensity += (cur.intensity - light.intensity) * Math.min(1, dt * 4)
      }
    }
  })

  return (
    <>
      {slots.map((i) => (
        <pointLight key={i} ref={(l) => void (lights.current[i] = l)} intensity={0} decay={1.6} distance={12} />
      ))}
    </>
  )
}

function isStillNear(a: LightAnchor) {
  return Math.hypot(a.x - player.x, a.z - player.z) < a.distance + 10
}
