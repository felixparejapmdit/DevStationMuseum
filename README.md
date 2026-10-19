# The Archive: a walk-through portfolio museum

A first-person 3D museum of Felix M. Pareja's projects, styled as a daylit contemporary
gallery (white walls, oak and terrazzo floors, skylights, one painted feature wall per room),
with a neon **night mode** one click away. Visitors start in a sunlit courtyard and walk
through the entrance hall into a domed rotunda. From there,
a Grand Gallery leads to rooms that are **generated from the project list**: up to five works
per room, grouped by category. Lights switch on as you enter a room. Click a work to step
up to it and read its story.

Built with Next.js 16, React 19, React Three Fiber 9, drei, postprocessing, Zustand, Tailwind CSS 4 and Motion.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3917
npm run build && npm start
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build (every page is statically prerendered) |
| `npm run typecheck` | TypeScript |
| `npm test` | Unit tests: room generation, layout, collision, tour paths, content validation |
| `npm run e2e` | Playwright end-to-end tests (desktop + mobile, software WebGL) |
| `npm run capture` | Records poster stills + video loops of live sites (see [CAPTURE.md](CAPTURE.md)) |

## Adding a project

Create `content/projects/<slug>.md`:

```markdown
---
title: "PulseBoard"
tagline: "Executive smart-office dashboard for 1080p/4K TV displays."
category: "Dashboards & Finance"   # decides the room
order: 1                           # optional position within the room
year: 2026
role: "Design & full-stack development"
tech: ["Next.js", "React", "Prisma"]
featured: false                    # true = also shown in the rotunda
allowEmbed: false                  # true = "Live preview" iframe in the panel
draft: false                       # true = hidden everywhere
links:
  live: "https://…"
  repo: "https://…"
---

Long description in Markdown.
```

Rebuild, and the museum regrows: new rooms open along the Grand Gallery, and the
map, search, tour, sitemap and 2D pages all update. Media in `public/media/<slug>/`
(`poster.jpg`, `loop.mp4`, `gallery-*.jpg`) is picked up automatically.

## Configuration

- [src/site.config.ts](src/site.config.ts): name, role, about text, contact, site URL (`NEXT_PUBLIC_SITE_URL`).
- [src/museum.config.ts](src/museum.config.ts): `maxPerRoom` (1–5), `groupBy` (`category` | `chronological` | `manual`), category order and room subtitles.
- [src/museum/theme.ts](src/museum/theme.ts): the day and night scene themes (materials, lights, room colours). Rooms cycle through the palettes.
- [src/app/globals.css](src/app/globals.css): the matching HTML overlay tokens (`:root` = day, `[data-theme='night']` = night).

## Visiting

| Input | Action |
| --- | --- |
| Click / tap the floor | Glide there |
| Drag | Look around |
| WASD / arrows, Shift, Q / E | Walk, run, turn |
| Click a work or its floor ring | Step up and open its details |
| ← → while viewing · Tab | Previous / next work |
| M · Ctrl/⌘ K · T · N · L · Esc | Map · search · guided tour · mute · daylight/night · back |
| Toolbar "footprints" | Free-walk mode with pointer-lock mouse look |
| Phone | Joystick bottom-left, tap to walk, drag to look |

Every place has a URL: `/museum/<room>` and `/museum/<room>/<project>`. The 2D collection
lives at `/projects`.

## How it works

```
content/projects/*.md ──► buildRooms() ──► layoutMuseum() ──► colliders, exhibit poses, lights, map, tour
                           (≤5 per room)     (pure, tested)          │
                                                                     ▼
                                     React Three Fiber scene (streams nearby rooms only)
```

- **Pure layout** (`src/museum/layout`): rooms, world positions, collision segments, viewing poses and the guided-tour route all come from one tested function, so geometry, collision and navigation can never drift apart.
- **Performance**: the 3D bundle is lazy-loaded after first paint. Only rooms within ~24 m are mounted. A fixed pool of 6 point lights follows the visitor, so shaders never recompile. Quality tiers adapt automatically via `PerformanceMonitor`.
- **Immersion**: eye-height camera with head-bob and footsteps, track lights that switch on as you enter a room, framed works with mats and wall shadows, sun shadows and ambient occlusion by day (neon bloom and a reflective floor at night), and procedural Web Audio ambience with birdsong outside, per-room tones and reverb (no audio files).
- **Accessibility**: keyboard play, reduced-motion support, screen-reader link list, full 2D fallback when WebGL is unavailable.

See [PLAN.md](PLAN.md) for the teardown of the reference museum and the design rationale.
