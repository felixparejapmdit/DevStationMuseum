import type { MuseumConfig } from '@/museum/layout/buildRooms'

/**
 * How projects become rooms. Add or remove files in content/projects and the
 * building regenerates: any number of projects, any number of rooms.
 */
export const museumConfig: MuseumConfig = {
  /** Projects per room (1–5; every room shell has five slots). */
  maxPerRoom: 5,
  /** 'category' | 'chronological' | 'manual' (uses each project's `room` field). */
  groupBy: 'category',
  /** Category order along the Grand Gallery. Unlisted categories follow alphabetically. */
  categoryOrder: [
    'AI & Automation',
    'Construction & Field',
    'Business Systems',
    'Dashboards & Finance',
    'Community & Web',
    'Dev Tools & Platforms',
  ],
  /** Optional per-category wording. Colours are assigned automatically unless set here. */
  roomOverrides: {
    'AI & Automation': { subtitle: 'Models, agents and tools that run where the data lives' },
    'Construction & Field': { subtitle: 'Local-first apps for sites, crews and paperwork' },
    'Business Systems': { subtitle: 'Operations software that replaces the spreadsheet' },
    'Dashboards & Finance': { subtitle: 'Numbers, signals and launchers at a glance' },
    'Community & Web': { subtitle: 'Sites and services for people and communities' },
    'Dev Tools & Platforms': { subtitle: 'Infrastructure and tooling behind the work' },
  },
}
