'use client'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { audio } from '../audio'
import { move } from '../layout/collision'
import { DIMS, locate, nearRoomsFor } from '../layout/layoutMuseum'
import { applyLook, EYE, player, tweenTo } from '../player'
import { getMuseum, inputBlocked } from '../store'
import { showHint, stopTour, syncUrlToLocation, viewingPose } from '../actions'

const WALK = 2.6
const RUN = 5
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

type TourPhase = { index: number; phase: 'init' | 'moving' | 'turning' | 'dwell'; timer: number }

/** Drives the camera along the guided-tour script. Returns true while it owns the camera. */
function updateTour(dt: number, tour: TourPhase): boolean {
  const s = getMuseum()
  if (!s.tour.active || s.tour.paused || !s.layout) return false
  if (tour.index !== s.tour.index) {
    tour.index = s.tour.index
    tour.phase = 'init'
    tour.timer = 0
  }
  const step = s.tourSteps[tour.index]
  if (!step) {
    stopTour()
    showHint('Tour complete. Explore freely, or press T to go again.')
    return false
  }
  const advance = () => s.set({ tour: { ...getMuseum().tour, index: tour.index + 1 } })

  const walkTowards = (tx: number, tz: number, stopAt: number) => {
    const dx = tx - player.x
    const dz = tz - player.z
    const d = Math.hypot(dx, dz)
    if (d <= stopAt) return true
    const speed = Math.min(2.4, 0.5 + d * 1.2)
    const stepLen = Math.min(d, speed * dt)
    player.x += (dx / d) * stepLen
    player.z += (dz / d) * stepLen
    player.speed = speed
    const targetYaw = Math.atan2(-dx, -dz)
    player.yaw += wrapAngle(targetYaw - player.yaw) * Math.min(1, dt * 2.6)
    player.pitch += (0 - player.pitch) * Math.min(1, dt * 2)
    return false
  }

  if (step.kind === 'move') {
    if (walkTowards(step.to.x, step.to.z, 0.08)) advance()
    return true
  }
  if (step.kind === 'look') {
    if (tour.phase === 'init') {
      tweenTo({ x: player.x, z: player.z, yaw: step.yaw, pitch: step.pitch }, 1.4)
      s.set({ tour: { ...s.tour, label: step.label } })
      tour.phase = 'turning'
    } else if (tour.phase === 'turning' && !player.tween) {
      tour.phase = 'dwell'
      tour.timer = step.dwell
    } else if (tour.phase === 'dwell') {
      tour.timer -= dt
      if (tour.timer <= 0) advance()
    }
    return true
  }
  // focus
  const ex = s.layout.exhibits[step.id]
  if (!ex) {
    advance()
    return true
  }
  if (tour.phase === 'init') tour.phase = 'moving'
  if (tour.phase === 'moving') {
    if (walkTowards(ex.focus.x, ex.focus.z, 0.6)) {
      tweenTo(viewingPose(ex), 1.0)
      tour.phase = 'turning'
    }
  } else if (tour.phase === 'turning' && !player.tween) {
    audio.chime()
    s.set({ focused: ex.id, tour: { ...s.tour, label: s.projects[ex.slug]?.title ?? '' } })
    tour.phase = 'dwell'
    tour.timer = 9
  } else if (tour.phase === 'dwell') {
    tour.timer -= dt
    if (tour.timer <= 0) {
      s.set({ focused: null })
      advance()
    }
  }
  return true
}

