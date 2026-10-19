# PLAN — Virtual Portfolio Museum

A walkable 3D museum for my own projects, modelled on the concept behind
[dev-station.dev/museum](https://www.dev-station.dev/museum) but rebuilt to be
easier to use, better looking, and simpler to maintain.

> Status: **v1 implemented** (2026-10-19). Phases 0–6 are done; see "Implementation notes" below.
> Reference studied: 2026-10-18 (live HTML, JS chunks, CSS and public catalogue API).

## Implementation notes (v1)

Decisions taken while building, where they differ from or sharpen the plan below:

| Topic | Plan | Built | Why |
| --- | --- | --- | --- |
| Collision | Rapier | Small 2D segment/circle solver generated from layout data ([collision.ts](src/museum/layout/collision.ts)) | Same "colliders from data" goal without ~2 MB of WASM; deterministic and unit-tested |
| Site structure | Museum at `/museum` | Museum **is** the site: `/` is the courtyard, deep links at `/museum/<room>/<project>`, 2D at `/projects` | Answer to open question 4 |
| Visual direction | — | **Daylit contemporary gallery** by default (warm white walls, oak + terrazzo floors, skylights, one muted feature-wall colour per room, cobalt UI accent) with the original **dark neon** kept as a night-mode toggle (`L`) | v1 shipped dark neon (open question 3); switched on 2026-10-19 because most exhibits are business software with light UIs that read better as framed prints in daylight |
| Media | Video loops | Generated neon artwork per project until captured; `npm run capture` + [CAPTURE.md](CAPTURE.md) | Answer to open question 2: capture session planned |
| Content | `src/content` MDX | `content/projects/*.md` (frontmatter + Markdown), Zod-validated | Simpler editing; 33 projects seeded from D:\PROJECTS |
| UI kit | shadcn/ui | Tailwind 4 components + `cmdk` + Motion | Only a handful of components were needed |
| Lighting | Real spotlights | Fake spot cones + wall washes per exhibit, plus a 6-light pool following the visitor | Constant shader cost however many rooms exist |
| Immersion extras | — | Head-bob + footsteps, room reverb, lights switch on per room, stanchions, benches, plants, plaques | "Feel inside the gallery" |

---

## Part 1 — Teardown of the reference (DEV/STATION Museum)

### 1.1 Tech stack (verified from the shipped bundles and response headers)

| Layer | What they use | How we know |
|---|---|---|
| Framework | **Next.js App Router** (React, RSC), webpack build | `/_next/static/chunks/app/museum/page-*.js`, `vary: rsc, next-router-state-tree` |
| Hosting / edge | **Vercel**, fronted by **Cloudflare** (Turnstile, Insights) | `x-vercel-id`, `server: cloudflare`, CSP |
| 3D engine | **Vanilla Three.js r186**, imperative, *no* React Three Fiber, *no* glTF models | Lazy chunks `bd904a5c.*.js` (three core) + `b536a0f1.*.js` (three module); scene module exports `createMuseumScene()` |
| Data | **Supabase** (Postgres + realtime), Cloudflare **Workers** (catalogue, presence, community), Cloudflare **R2** for images | CSP `connect-src` / `img-src`; `/api/public/catalogue?page=N&sort=oldest` |
| UI | CSS Modules, `lucide-react` icons, native `<dialog>` | `PortfolioMuseum_*__hash` class names |
| Audio | **100% procedural Web Audio**: no audio files | Oscillators, noise buffers, and biquad filters in the page chunk |

The museum route is a small client component (23 KB) that dynamic-imports
Three.js plus the scene (~565 KB raw) only after mount, which keeps first paint fast.

### 1.2 User journey (start → rooms)

1. **Loading**: black screen, spinner, sr-only "Preparing the museum".
2. **"Enter museum" button** appears once the scene is built.
3. **Welcome dialog** (BETA badge): explains that floors hold 5 portfolios each, Floor 1 is the oldest work and top floors the newest, and lists the controls. Buttons: *Start exploring* / *Return to archive*.
4. **Fade-in**: over 3.5 s, lights ramp with smoothstep, the background lerps from black to warm paper `#e2ddd3`, and canvas opacity follows. Ambient audio starts.
5. **Courtyard spawn** at `(0, 1.7, 34)`, standing outside facing the building.
6. **Walk** down a striped stone path between planted beds, benches, trees, a reflecting pool and bollard lamps. The lamps switch on with a click sound as you get near.
7. **Enter the façade** (a "DEV/STATION — PORTFOLIO MUSEUM" sign) through a timber portal into the **gallery hall**.
8. **Gallery hall** (one per floor): 5 framed screenshots alternating left and right walls, ceiling light panels that switch on as you approach, potted trees, benches, and a large back-wall plaque ("01 — Where it all began.").
9. **Click a frame** to open a side panel: category, title, author, date, description, *Copy exhibit link*, *Explore portfolio ↗*.
10. **Elevator** on the right wall at the back. Clicking it (or the toolbar) opens a floor-picker dialog. Choosing a floor plays CSS elevator doors (two panels slide shut in 350 ms with a "Gallery 03" label), teleports you, then the doors open with a two-tone arrival chime.
11. **Toolbar** (top-left): Exit, Help, Nearby exhibits list, Elevator, Copy floor link, Mute. Plus a *Return to entrance* button and an on-screen **W/A/S/D pad** (bottom-right) for touch.
12. **Deep links**: `/museum?exhibit=<id>` or `/museum?floor=<n>` skip the courtyard and land you in that gallery.

### 1.3 3D architecture (reverse-engineered from `createMuseumScene`)

**Renderer and camera**
- `WebGLRenderer({ antialias: true, powerPreference: "low-power" })`, pixel ratio capped at 1.5 (1.0 in "lower detail" mode), sRGB output, no tone-mapping tweaks, no shadows, no post-processing.
- `PerspectiveCamera(65°, near 0.1, far 55)`, eye height 1.7 m. Black background plus `Fog(20 → 48)` hides the far plane.

**Everything is procedural, with no model files**
- One shared unit `BoxGeometry(1,1,1)` is scaled and positioned for every wall, floor, bench, pillar, frame and slat.
- Meshes are grouped **per material** and collapsed into one `InstancedMesh` each, so a floor renders in a few dozen draw calls.
- Trees are built from cylinders and stretched icosahedron "leaves" placed with a golden-angle spiral, also instanced.
- All signage and labels use `CanvasTexture` with Arial text drawn onto 2D canvases (façade sign, floor plaque, captions, elevator sign).
- The floor texture is a 256² canvas speckled by a seeded LCG and tiled.
- Light halos are a radial-gradient canvas sprite with additive blending.

**Lighting**
- 1 Hemisphere, 1 Directional and 3 PointLights. The point lights are **moved each frame** depending on whether you are outside (courtyard) or inside (hall), so they fake many lights with a fixed budget.
- "Lamps" (bollards, ceiling panels) are just `MeshBasicMaterial` emissive colour ramps. They turn on when the camera is within 18 m and on the same floor, which plays a click.

**World layout (metres)**
- Hall: 22 m wide (x ±10.2) × 6 m tall, from z = +10 (entrance) to z = −24 (back wall). The back wall colour cycles through 6 pastels per floor.
- Exhibit slot `i` (0–4): `x = ±9.8` (even = left, odd = right), `z = −3 − 6·floor(i/2)`, rotated to face the aisle.
- **Floors are stacked vertically**: `y = (floor − 1) × 6.5`. Only Floor 1 has the courtyard; upper floors have a solid front wall with dark "windows".
- Elevator: a metal-door mesh plus an invisible hit plane at `(9.65, y+2.4, −21)`. "Arriving" teleports you to `(7.2, y, −21)` facing the room.

**Streaming and memory**
- Only the **current floor ± 1** exist in the scene. Others are disposed (geometries, materials, textures).
- Floor data cache (max 5 floors, evicts the farthest). The API returns 16 items per page, and a pager re-slices it into 5-per-floor chunks, with request de-dup, an `AbortSignal`, and a 15 s timeout.
- Each floor `Group` gets a bounding box, and per-frame frustum culling toggles `group.visible`.
- Screenshots are requested at `?w=640` through an image proxy, aspect-fitted into the frame, with a canvas placeholder until they load or if they fail.
- Debug telemetry is written to `data-museum-*` attributes (draw calls, texture count, floor, position).

**Movement and collision**
- Keyboard (WASD/arrows) only while the canvas has focus. Speed is 5 m/s, normalised diagonal movement, `dt` clamped to 50 ms.
- Look is **drag-to-look** (pointer capture, yaw free, pitch clamped ±0.65 rad). No pointer lock.
- A click is a pointer-up with less than 8 px of drag. It raycasts against visible floor groups (< 20 m) and hits either `userData.portfolio` or `userData.elevator`.
- **Collision is hand-written AABB "walkable zones"**: the hall interior minus pillars, the courtyard minus planters and benches, and a doorway strip. Movement is resolved per axis, so you slide along walls.

**Audio (procedural Web Audio)**
- Outside: brown noise, low-passed at 1.2 kHz, plus randomised 3-note bird chirps every 6.5 s.
- Inside: brown noise low-passed at 700 Hz, plus a quiet C-major drone (C3 G3 C4 E4).
- The two layers crossfade on the inside/outside transition (`setTargetAtTime`, τ = 0.3 s).
- SFX: a light-switch tick and a two-tone arrival chime. Audio suspends when the tab is hidden, and mute is supported.

**Accessibility and resilience (worth copying)**
- Canvas `tabIndex=0` with an `aria-label`. Native `<dialog>`, focus management, Escape closes panels.
- `prefers-reduced-motion` skips the fade and the CSS transitions.
- WebGL failure shows "The 3D museum is unavailable on this device" with a link to the 2D archive.
- Network failure shows a "Connection interrupted · Retry exhibits" chip.

### 1.4 What works well (keep)
- One URL, instant concept: *walk in, look at framed work, click to learn more*.
- Zero-download procedural architecture, a tiny scene module, and lazy-loaded Three.js.
- Windowed floor streaming with disposal, which keeps memory flat however much content there is.
- Proximity-lit lamps and ambient audio, cheap tricks that make the space feel alive.
- Deep links to a floor or exhibit, and a 2D fallback.

### 1.5 Pain points (fix)
| # | Problem | Impact |
|---|---|---|
| 1 | **Chronological floors only** (5 per floor, so 78 items means 16 floors) | No thematic grouping, a lot of elevator trips, hard to find anything |
| 2 | **Walking is the only way to move** inside a floor; drag-to-look feels like dragging a map | Slow and disorienting, especially on trackpads |
| 3 | **Mobile = 4 tap buttons**; no joystick, no tap-to-move, no gyro | Clumsy on phones |
| 4 | **No map, no search, no "you are here"** | Visitors get lost and can't jump to a specific project |
| 5 | **Static 640 px screenshots** | Exhibits don't show what makes a project interesting (motion, interaction) |
| 6 | Flat box geometry, Arial canvas text, no shadows, AO, reflections or tone mapping | Reads as a prototype; text looks blurry up close |
| 7 | Hand-coded collision rectangles tied to magic numbers | Every layout change means rewriting the collision code |
| 8 | ~1,000 lines of imperative, closure-heavy scene code | Hard to extend (new rooms, props, interactions) |
| 9 | Exhibit panel is text-only | No gallery, video, tech chips, or live preview |
| 10 | Light-only theme | No visual identity per room or project |

---

## Part 2 — My version: concept

**"Walk in, pick a room, step into a project."**

Instead of a stack of identical floors, the museum is a **courtyard → rotunda → grand gallery** building whose rooms are **generated from the project list**:

```
          ┌────────┐   ┌────────┐   ┌────────┐
          │ Room 1 │   │ Room 3 │   │ Room 5 │  …  ← N rooms, generated
          └───┬────┘   └───┬────┘   └───┬────┘
   ═══════════╪════════════╪════════════╪═════════ ▶  GRAND GALLERY (spine corridor)
          ┌───┴────┐   ┌───┴────┐   ┌───┴────┐       grows 12 m per pair of rooms
          │ Room 2 │   │ Room 4 │   │ Room 6 │  …
          └────────┘   └────────┘   └────────┘
                   │
           ┌───────┴────────┐
           │    ROTUNDA     │  ← featured project, directory kiosk / map,
           │     (Hub)      │    "About me" alcove
           └───────┬────────┘
                   │  Entrance hall (intro)
          ═════════╧═════════
              COURTYARD        ← spawn, title sign, ambient
```

- **Courtyard → Entrance hall → Rotunda**: a short, cinematic arrival (about 10–15 s, skippable).
- **Rotunda (hub)**: a hero exhibit (featured project), a directory kiosk listing every room, and an "About me" alcove. It opens onto the **Grand Gallery**.
- **Grand Gallery**: a spine corridor with room doorways alternating left and right. Its length is derived from the room count, so any number of rooms works without redesigning the building.
- **Rooms are flexible in number** (see §2.2): they are generated automatically from however many projects exist, with **up to 5 projects per room** by default. Each room gets its own palette, lighting mood, ambient sound and door sign, generated from data and optionally overridden.
- **Exhibits**: framed screens showing **looping video or animated captures** (falling back to a still), a caption plinth, and a spotlight that switches on as you approach (borrowed from the reference).
- **Exhibit focus mode**: click a frame and the camera glides to a framed close-up, the world dims, and a rich panel slides in (gallery, video, tech chips, role, year, links, *Open live site*, optional embedded live preview).

### 2.1 Navigation (the main "easier to use" upgrade)

Three modes share the same world, and visitors can switch anytime:

| Mode | Who it's for | Input |
|---|---|---|
| **Glide (default)** | Everyone | Click or tap a floor spot or hotspot and the camera **smoothly travels** there (Matterport style). Hover shows a footprint cursor. Drag to look. |
| **Free walk** | Gamers | WASD/arrows + **pointer lock** mouse-look, Shift to run, physics collision. Mobile: **virtual joystick** + swipe-look (+ optional gyro). |
| **Guided tour** | Recruiters in a hurry | A "Take the tour" button flies a spline camera path through every room, pausing at each exhibit with its panel auto-opened. Next/prev/pause controls. |

Always available:
- **Mini-map / floor plan** (2D overlay, `M`): rooms, exhibits and a "you are here" marker. Click anywhere to travel there.
- **Command palette** (`Ctrl/⌘+K`): fuzzy-search projects, tech or rooms and teleport with a door transition.
- **Breadcrumb HUD**: `Courtyard › Rotunda › 3D Room › Project X`.
- **Back to hub** button, and **Esc** always backs out one level (panel → room → hub).
- **Keyboard tour**: `Tab` / `Shift+Tab` cycles exhibits in the current room and `Enter` focuses one, for full keyboard and screen-reader support.
- **2D mode** toggle: the same content as an accessible HTML gallery at the same URLs (also the no-WebGL fallback and the SEO surface).

### 2.2 Flexible projects → flexible rooms

Nothing about the building is hard-coded to a project or room count. Adding or removing a project file rebuilds the museum.

- **Projects per room**: `MAX_PER_ROOM = 5` (a config constant; the reference also used 5). The room shell always has 5 slots. A partly filled room centres its exhibits and fills empty slots with benches or plants, so it never looks unfinished.
- **Room generation** (`buildRooms(projects, config)`), where `config.groupBy` is one of:
  - `"category"` (default): group projects by `category`. Each group is split into chunks of 5, giving `ceil(count / 5)` rooms per category. Rooms are titled "Web Apps", or "Web Apps · I" and "Web Apps · II" when a category spans several rooms.
  - `"chronological"`: oldest → newest in chunks of 5 (the reference's model).
  - `"manual"`: the projects' optional `room` field assigns them explicitly; anything unassigned falls back to `"category"`.
- **Ordering** within a room: `order` first, then `year` descending, then title.
- **Room count N** = the result of the grouping, from 1 to unbounded:
  - Grand Gallery length is `ceil(N / 2) × 12 m`, with doorways alternating left and right.
  - Only rooms near the camera are mounted (current room ± neighbours, plus doorways within about 24 m), so 3 rooms and 30 rooms cost the same per frame.
  - The mini-map, directory kiosk, command palette, tour path and URLs are all derived from the same generated room list.
- **Room theming**: an optional `rooms.ts` override per category (title, subtitle, palette, mood). Without one, the palette is picked deterministically from a curated set (by hashing the room id), so every room still looks intentional.
- **Featured**: the project flagged `featured` (or the newest one) also hangs in the Rotunda. It stays in its own room as well.

### 2.3 URLs (shareable state)
```
/                         → landing (2D) with "Enter the museum" CTA
/museum                   → courtyard spawn
/museum/[room]            → spawn at that room's doorway
/museum/[room]/[project]  → spawn in focus mode on that exhibit
/projects/[project]       → 2D project page (SEO, fallback, OG images)
```
The URL updates with history state as you move between rooms or focus exhibits, and Back works as expected.

---

## Part 3 — Tech stack (modern rebuild)

> Pin exact versions when scaffolding (run `npm view <pkg> version`). The majors below are the targets.

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 (App Router) + React 19 + TypeScript** | Same proven base as the reference; RSC for 2D pages and SEO, a client island for 3D |
| 3D | **three** + **@react-three/fiber v9** + **@react-three/drei** | Declarative components instead of 1,000 lines of imperative code; drei covers controls, text, LOD, loaders and perf helpers |
| Renderer | WebGL2 by default; evaluate `WebGPURenderer` (with automatic WebGL2 fallback) behind a flag | WebGPU is the future, but WebGL2 is the safe baseline for every phone |
| Physics / collision | **@react-three/rapier** (kinematic character controller) | Real colliders generated from room geometry replace hand-coded AABB zones |
| Camera travel | **camera-controls** (via drei `<CameraControls>`) + spline paths | Smooth, interruptible glides, focus-on-object, tour rails |
| Post-FX | **@react-three/postprocessing** (N8AO/SSAO, subtle bloom on lamps, vignette, AgX tone mapping, SMAA) | Big visual jump for little cost; auto-disabled on low tier |
| Text in 3D | drei `<Text>` (troika SDF) with the site's own fonts | Crisp signage at any distance, unlike blurry canvas Arial |
| Materials | `MeshReflectorMaterial` floor, env map (`<Environment>` HDRI or `Lightformer`s), baked AO/lightmaps for hero props | Gallery-grade look |
| Assets | Blender → glTF, compressed with **gltf-transform** (Meshopt + KTX2/Basis); `useGLTF.preload` | Only for hero props (benches, plants, plinths); architecture stays procedural |
| State | **Zustand** (`mode`, `currentRoom`, `focusedExhibit`, `quality`, `muted`, `tour`) | Shared by the 3D scene and the HTML overlay without prop drilling |
| UI overlay | **Tailwind CSS v4** + **shadcn/ui** (Radix) + **Motion** for panel and door animations | Accessible dialogs, command palette (`cmdk`), sheet panels |
| Content | **MDX/JSON content collection** in-repo (Velite or Content Collections), Zod-validated | My own portfolio needs no DB; adding a project means adding a file. Optional headless CMS later |
| Media | Exhibit video loops (MP4/WebM, ~4–6 s, ≤ 1.5 MB) and AVIF/WebP stills via `next/image`; hosted on Vercel Blob or Cloudflare R2 | Motion sells a project far better than a screenshot |
| Audio | Procedural Web Audio ambience (copy the reference's idea) + drei `<PositionalAudio>` per room | Tiny payload, per-room mood |
| Perf | drei `<PerformanceMonitor>`, `<AdaptiveDpr>`, `<Detailed>` (LOD), `<Bvh>` raycasting, instancing, room streaming | Holds 60 fps on mid-range phones |
| Testing | Vitest (layout math, content schema), Playwright (enter → navigate → focus → deep link), `r3f-perf` in dev | |
| Deploy | Vercel (+ Vercel Analytics / Speed Insights) | |

### 3.1 Performance budget
- Initial JS (2D landing): **< 120 KB gz**. The 3D bundle is lazy-loaded only after "Enter".
- 3D first interactive: **< 2.5 MB total transfer** on 4G, in under 4 s.
- **60 fps** on a mid-range Android, ≤ 150 draw calls per room, ≤ 300k triangles in view.
- Only the **current room + adjacent rooms** are mounted (same windowing idea as the reference). Video textures play only when the exhibit is in view and within 12 m.
- Three quality tiers (auto-detected, user-overridable): **Low** (no post-FX, DPR 1, stills only), **Medium**, **High** (AO, reflections, video).

---

## Part 4 — Architecture

### 4.1 Folder structure
```
src/
  app/
    page.tsx                      # 2D landing
    museum/[[...path]]/page.tsx   # 3D entry (room / project from path)
    projects/[slug]/page.tsx      # 2D project page + OG image
  content/
    projects/*.mdx                # one file per project
    museum.config.ts              # maxPerRoom, groupBy, optional room theme overrides
  museum/
    MuseumCanvas.tsx              # <Canvas>, quality tier, Suspense, error boundary
    world/
      Courtyard.tsx
      EntranceHall.tsx
      Rotunda.tsx
      GrandGallery.tsx            # spine corridor, length from room count
      Room.tsx                    # parametric 5-slot room built from GeneratedRoom
      Doorway.tsx                 # portal + label + travel trigger
      kit/                        # modular pieces: Wall, Floor, Ceiling, Bench, Plant, Lamp
    exhibits/
      Exhibit.tsx                 # frame + media + plinth + spotlight + hit area
      ExhibitMedia.tsx            # video/still texture, lazy & in-view aware
    navigation/
      GlideControls.tsx           # click-to-move + drag-look
      WalkControls.tsx            # pointer-lock + Rapier character controller
      TourController.tsx          # spline rail through rooms
      Hotspots.tsx                # floor travel markers
    systems/
      roomStreaming.ts            # mount current ± adjacent rooms
      proximityLights.ts          # lamps light up near camera
      audio.ts                    # procedural ambience + SFX
    layout/
      buildRooms.ts               # pure fn: projects[] + config → GeneratedRoom[]
      layoutMuseum.ts             # pure fn: rooms[] → gallery length + doorways
      layoutRoom.ts               # pure fn: room → exhibit slots + colliders
    store.ts                      # Zustand
  ui/
    Hud.tsx  Toolbar.tsx  MiniMap.tsx  CommandPalette.tsx
    ExhibitPanel.tsx  WelcomeDialog.tsx  DoorTransition.tsx  TouchJoystick.tsx
```

### 4.2 Content model
```ts
// content/projects/*.mdx frontmatter (Zod schema)
type Project = {
  slug: string
  title: string
  tagline: string
  category: string             // used by groupBy "category" (default)
  room?: string                // only for groupBy "manual"
  order?: number               // position within the room
  featured?: boolean           // candidate for the rotunda hero
  year: number
  role: string                 // "Solo — design & full-stack"
  tech: string[]
  links: { live?: string; repo?: string; caseStudy?: string }
  media: {
    poster: string             // still (required)
    loop?: string              // short video loop for the frame
    gallery?: string[]
  }
  allowEmbed?: boolean         // permits live iframe preview in the panel
  // MDX body = long description / case study
}

// content/museum.config.ts
type MuseumConfig = {
  maxPerRoom: number                            // default 5
  groupBy: 'category' | 'chronological' | 'manual'
  roomOverrides?: Record<string, Partial<RoomTheme>>  // keyed by category / room id
}

type RoomTheme = {
  title: string                // "3D & Creative"
  subtitle: string
  palette: { wall: string; accent: string; floor: string }
  mood: 'warm' | 'cool' | 'neon' | 'daylight'   // lighting + ambience preset
}

// Output of buildRooms(): never written by hand
type GeneratedRoom = RoomTheme & {
  id: string                   // "web-apps-2"
  index: number                // 0..N-1 → doorway position on the Grand Gallery
  projects: Project[]          // 1..maxPerRoom
}
```

### 4.3 Procedural room layout (the improvement over hard-coded coordinates)
There are two pure functions:

`buildRooms(projects, config) → GeneratedRoom[]` (grouping and chunking, see §2.2).

`layoutMuseum(rooms) → { gallery, doorways[], rooms: RoomLayout[] }`:
- Grand Gallery spine length is `ceil(N/2) × 12 m`. Doorway `i` sits at `z = −12·floor(i/2)`, on the left if `i` is even and the right if odd.
- Each room is a fixed-size shell (5 slots: 2 per side wall + 1 hero slot on the back wall), so rooms never overlap and the spacing math stays trivial.

`layoutRoom(room) → { slots[], colliders[], hotspots[], lights[] }`:
- Slot positions for 1–5 exhibits. With fewer than 5, exhibits are centred and spare slots become benches or plants.
- The same function emits **Rapier colliders** (walls, plinths, benches), **glide hotspots** (one in front of each exhibit plus the room centre) and **light positions**, so geometry, collision and navigation can't drift apart.
- The mini-map, tour spline and directory kiosk are drawn from the same layout data.
- All three functions are pure and unit-tested with 0, 1, 4, 5, 6, 23 and 100 projects.

### 4.4 Rendering details
- Architecture: instanced modular kit (walls, trims, ceiling panels), as cheap as the reference but with bevelled edges, AO and real materials.
- Exhibit frame: bevelled frame mesh, media plane (video/still, aspect-fit), glass sheen, SDF caption on a plinth, spotlight cone (fake volumetric) that switches on with proximity.
- Lighting per room: 1 env map + 1 directional/hemisphere + baked or fake spotlights. The reference's trick of repositioning a small pool of real lights stays as the fallback on the low tier.
- Room transitions: walking through a doorway crossfades ambience and lights. Teleports (palette, map, tour jump) use a short **door/iris transition** (reusing the reference's elevator-door idea, done with Motion).

---

## Part 5 — Roadmap

### Phase 0 — Scaffold (½ day)
- [ ] Next.js 16 + TS + Tailwind v4 + shadcn/ui, ESLint/Prettier, Vitest, Playwright.
- [ ] Install three, R3F, drei, rapier, postprocessing, zustand, camera-controls, motion, cmdk.
- [ ] Content collection with Zod schema; 12 sample projects across 3 categories (giving 4 rooms, one partly filled).
- [ ] `buildRooms` / `layoutMuseum` / `layoutRoom` + unit tests.

### Phase 1 — Greybox walkable world (2–3 days)
- [ ] `<MuseumCanvas>` with lazy load, Suspense loader, WebGL error boundary leading to the 2D fallback.
- [ ] Courtyard → entrance → rotunda → Grand Gallery → generated rooms in greybox.
- [ ] Rapier colliders from layout data + free-walk controller (keyboard + pointer lock).
- [ ] Room streaming (current ± adjacent).

### Phase 2 — Easy navigation (2–3 days)
- [ ] Glide mode: click-to-move with hotspots, drag-look, smooth camera-controls transitions.
- [ ] Mobile: virtual joystick, tap-to-move, swipe-look.
- [ ] Mini-map, breadcrumb HUD, command palette search + teleport, door transition.
- [ ] URL ↔ state sync (`/museum/[room]/[project]`) and deep-link spawning.

### Phase 3 — Exhibits (2 days)
- [ ] Exhibit component: frame, media (still → video loop when in view), SDF caption, proximity spotlight.
- [ ] Focus mode: camera glides to the exhibit, scene dims, `ExhibitPanel` (gallery, video, tech chips, links, optional live iframe preview).
- [ ] Keyboard Tab cycling + screen-reader announcements.

### Phase 4 — Look and feel (3–4 days)
- [ ] Modular kit + hero props (glTF, compressed), per-room palettes and moods.
- [ ] Reflective floor, env lighting, post-FX stack, quality tiers + `PerformanceMonitor`.
- [ ] Welcome / intro sequence (skippable), proximity-lit lamps, procedural per-room ambience + SFX + mute.

### Phase 5 — Guided tour + 2D mode (2 days)
- [ ] Spline tour through all rooms with auto-opened panels, pause/next/prev.
- [ ] 2D gallery mode and `/projects/[slug]` pages (SEO, OG images, sitemap); toggle between 2D and 3D.

### Phase 6 — Polish and ship (2 days)
- [ ] Perf pass against the budget (r3f-perf, Lighthouse, a real mid-range phone).
- [ ] Accessibility pass (reduced motion, focus order, contrast, captions for audio-only cues).
- [ ] Playwright e2e: enter → glide → open exhibit → deep link → elevator/teleport → 2D fallback.
- [ ] Deploy to Vercel, analytics events (room visits, exhibit opens, tour completion).

### Later / optional
- Multiplayer presence (see other visitors as ghosts; the reference already runs a presence worker).
- Visitor guestbook / reactions per exhibit.
- Headless CMS (Sanity / Payload) instead of MDX.
- WebXR (VR headset) mode, which comes nearly free with R3F's `@react-three/xr`.
- Day/night cycle in the courtyard.

---

## Part 6 — Reference vs. mine (summary)

| | DEV/STATION Museum | My Museum |
|---|---|---|
| Organisation | Chronological floors, 5 items each | Auto-generated rooms (≤ 5 projects each, grouped by category) along a Grand Gallery; any number of projects or rooms |
| Moving around | Walk only + elevator | Glide (click-to-move), free walk, guided tour, map, search |
| Mobile | 4 D-pad buttons | Joystick, tap-to-move, swipe-look, auto tour |
| Exhibits | Static 640 px screenshot + text panel | Video loops, focus-mode camera, rich panel, live preview |
| Visuals | Flat boxes, Arial canvas text, no post-FX | Modular kit, SDF type, reflections, AO, tone mapping, room moods |
| Collision | Hard-coded rectangles | Rapier colliders generated from layout data |
| Code | One imperative Three.js closure | Declarative R3F components + pure, tested layout functions |
| Content | Supabase + Workers (multi-user archive) | MDX in-repo (single owner), CMS optional |
| Fallback | "Unavailable" + link | Full 2D gallery at the same URLs |

---

## Open questions (answered, see Implementation notes)
1. ~~Room-per-category or room-per-project?~~ **Decided**: rooms are generated from the projects, at most 5 per room, grouped by category (§2.2). Both counts are flexible.
2. **List of projects + media**: do I have screen recordings for video loops, or should I plan a capture session? plan a capture session
3. **Visual direction**: warm minimal gallery (like the reference), dark neon gallery, or a mix per room? dark neon gallery → later changed to daylit gallery + night-mode toggle
4. **Is this the whole site** (museum at `/`) or a section of an existing portfolio (museum at `/museum`)? yes
5. **Brand assets**: name/logo for the façade sign, fonts, colour palette. please decide make it the best
