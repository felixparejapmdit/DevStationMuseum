import { describe, expect, it } from 'vitest'
import { getMuseumData, parseProject } from './content'

describe('content', () => {
  it('loads and validates every project in content/projects', () => {
    const { projects, rooms } = getMuseumData()
    expect(projects.length).toBeGreaterThan(0)
    expect(new Set(projects.map((p) => p.slug)).size).toBe(projects.length)
    expect(rooms.flatMap((r) => r.projects)).toHaveLength(projects.length)
  })

  it('rejects invalid frontmatter with a helpful error', () => {
    expect(() => parseProject('bad', '---\ntitle: X\nyear: "soon"\n---\n')).toThrow()
  })

  it('treats empty links as missing and drafts as hidden', () => {
    const p = parseProject('x', '---\ntitle: X\nyear: 2024\nlinks:\n  live: ""\n---\nBody')
    expect(p.links.live).toBeUndefined()
    expect(p.body).toBe('Body')
    expect(parseProject('y', '---\ntitle: Y\nyear: 2024\ndraft: true\n---\n').draft).toBe(true)
  })
})