export function PlayerRig() {
  const camera = useThree((s) => s.camera)
  const tick = useRef(0)
  const bobAmp = useRef(0)
  const stuck = useRef(0)
  const tour = useRef<TourPhase>({ index: -1, phase: 'init', timer: 0 })

  useEffect(() => {
    const layout = getMuseum().layout
    if (!layout) return
    getMuseum().set({ nearRooms: nearRoomsFor(layout, player.x, player.z) })
  }, [])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = getMuseum()
    const layout = s.layout
    if (!layout) return

    const before = { x: player.x, z: player.z }
    if (!player.tween) applyLook(dt)
    const touring = updateTour(dt, tour.current)

    if (player.tween) {
      const tw = player.tween
      tw.t = Math.min(1, tw.t + dt / tw.duration)
      const k = ease(tw.t)
      player.x = tw.from.x + (tw.to.x - tw.from.x) * k
      player.z = tw.from.z + (tw.to.z - tw.from.z) * k
      player.yaw = tw.from.yaw + (tw.to.yaw - tw.from.yaw) * k
      player.pitch = tw.from.pitch + (tw.to.pitch - tw.from.pitch) * k
      if (tw.t >= 1) {
        player.tween = null
        tw.onDone?.()
      }
    } else if (!touring) {
      let fwd = 0
      let strafe = 0
      if (!inputBlocked() && !player.driven) {
        const k = player.keys
        if (k.has('w') || k.has('arrowup')) fwd += 1
        if (k.has('s') || k.has('arrowdown')) fwd -= 1
        if (k.has('d') || k.has('arrowright')) strafe += 1
        if (k.has('a') || k.has('arrowleft')) strafe -= 1
        if (k.has('q')) player.yaw += 1.9 * dt
        if (k.has('e')) player.yaw -= 1.9 * dt
        fwd += player.joy.y
        strafe += player.joy.x
      }
      const len = Math.hypot(fwd, strafe)
      if (len > 1) {
        fwd /= len
        strafe /= len
      }
      let tx = 0
      let tz = 0
      if (len > 0.05) {
        player.glide = null
        const speed = player.run ? RUN : WALK
        const sin = Math.sin(player.yaw)
        const cos = Math.cos(player.yaw)
        tx = (-sin * fwd + cos * strafe) * speed
        tz = (-cos * fwd - sin * strafe) * speed
      } else if (player.glide && !inputBlocked()) {
        const dx = player.glide.x - player.x
        const dz = player.glide.z - player.z
        const d = Math.hypot(dx, dz)
        if (d < 0.1) player.glide = null
        else {
          const speed = Math.min(3.4, 0.4 + d * 1.5)
          tx = (dx / d) * speed
          tz = (dz / d) * speed
        }
      }
      const response = len > 0.05 || player.glide ? 9 : 7
      player.vx += (tx - player.vx) * Math.min(1, dt * response)
      player.vz += (tz - player.vz) * Math.min(1, dt * response)
      const next = move({ x: player.x, z: player.z }, player.vx * dt, player.vz * dt, DIMS.playerRadius, layout)
      player.x = next.x
      player.z = next.z

      // A glide that runs into a wall gives up instead of grinding.
      if (player.glide) {
        const expected = Math.hypot(player.vx, player.vz) * dt
        const actual = Math.hypot(player.x - before.x, player.z - before.z)
        stuck.current = actual < expected * 0.25 ? stuck.current + dt : 0
        if (stuck.current > 0.35) {
          player.glide = null
          stuck.current = 0
        }
      }
    }

    const moved = Math.hypot(player.x - before.x, player.z - before.z)
    player.speed = moved / Math.max(dt, 1e-4)

    // Head bob + footsteps (one step every ~0.75 m).
    const walking = player.speed > 0.35 && !player.tween
    bobAmp.current += ((walking && !s.reducedMotion ? Math.min(1, player.speed / WALK) : 0) - bobAmp.current) * Math.min(1, dt * 6)
    if (walking) {
      const prev = Math.floor(player.bobPhase / Math.PI)
      player.bobPhase += moved * (Math.PI / 0.75)
      if (Math.floor(player.bobPhase / Math.PI) !== prev) audio.footstep(Math.min(1, 0.45 + player.speed / RUN))
    }
    const bob = (Math.abs(Math.sin(player.bobPhase)) - 0.5) * 0.045 * bobAmp.current
    const sway = Math.sin(player.bobPhase * 0.5) * 0.012 * bobAmp.current

    camera.position.set(player.x + Math.cos(player.yaw) * sway, EYE + bob, player.z - Math.sin(player.yaw) * sway)
    camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ')

    // Coarse state for React, five times a second.
    tick.current -= dt
    if (tick.current <= 0) {
      tick.current = 0.2
      const loc = locate(layout, player.x, player.z)
      if (loc.zone !== s.location.zone || loc.roomIndex !== s.location.roomIndex) {
        s.set({ location: loc })
        const mood = loc.roomIndex !== null ? layout.rooms[loc.roomIndex].room.mood : null
        audio.environment(loc.zone, mood)
        syncUrlToLocation()
      }
      const near = nearRoomsFor(layout, player.x, player.z)
      if (near.join(',') !== s.nearRooms.join(',')) s.set({ nearRooms: near })
    }
  })

  return null
}
