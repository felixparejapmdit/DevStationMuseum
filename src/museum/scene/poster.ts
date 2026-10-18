import * as THREE from 'three'
import type { Project } from '@/lib/types'

let fontsReady: Promise<void> | null = null

/** Registers the brand fonts for <canvas> drawing (next/font hashes its family names). */
export function ensureCanvasFonts(): Promise<void> {
  if (fontsReady) return fontsReady
  const faces = [
    new FontFace('MuseumDisplay', 'url(/fonts/space-grotesk-latin-700-normal.woff2)', { weight: '700' }),
    new FontFace('MuseumBody', 'url(/fonts/inter-latin-400-normal.woff2)', { weight: '400' }),
    new FontFace('MuseumMono', 'url(/fonts/jetbrains-mono-latin-500-normal.woff2)', { weight: '500' }),
  ]
  fontsReady = Promise.all(
    faces.map((f) =>
      f
        .load()
        .then((loaded) => {
          document.fonts.add(loaded)
        })
        .catch(() => undefined),
    ),
  ).then(() => undefined)
  return fontsReady
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line)
      line = w
      if (lines.length === maxLines) break
    } else line = next
  }
  if (lines.length < maxLines && line) lines.push(line)
  if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…'
  }
  return lines
}

/**
 * Placeholder artwork for projects whose screen capture hasn't been recorded yet.
 * Deterministic per project, in the room's colours, so a fresh museum still looks curated.
 */
export function makePosterTexture(project: Project, accent: string, secondary: string, number: string, aspect: number) {
  const W = 1280
  const H = Math.round(W / aspect)
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!

  let seed = 0
  for (const ch of project.slug) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)

  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#06070d')
  bg.addColorStop(1, '#0d0f1a')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Glow blobs in the room palette.
  for (const [color, x, y, r] of [
    [accent, 0.78 + rand() * 0.15, 0.2 + rand() * 0.2, 0.55],
    [secondary, 0.1 + rand() * 0.2, 0.9, 0.5],
  ] as const) {
    const g = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, r * W)
    g.addColorStop(0, color + '66')
    g.addColorStop(1, color + '00')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }

  // Perspective grid.
  ctx.strokeStyle = accent + '22'
  ctx.lineWidth = 2
  for (let i = 0; i <= 16; i++) {
    ctx.beginPath()
    ctx.moveTo((i / 16) * W, H * 0.62)
    ctx.lineTo(W / 2 + ((i / 16) * W - W / 2) * 3, H)
    ctx.stroke()
  }
  for (let j = 0; j < 7; j++) {
    const y = H * 0.62 + (H * 0.38 * Math.pow(j / 6, 1.8))
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
  }

  // Abstract UI "window" hinting at an app.
  const wx = W * 0.56
  const wy = H * 0.14
  const ww = W * 0.36
  const wh = H * 0.42
  ctx.fillStyle = '#0b0d16ee'
  ctx.strokeStyle = accent + 'aa'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.roundRect(wx, wy, ww, wh, 18)
  ctx.fill()
  ctx.stroke()
  ;['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => {
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.arc(wx + 28 + i * 26, wy + 26, 8, 0, Math.PI * 2)
    ctx.fill()
  })
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i === 0 ? accent + 'cc' : '#ffffff' + (i % 2 ? '22' : '33')
    ctx.fillRect(wx + 28, wy + 62 + i * 34, ww * (0.35 + rand() * 0.5), 14)
  }
  for (let i = 0; i < 6; i++) {
    const bh = wh * 0.08 + rand() * wh * 0.22
    ctx.fillStyle = (i % 2 ? secondary : accent) + '99'
    ctx.fillRect(wx + 28 + i * (ww - 56) / 6, wy + wh - 24 - bh, (ww - 56) / 6 - 10, bh)
  }

  // Typography.
  const pad = W * 0.06
  ctx.fillStyle = accent
  ctx.font = '500 30px MuseumMono, monospace'
  ctx.fillText(`${number} — ${project.category.toUpperCase()}`, pad, H * 0.17)
  ctx.fillStyle = '#f2f4fb'
  ctx.font = '700 92px MuseumDisplay, sans-serif'
  const titleLines = wrap(ctx, project.title, W * 0.46, 3)
  titleLines.forEach((l, i) => ctx.fillText(l, pad, H * 0.3 + i * 96))
  ctx.fillStyle = '#aab2c8'
  ctx.font = '400 32px MuseumBody, sans-serif'
  wrap(ctx, project.tagline, W * 0.44, 3).forEach((l, i) => ctx.fillText(l, pad, H * 0.3 + titleLines.length * 96 + 16 + i * 44))

  // Tech chips.
  let cx = pad
  const cy = H * 0.86
  ctx.font = '500 24px MuseumMono, monospace'
  for (const t of project.tech.slice(0, 5)) {
    const tw = ctx.measureText(t).width + 28
    if (cx + tw > W - pad) break
    ctx.strokeStyle = accent + '88'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(cx, cy - 30, tw, 42, 21)
    ctx.stroke()
    ctx.fillStyle = '#dfe6ff'
    ctx.fillText(t, cx + 14, cy)
    cx += tw + 12
  }

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}
