'use client'
import { create } from 'zustand'
import type { GeneratedRoom } from './layout/buildRooms'
import type { Location, MuseumLayout } from './layout/layoutMuseum'
import type { TourStep } from './layout/tour'
import type { Project } from '@/lib/types'
import { SCENES, type ThemeName } from './theme'

export type Tier = 'low' | 'medium' | 'high'
export type NavMode = 'glide' | 'walk'
export type Overlay = 'map' | 'search' | 'help' | null

type MuseumState = {
  rooms: GeneratedRoom[]
  layout: MuseumLayout | null
  projects: Record<string, Project>
  tourSteps: TourStep[]

  /** The visitor pressed "Enter" (audio unlocked, intro played). */
  started: boolean
  sceneReady: boolean
  mode: NavMode
  pointerLocked: boolean
  location: Location
  /** Exhibit id currently in focus (slug or 'featured'). */
  focused: string | null
  overlay: Overlay
  muted: boolean
  /** Daylit gallery (default) or neon night mode. */
  theme: ThemeName
  qualitySetting: 'auto' | Tier
  tier: Tier
  reducedMotion: boolean
  touch: boolean
  transition: 'idle' | 'closing' | 'opening'
  transitionLabel: string
  tour: { active: boolean; paused: boolean; index: number; label: string }
  /** Rooms currently mounted (streaming). */
  nearRooms: number[]
  hint: string | null

  set: (partial: Partial<MuseumState>) => void
}

export const useMuseum = create<MuseumState>()((set) => ({
  rooms: [],
  layout: null,
  projects: {},
  tourSteps: [],
  started: false,
  sceneReady: false,
  mode: 'glide',
  pointerLocked: false,
  location: { zone: 'courtyard', roomIndex: null },
  focused: null,
  overlay: null,
  muted: false,
  theme: 'day',
  qualitySetting: 'auto',
  tier: 'high',
  reducedMotion: false,
  touch: false,
  transition: 'idle',
  transitionLabel: '',
  tour: { active: false, paused: false, index: 0, label: '' },
  nearRooms: [],
  hint: null,
  set: (partial) => set(partial),
}))

export const getMuseum = () => useMuseum.getState()

/** True while the HTML overlay should own keyboard / pointer input. */
export function inputBlocked(): boolean {
  const s = getMuseum()
  return !s.started || s.overlay !== null || s.transition !== 'idle' || s.focused !== null
}

/** Scene tokens for the active theme (materials, lights, lettering colours). */
export const useScene = () => SCENES[useMuseum((s) => s.theme)]
export const getScene = () => SCENES[getMuseum().theme]
