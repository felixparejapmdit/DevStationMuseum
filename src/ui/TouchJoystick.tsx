'use client'
import { useRef, useState, type PointerEvent } from 'react'
import { player } from '@/museum/player'
import { getMuseum, useMuseum } from '@/museum/store'
import { pauseTour } from '@/museum/actions'

const RADIUS = 48

/** Virtual thumb-stick for phones and tablets (bottom-left). */
export function TouchJoystick() {
  const touch = useMuseum((s) => s.touch)
  const focused = useMuseum((s) => s.focused)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const origin = useRef<{ x: number; y: number; id: number } | null>(null)
  if (!touch || focused) return null

  const update = (e: PointerEvent) => {
    const o = origin.current
    if (!o || e.pointerId !== o.id) return
    let dx = e.clientX - o.x
    let dy = e.clientY - o.y
    const d = Math.hypot(dx, dy)
    if (d > RADIUS) {
      dx = (dx / d) * RADIUS
      dy = (dy / d) * RADIUS
    }
    setKnob({ x: dx, y: dy })
    player.joy.x = dx / RADIUS
    player.joy.y = -dy / RADIUS
    player.run = d > RADIUS * 0.95
  }
  const end = () => {
    origin.current = null
    setKnob({ x: 0, y: 0 })
    player.joy.x = player.joy.y = 0
    player.run = false
  }

  return (
    <div
      className="absolute bottom-6 left-6 z-20 grid size-32 touch-none place-items-center rounded-full border border-white/10 bg-panel/40 backdrop-blur-md"
      role="application"
      aria-label="Movement joystick"
      onPointerDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        origin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2, id: e.pointerId }
        e.currentTarget.setPointerCapture(e.pointerId)
        const s = getMuseum()
        if (s.tour.active && !s.tour.paused) pauseTour(true)
        player.glide = null
        update(e)
      }}
      onPointerMove={update}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div
        className="size-14 rounded-full border border-cyan/60 bg-cyan/15 shadow-[0_0_24px_rgba(34,225,255,0.35)]"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  )
}
