import { DIMS, type Pose } from './layout/layoutMuseum'

type Tween = { from: Pose; to: Pose; t: number; duration: number; onDone?: () => void }

/**
 * Mutable first-person state, read and written every frame outside React.
 * React only sees coarse results (location, focus) through the store.
 */
export const player = {
  x: 0,
  z: 0,
  yaw: 0,
  pitch: 0,
  /** Horizontal velocity (m/s), smoothed. */
  vx: 0,
  vz: 0,
  speed: 0,
  bobPhase: 0,
  keys: new Set<string>(),
  run: false,
  /** Virtual joystick: x = strafe, y = forward, each in [-1, 1]. */
  joy: { x: 0, y: 0 },
  glide: null as { x: number; z: number; stuck: number } | null,
  tween: null as Tween | null,
  /** Set while a guided tour drives the camera. */
  driven: false,
}

export function setPose(p: Pose) {
  player.x = p.x
  player.z = p.z
  player.yaw = p.yaw
  player.pitch = p.pitch
  player.vx = player.vz = player.speed = 0
  player.glide = null
  player.tween = null
  pendingLook.yaw = pendingLook.pitch = 0
}

export function currentPose(): Pose {
  return { x: player.x, z: player.z, yaw: player.yaw, pitch: player.pitch }
}

export function glideTo(x: number, z: number) {
  player.tween = null
  player.glide = { x, z, stuck: 0 }
}

export function tweenTo(to: Pose, duration: number, onDone?: () => void) {
  player.glide = null
  player.vx = player.vz = 0
  // Take the short way round when turning.
  let yaw = to.yaw
  while (yaw - player.yaw > Math.PI) yaw -= Math.PI * 2
  while (yaw - player.yaw < -Math.PI) yaw += Math.PI * 2
  player.tween = { from: currentPose(), to: { ...to, yaw }, t: 0, duration: Math.max(0.001, duration), onDone }
}

export function stopMotion() {
  player.glide = null
  player.tween = null
  player.keys.clear()
  player.joy.x = player.joy.y = 0
  player.vx = player.vz = 0
}

/** Look input is queued and eased in over a few frames so dragging never stutters. */
export const pendingLook = { yaw: 0, pitch: 0 }

export function look(dYaw: number, dPitch: number) {
  pendingLook.yaw += dYaw
  pendingLook.pitch += dPitch
}

export function applyLook(dt: number) {
  const k = 1 - Math.exp(-dt * 24)
  const dy = pendingLook.yaw * k
  const dp = pendingLook.pitch * k
  pendingLook.yaw -= dy
  pendingLook.pitch -= dp
  player.yaw += dy
  player.pitch = Math.max(-1.1, Math.min(1.1, player.pitch + dp))
}

export const EYE = DIMS.eye
