'use client'
import { getMuseum, useMuseum } from './store'
import { currentPose, player, setPose, stopMotion, tweenTo } from './player'
import { audio } from './audio'
import { hasLineOfSight } from './layout/collision'
import { locate, nearRoomsFor, type ExhibitLayout, type Pose } from './layout/layoutMuseum'
import type { ThemeName } from './theme'
import { track } from '@vercel/analytics'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ── URLs ──────────────────────────────────────────────────────────────────
export function pathFor(roomIndex: number | null, slug?: string | null): string {
  const { rooms } = getMuseum()
  const room = roomIndex === null ? null : rooms[roomIndex]
  if (!room) return '/'
  return slug ? `/museum/${room.id}/${slug}` : `/museum/${room.id}`
}

function writeUrl(path: string, push: boolean) {
  if (typeof window === 'undefined' || window.location.pathname === path) return
  if (push) window.history.pushState(null, '', path)
  else window.history.replaceState(null, '', path)
}

export function syncUrlToLocation() {
  const s = getMuseum()
  if (s.focused || s.tour.active) return
  writeUrl(pathFor(s.location.zone === 'room' ? s.location.roomIndex : null), false)
}

// ── Transitions ───────────────────────────────────────────────────────────
let transitioning = false

/** Door-style cut: panels close, the visitor is moved, panels open. */
export async function teleport(pose: Pose, label = '') {
  if (transitioning) return
  transitioning = true
  const { set, reducedMotion } = getMuseum()
  audio.whoosh()
  set({ transition: 'closing', transitionLabel: label })
  await wait(reducedMotion ? 60 : 380)
  setPose(pose)
  const layout = getMuseum().layout
  if (layout) set({ location: locate(layout, pose.x, pose.z), nearRooms: nearRoomsFor(layout, pose.x, pose.z) })
  set({ transition: 'opening' })
  await wait(reducedMotion ? 60 : 460)
  set({ transition: 'idle', transitionLabel: '' })
  transitioning = false
}

// ── Exhibits ──────────────────────────────────────────────────────────────
/**
 * On wide screens the details panel covers the right third of the view, so the
 * visitor steps a little to their right: the work then sits in the open space.
 */
export function viewingPose(ex: ExhibitLayout): Pose {
  const focus = ex.focus
  if (typeof window === 'undefined') return focus
  const aspect = window.innerWidth / window.innerHeight
  if (aspect < 1) {
    // Portrait phones: the sheet covers the bottom half. Stand far enough back for the
    // whole frame to fit the narrow view, and look slightly down so it sits up top.
    const hHalf = Math.atan(Math.tan(THREE_DEG * portraitFov(aspect) * 0.5) * aspect)
    const current = Math.hypot(ex.position[0] - focus.x, ex.position[2] - focus.z)
    const wanted = Math.min((ex.w / 2 / Math.tan(hHalf)) * 1.08, ex.roomIndex === null ? 5.6 : ex.hero ? 7.5 : 7.2)
    const back = Math.max(0, wanted - current)
    return { ...focus, x: focus.x + Math.sin(focus.yaw) * back, z: focus.z + Math.cos(focus.yaw) * back, pitch: focus.pitch - 0.34 }
  }
  if (window.innerWidth < 640) return focus
  // Wide screens: the panel covers the right third, so step a little to the right.
  const shift = ex.w * 0.3
  return { ...focus, x: focus.x + Math.cos(focus.yaw) * shift, z: focus.z - Math.sin(focus.yaw) * shift }
}

const THREE_DEG = Math.PI / 180
/** Vertical field of view (degrees) used on portrait screens, so the horizontal view stays usable. */
export const portraitFov = (aspect: number) => (aspect < 1 ? 78 : 62)

export async function focusExhibit(id: string, opts: { push?: boolean } = {}) {
  const s = getMuseum()
  const ex = s.layout?.exhibits[id]
  if (!ex || !s.layout) return
  const project = s.projects[ex.slug]
  const from = currentPose()
  const pose = viewingPose(ex)
  const far = Math.hypot(from.x - pose.x, from.z - pose.z) > 14
  const blocked = !hasLineOfSight(from, pose, s.layout)
  s.set({ overlay: null })

  if (far || blocked) {
    await teleport(pose, project?.title ?? '')
  } else {
    tweenTo(pose, s.reducedMotion ? 0.001 : 1.1)
  }
  audio.chime()
  getMuseum().set({ focused: id })
  const roomIndex = ex.roomIndex ?? s.rooms.findIndex((r) => r.projects.some((p) => p.slug === ex.slug))
  writeUrl(pathFor(roomIndex >= 0 ? roomIndex : null, ex.slug), opts.push ?? true)
  track('exhibit_open', { slug: ex.slug })
}

export function closeFocus() {
  const s = getMuseum()
  if (!s.focused) return
  s.set({ focused: null })
  if (!s.tour.active) writeUrl(pathFor(s.location.zone === 'room' ? s.location.roomIndex : null), false)
}

