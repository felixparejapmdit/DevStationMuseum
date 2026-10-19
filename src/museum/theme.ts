export type ThemeName = 'day' | 'night'

/** Night palette (neon) — kept for the night-mode toggle and the generated room identities. */
export const COLORS = {
  void: '#04050a',
  wall: '#0f111a',
  wallLight: '#161927',
  floor: '#07080d',
  ceiling: '#08090f',
  metal: '#1b1e2b',
  ink: '#e8ebf5',
  muted: '#8b93a8',
  cyan: '#22e1ff',
  magenta: '#ff3da6',
  violet: '#9b6bff',
  lime: '#b6ff3b',
  amber: '#ffb547',
  mint: '#4dffc3',
} as const

export type RoomPalette = { accent: string; secondary: string }

/** Night: rooms cycle through these so neighbours never share a colour. */
export const PALETTES: RoomPalette[] = [
  { accent: COLORS.cyan, secondary: COLORS.violet },
  { accent: COLORS.magenta, secondary: COLORS.amber },
  { accent: COLORS.lime, secondary: COLORS.cyan },
  { accent: COLORS.violet, secondary: COLORS.magenta },
  { accent: COLORS.amber, secondary: COLORS.magenta },
  { accent: COLORS.mint, secondary: COLORS.violet },
]

/**
 * Day: each room gets one painted feature wall (back wall) in a muted gallery
 * colour, and a deeper shade of it for lettering, plaques and the map.
 */
export const DAY_PALETTES: { feature: string; ink: string; soft: string }[] = [
  { feature: '#7e9a7c', ink: '#3f5c3e', soft: '#dfe7dc' }, // sage
  { feature: '#b8684c', ink: '#8a3f26', soft: '#f1dfd6' }, // terracotta
  { feature: '#5f7c99', ink: '#34506d', soft: '#dbe3ec' }, // slate blue
  { feature: '#c59a3e', ink: '#7d5c14', soft: '#f2e7cf' }, // ochre
  { feature: '#a87878', ink: '#7a4646', soft: '#efe0e0' }, // dusty rose
  { feature: '#4f8a86', ink: '#2c5f5b', soft: '#d8e8e6' }, // teal
]

/** Root notes (Hz) for each palette's ambient drone, so every room sounds different. */
export const MOOD_ROOTS = [110, 98, 123.47, 92.5, 130.81, 103.83]

/** The colours a room uses in the current theme. */
export function roomColors(room: { mood: number; accent: string; secondary: string }, theme: ThemeName) {
  if (theme === 'night') return { accent: room.accent, secondary: room.secondary, feature: COLORS.wallLight, ink: room.accent, soft: room.accent + '22' }
  const p = DAY_PALETTES[room.mood % DAY_PALETTES.length]
  return { accent: p.ink, secondary: p.feature, feature: p.feature, ink: p.ink, soft: p.soft }
}

/** CSS variables for a room's colours in both themes (consumed by `.room-vars` in globals.css). */
export function roomCssVars(room: { mood: number; accent: string; secondary: string }) {
  const d = roomColors(room, 'day')
  const n = roomColors(room, 'night')
  return { '--room-day': d.accent, '--room2-day': d.feature, '--room-night': n.accent, '--room2-night': n.secondary } as Record<string, string>
}

export type SceneTheme = {
  name: ThemeName
  background: string
  fog: [string, number, number]
  ambient: [string, number]
  hemisphere: [string, string, number]
  sun: { color: string; intensity: number; position: [number, number, number]; shadows: boolean }
  exposure: number
  /** Surfaces. */
  wall: string
  wallAlt: string
  ceiling: string
  floor: string
  frame: string
  mat: string
  metal: string
  wood: string
  seat: string
  stone: string
  soil: string
  leaf: string
  leafEmissive: string
  pot: string
  plaque: string
  /** Lettering on walls and plaques. */
  ink: string
  inkMuted: string
  /** Line elements (door frames, edges): neon at night, black steel by day. */
  line: (color: string) => { color: string; glow: number }
  /** Light strips (coves, skylights): neon at night, warm daylight by day. */
  light: (color: string) => { color: string; glow: number }
  /** Signature accents used across the building. */
  primary: string
  secondary: string
  tertiary: string
  /** Light anchors following the visitor. */
  poolColor: (anchor: string) => string
  poolScale: number
  bloom: { intensity: number; threshold: number }
  ao: boolean
  /** Exhibit lighting. */
  wash: number
  cone: number
  screenBase: number
}

export const SCENES: Record<ThemeName, SceneTheme> = {
  day: {
    name: 'day',
    background: '#dfe6ee',
    fog: ['#dde5ee', 30, 150],
    ambient: ['#ffffff', 0.35],
    hemisphere: ['#ffffff', '#e4dccd', 0.95],
    sun: { color: '#fff4e6', intensity: 2.4, position: [-28, 34, 52], shadows: true },
    exposure: 1.0,
    wall: '#f3f0ea',
    wallAlt: '#ece8e0',
    ceiling: '#fbfaf7',
    floor: '#c7a57b',
    frame: '#1d1e21',
    mat: '#fbfaf6',
    metal: '#b9b3a7',
    wood: '#b48a5a',
    seat: '#b48a5a',
    stone: '#e7e2d9',
    soil: '#5b4a3a',
    leaf: '#56804a',
    leafEmissive: '#000000',
    pot: '#d9d3c7',
    plaque: '#ffffff',
    ink: '#1d1f24',
    inkMuted: '#6c707a',
    line: () => ({ color: '#25262a', glow: 1 }),
    light: () => ({ color: '#fff8ec', glow: 1.25 }),
    primary: '#2447d6',
    secondary: '#b8684c',
    tertiary: '#5f7c99',
    poolColor: () => '#fff6ea',
    poolScale: 0.25,
    bloom: { intensity: 0.35, threshold: 1.05 },
    ao: true,
    wash: 0,
    cone: 0,
    screenBase: 0.86,
  },
  night: {
    name: 'night',
    background: COLORS.void,
    fog: [COLORS.void, 26, 120],
    ambient: ['#8a96ff', 0.45],
    hemisphere: ['#5463d8', '#0a0510', 0.55],
    sun: { color: '#9fb0ff', intensity: 0.4, position: [-20, 30, 40], shadows: false },
    exposure: 1.05,
    wall: COLORS.wall,
    wallAlt: COLORS.wallLight,
    ceiling: COLORS.ceiling,
    floor: '#0b0c14',
    frame: '#14161f',
    mat: '#14161f',
    metal: '#2a2e3d',
    wood: '#2b1f1a',
    seat: '#171922',
    stone: '#1a1c25',
    soil: '#0b0b0d',
    leaf: '#0f3b33',
    leafEmissive: '#04211b',
    pot: '#1a1c25',
    plaque: '#0c0e15',
    ink: '#f1f3fa',
    inkMuted: '#9aa3b8',
    line: (color) => ({ color, glow: 3 }),
    light: (color) => ({ color, glow: 1.6 }),
    primary: COLORS.cyan,
    secondary: COLORS.magenta,
    tertiary: COLORS.violet,
    poolColor: (anchor) => anchor,
    poolScale: 1,
    bloom: { intensity: 0.95, threshold: 1 },
    ao: false,
    wash: 0.42,
    cone: 0.075,
    screenBase: 0.16,
  },
}
