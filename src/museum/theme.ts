/** Dark-neon brand palette shared by the 3D scene and the HTML overlay. */
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

/** Rooms cycle through these so neighbours never share a colour. */
export const PALETTES: RoomPalette[] = [
  { accent: COLORS.cyan, secondary: COLORS.violet },
  { accent: COLORS.magenta, secondary: COLORS.amber },
  { accent: COLORS.lime, secondary: COLORS.cyan },
  { accent: COLORS.violet, secondary: COLORS.magenta },
  { accent: COLORS.amber, secondary: COLORS.magenta },
  { accent: COLORS.mint, secondary: COLORS.violet },
]

/** Root notes (Hz) for each palette's ambient drone, so every room sounds different. */
export const MOOD_ROOTS = [110, 98, 123.47, 92.5, 130.81, 103.83]
