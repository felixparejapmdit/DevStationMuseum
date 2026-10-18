# Capture session

Every exhibit frame shows generated neon artwork until the project has a real
capture. This guide covers recording one: a **poster still** plus a **6-second
scrolling loop**, saved where the museum finds them automatically.

## 1. Prepare (once)

```bash
npm install
npx playwright install chromium     # browser used for recording
# optional, for smaller MP4 loops:  winget install ffmpeg
```

## 2. Add the live URLs

In each `content/projects/<slug>.md`, fill in `links.live`:

```yaml
links:
  live: "https://pulseboard.example.com"
  repo: "https://github.com/you/pulseboard"
```

Set `allowEmbed: true` only if the site may be shown in an iframe. That enables the
"Live preview" button in the exhibit panel.

## 3. Get each site ready

Checklist per project, before recording:

- [ ] Seeded with realistic demo data (no "lorem ipsum", no real customer data).
- [ ] Logged-out landing or a demo account that opens on the most impressive screen.
- [ ] Cookie banners and toasts dismissed or disabled for the demo URL.
- [ ] Dark theme if the site has one (it sits better on the museum's walls).
- [ ] Desktop app or Electron/Tauri project? Record it manually (see step 5).

## 4. Record

```bash
npm run capture                    # every project that has links.live
npm run capture -- pulseboard      # just one (or several) slugs
npm run capture -- --force         # redo existing captures
```

Output per project:

```
public/media/<slug>/poster.jpg     1440×900 still, shown in the frame and on the 2D pages
public/media/<slug>/loop.mp4       6 s loop (loop.webm if ffmpeg isn't installed)
```

Then `npm run build`. The frames switch from generated art to the real capture,
and the loop plays when a visitor walks into the room (High/Medium quality only).

## 5. Manual captures (desktop apps, private systems)

For projects without a public URL (ScribePH, ServiceLog, FR Entry, LetterLink…):

1. Record the screen at 1440×900 or 1920×1200 (OBS, Xbox Game Bar, or ShareX).
2. Export a **4–8 s** silent clip and one still.
3. Save them as `public/media/<slug>/loop.mp4` and `public/media/<slug>/poster.jpg`.
4. Optional extra stills: `public/media/<slug>/gallery-1.jpg`, `gallery-2.jpg` … (shown in the panel).

Keep loops under **1.5 MB** (`ffmpeg -i in.mp4 -t 6 -vf scale=1280:-2 -an -crf 28 loop.mp4`).

## 6. Review

Walk the museum (`npm run dev`), open each room, and check that every frame is sharp,
on-brand and free of personal data.
