import * as THREE from 'three'
import type { SceneTheme } from '../theme'

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

/** Unlit colour. With `intensity` above 1 the bloom pass makes it glow (neon). */
export function neon(color: string, intensity = 3): THREE.MeshBasicMaterial {
  return memo(`neon:${color}:${intensity}`, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) }))
}

/** A material instance that can be dimmed independently (proximity lights). */
export function dimmableNeon(color: string): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.05) })
}

export function standard(color: string, roughness = 0.85, metalness = 0, map?: THREE.Texture): THREE.MeshStandardMaterial {
  return memo(`std:${color}:${roughness}:${metalness}:${map?.uuid ?? ''}`, () => new THREE.MeshStandardMaterial(map ? { color, roughness, metalness, map } : { color, roughness, metalness }))
}

/** Edges and frames: neon tubes at night, black steel by day. */
export function lineMat(t: SceneTheme, color: string): THREE.Material {
  const { color: c, glow } = t.line(color)
  return t.name === 'night' ? neon(c, glow) : standard(c, 0.45, 0.6)
}

/** Light strips: neon at night, warm skylight/cove light by day. */
export function lightMat(t: SceneTheme, color: string): THREE.Material {
  const { color: c, glow } = t.light(color)
  return neon(c, glow)
}

/** Every surface material for a theme. */
export function mats(t: SceneTheme) {
  return {
    wall: standard(t.wall, 0.94),
    wallAlt: standard(t.wallAlt, 0.92),
    ceiling: standard(t.ceiling, 0.96),
    metal: standard(t.metal, 0.32, 0.85),
    frame: standard(t.frame, 0.4, t.name === 'night' ? 0.8 : 0.2),
    mat: standard(t.mat, 0.9),
    wood: standard(t.wood, 0.55, 0.02, t.name === 'day' ? woodTexture('trunk') : undefined),
    seat: standard(t.seat, t.name === 'day' ? 0.5 : 0.6, 0.05),
    stone: standard(t.stone, 0.75),
    soil: standard(t.soil, 1),
    pot: standard(t.pot, 0.7),
    leaf: memo(`leaf:${t.name}`, () => new THREE.MeshStandardMaterial({ color: t.leaf, roughness: 0.7, flatShading: true, emissive: t.leafEmissive, emissiveIntensity: 0.6 })),
    plaque: standard(t.plaque, 0.5, t.name === 'night' ? 0.3 : 0),
  }
}

function canvasTexture(key: string, size: [number, number], draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, repeat?: [number, number]) {
  return memo(key, () => {
    const c = document.createElement('canvas')
    c.width = size[0]
    c.height = size[1]
    draw(c.getContext('2d')!, size[0], size[1])
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    if (repeat) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(...repeat)
    }
    return t
  })
}

function seeded(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
}

/** Light oak planks (1 texture tile = 2.4 m × 2.4 m: eight 30 cm boards). */
export const woodTexture = (key = 'floor') =>
  canvasTexture(`wood:${key}`, [1024, 1024], (ctx, w, h) => {
    const rand = seeded(key.length * 97 + 11)
    const boards = 8
    const bw = w / boards
    for (let b = 0; b < boards; b++) {
      let y = -rand() * h
      while (y < h) {
        const len = h * (0.35 + rand() * 0.5)
        const tone = 0.9 + rand() * 0.16
        ctx.fillStyle = `rgb(${Math.round(231 * tone)}, ${Math.round(196 * tone)}, ${Math.round(152 * tone)})`
        ctx.fillRect(b * bw, y, bw, len)
        // Grain.
        ctx.strokeStyle = 'rgba(120, 82, 45, 0.10)'
        ctx.lineWidth = 1
        for (let g = 0; g < 9; g++) {
          const gx = b * bw + rand() * bw
          ctx.beginPath()
          ctx.moveTo(gx, y)
          ctx.bezierCurveTo(gx + (rand() - 0.5) * 10, y + len * 0.3, gx + (rand() - 0.5) * 10, y + len * 0.7, gx + (rand() - 0.5) * 6, y + len)
          ctx.stroke()
        }
        ctx.fillStyle = 'rgba(90, 60, 30, 0.35)'
        ctx.fillRect(b * bw, y, bw, 2)
        y += len
      }
      ctx.fillStyle = 'rgba(90, 60, 30, 0.28)'
      ctx.fillRect(b * bw, 0, 2, h)
    }
  }, [1, 1])

/** Pale terrazzo for the rotunda and entrance hall. */
export const terrazzoTexture = () =>
  canvasTexture('terrazzo', [1024, 1024], (ctx, w, h) => {
    const rand = seeded(42)
    ctx.fillStyle = '#ece8e1'
    ctx.fillRect(0, 0, w, h)
    const chips = ['#cfc6b8', '#b9b2a6', '#d9cbb4', '#9fa3a8', '#c7a98b', '#ffffff']
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = chips[Math.floor(rand() * chips.length)]
      const x = rand() * w
      const y = rand() * h
      const r = 1.5 + rand() * rand() * 9
      ctx.beginPath()
      ctx.ellipse(x, y, r, r * (0.5 + rand() * 0.5), rand() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [1, 1])

/** Large-format stone pavers for the courtyard (1 tile = 1.2 m). */
export const paverTexture = () =>
  canvasTexture('pavers', [512, 512], (ctx, w, h) => {
    const rand = seeded(7)
    const n = 4
    const s = w / n
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const tone = 0.93 + rand() * 0.07
        ctx.fillStyle = `rgb(${Math.round(222 * tone)}, ${Math.round(216 * tone)}, ${Math.round(205 * tone)})`
        ctx.fillRect(i * s, j * s, s, s)
        for (let k = 0; k < 140; k++) {
          ctx.fillStyle = `rgba(0,0,0,${0.02 + rand() * 0.03})`
          ctx.fillRect(i * s + rand() * s, j * s + rand() * s, 2, 2)
        }
      }
    ctx.strokeStyle = 'rgba(110, 100, 88, 0.45)'
    ctx.lineWidth = 3
    for (let i = 0; i <= n; i++) {
      ctx.beginPath()
      ctx.moveTo(i * s, 0)
      ctx.lineTo(i * s, h)
      ctx.moveTo(0, i * s)
      ctx.lineTo(w, i * s)
      ctx.stroke()
    }
  }, [1, 1])

/** Soft rectangular falloff: the shadow a hanging frame casts on the wall. */
export const frameShadowTexture = () =>
  canvasTexture('frame-shadow', [256, 256], (ctx, w, h) => {
    ctx.filter = 'blur(18px)'
    ctx.fillStyle = 'rgba(0,0,0,1)'
    ctx.fillRect(w * 0.18, h * 0.18, w * 0.64, h * 0.64)
  })

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