/** Next / previous exhibit in the same room (or across rooms at the ends). */
export function stepExhibit(dir: 1 | -1) {
  const s = getMuseum()
  if (!s.layout) return
  const order = [
    ...(s.layout.featured ? ['featured'] : []),
    ...s.layout.rooms.flatMap((r) => r.exhibits.map((e) => e.id)),
  ]
  const i = s.focused ? order.indexOf(s.focused) : -1
  const next = order[(i + dir + order.length) % order.length]
  if (next) void focusExhibit(next, { push: false })
}

// ── Places ────────────────────────────────────────────────────────────────
export function goToRoom(index: number) {
  const s = getMuseum()
  const room = s.layout?.rooms[index]
  if (!room) return
  s.set({ focused: null, overlay: null })
  void teleport(room.entry, room.room.title).then(() => writeUrl(pathFor(index), true))
  track('room_visit', { room: room.room.id })
}

export function goToEntrance() {
  const s = getMuseum()
  if (!s.layout) return
  stopTour()
  s.set({ focused: null, overlay: null })
  void teleport(s.layout.spawn, 'Courtyard').then(() => writeUrl('/', true))
}

export function goToPoint(x: number, z: number, label = '') {
  const s = getMuseum()
  s.set({ focused: null, overlay: null })
  void teleport({ x, z, yaw: player.yaw, pitch: 0 }, label)
}

// ── Modes & settings ──────────────────────────────────────────────────────
export function setMode(mode: 'glide' | 'walk') {
  const s = getMuseum()
  s.set({ mode })
  if (mode === 'glide' && document.pointerLockElement) document.exitPointerLock()
}

/** Applies the theme to the HTML overlay (CSS variables) and remembers it. */
export function applyThemeAttr(theme: ThemeName) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem('museum:theme', theme)
  } catch {}
}

/** Daylit gallery ↔ neon night. The doors close while the scene rebuilds. */
export async function setTheme(theme: ThemeName) {
  const s = getMuseum()
  if (s.theme === theme || transitioning) return
  applyThemeAttr(theme)
  audio.setTheme(theme)
  if (!s.started) {
    s.set({ theme })
    return
  }
  transitioning = true
  audio.whoosh()
  s.set({ transition: 'closing', transitionLabel: theme === 'day' ? 'Daylight' : 'Night mode' })
  await wait(s.reducedMotion ? 60 : 380)
  getMuseum().set({ theme })
  await wait(450) // give the rebuilt scene a moment before revealing it
  getMuseum().set({ transition: 'opening' })
  await wait(s.reducedMotion ? 60 : 460)
  getMuseum().set({ transition: 'idle', transitionLabel: '' })
  transitioning = false
  track('theme', { theme })
}

export function toggleMute() {
  const muted = !getMuseum().muted
  audio.mute(muted)
  getMuseum().set({ muted })
  try {
    localStorage.setItem('museum:muted', muted ? '1' : '0')
  } catch {}
}

export function showHint(text: string, ms = 3200) {
  useMuseum.setState({ hint: text })
  setTimeout(() => {
    if (useMuseum.getState().hint === text) useMuseum.setState({ hint: null })
  }, ms)
}

// ── Tour ──────────────────────────────────────────────────────────────────
export async function startTour() {
  const s = getMuseum()
  if (!s.layout) return
  if (!s.started) s.set({ started: true })
  s.set({ focused: null, overlay: null, mode: 'glide' })
  stopMotion()
  await teleport(s.layout.spawn, 'Guided tour')
  player.driven = true
  getMuseum().set({ tour: { active: true, paused: false, index: 1, label: 'Welcome' } })
  track('tour_start')
}

export function stopTour() {
  const s = getMuseum()
  if (!s.tour.active) return
  player.driven = false
  player.tween = null
  s.set({ tour: { active: false, paused: false, index: 0, label: '' }, focused: null })
  syncUrlToLocation()
}

let pausedAt: { x: number; z: number } | null = null

export function pauseTour(paused: boolean) {
  const s = getMuseum()
  if (!s.tour.active) return
  if (paused) {
    pausedAt = { x: player.x, z: player.z }
    player.driven = false
    player.tween = null
    s.set({ tour: { ...s.tour, paused: true } })
    return
  }
  // If the visitor wandered off the route, rejoin at the next stop instead of walking through walls.
  const wandered = pausedAt && Math.hypot(player.x - pausedAt.x, player.z - pausedAt.z) > 0.5
  pausedAt = null
  s.set({ focused: null, tour: { ...s.tour, paused: false } })
  if (wandered) void skipTour(1)
  else player.driven = true
}

/** Jumps to the next / previous exhibit stop of the tour. */
export async function skipTour(dir: 1 | -1) {
  const s = getMuseum()
  if (!s.tour.active || !s.layout) return
  const steps = s.tourSteps
  let i = s.tour.index + dir
  while (i > 0 && i < steps.length && steps[i].kind !== 'focus') i += dir
  if (i <= 0 || i >= steps.length) {
    if (dir > 0) stopTour()
    return
  }
  const step = steps[i]
  if (step.kind !== 'focus') return
  const ex = s.layout.exhibits[step.id]
  player.driven = false
  s.set({ focused: null })
  await teleport(viewingPose(ex), s.projects[ex.slug]?.title ?? '')
  player.driven = true
  getMuseum().set({ tour: { active: true, paused: false, index: i, label: '' } })
}
