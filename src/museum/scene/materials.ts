import * as THREE from 'three'
import { COLORS } from '../theme'

export const FONTS = {
  display: '/fonts/space-grotesk-latin-700-normal.woff',
  displayMedium: '/fonts/space-grotesk-latin-500-normal.woff',
  body: '/fonts/inter-latin-400-normal.woff',
  bodyBold: '/fonts/inter-latin-600-normal.woff',
  mono: '/fonts/jetbrains-mono-latin-500-normal.woff',
}

const cache = new Map<string, THREE.Material | THREE.Texture>()

function memo<T extends THREE.Material | THREE.Texture>(key: string, make: () => T): T {
  let v = cache.get(key) as T | undefined
  if (!v) {
    v = make()
    cache.set(key, v)
  }
  return v
}

/** Emissive "neon" colour. Values above 1 are picked up by the bloom pass. */
export function neon(color: string, intensity = 3): THREE.MeshBasicMaterial {
  return memo(`neon:${color}:${intensity}`, () => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) })
    return m
  })
}

/** A neon material instance that can be dimmed independently (proximity lights). */
export function dimmableNeon(color: string): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.05) })
}

export function standard(color: string, roughness = 0.85, metalness = 0): THREE.MeshStandardMaterial {
  return memo(`std:${color}:${roughness}:${metalness}`, () => new THREE.MeshStandardMaterial({ color, roughness, metalness }))
}

export const MAT = {
  wall: () => standard(COLORS.wall, 0.92),
  wallLight: () => standard(COLORS.wallLight, 0.9),
  ceiling: () => standard(COLORS.ceiling, 0.95),
  metal: () => standard('#2a2e3d', 0.32, 0.85),
  darkMetal: () => standard('#14161f', 0.4, 0.8),
  wood: () => standard('#2b1f1a', 0.55, 0.05),
  leather: () => standard('#171922', 0.6, 0.1),
  stone: () => standard('#1a1c25', 0.7),
  soil: () => standard('#0b0b0d', 1),
  leaf: () => memo('leaf', () => new THREE.MeshStandardMaterial({ color: '#0f3b33', roughness: 0.7, flatShading: true, emissive: '#04211b', emissiveIntensity: 0.6 })),
  plaque: () => standard('#0c0e15', 0.5, 0.3),
}

function canvasTexture(key: string, size: [number, number], draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  return memo(key, () => {
    const c = document.createElement('canvas')
    c.width = size[0]
    c.height = size[1]
    draw(c.getContext('2d')!, size[0], size[1])
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  })
}

/** Soft radial glow (wall washes, light pools). */
export const glowTexture = () =>
  canvasTexture('glow', [256, 256], (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.35, 'rgba(255,255,255,0.45)')
    g.addColorStop(0.7, 'rgba(255,255,255,0.08)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  })

/** Vertical fade for fake volumetric spotlight cones (bright at the apex). */
export const coneTexture = () =>
  canvasTexture('cone', [16, 256], (ctx, w, h) => {
    // Canvas top maps to the cone apex (v = 1), so the beam fades away from the fixture.
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, 'rgba(255,255,255,0.95)')
    g.addColorStop(0.4, 'rgba(255,255,255,0.35)')
    g.addColorStop(1, 'rgba(255,255,255,0.04)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  })

export function additive(map: THREE.Texture, color: string, opacity = 0): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  })
}

/** Ignore an object during our own raycasts (glows, cones, particles). */
export const noRaycast = () => null
