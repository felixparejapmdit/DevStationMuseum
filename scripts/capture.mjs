#!/usr/bin/env node
/**
 * Capture session: records a poster still and a short scrolling video loop of
 * every project that has a live URL, into public/media/<slug>/.
 * The museum picks them up automatically on the next build.
 *
 *   npm run capture                 # every project with links.live
 *   npm run capture -- pulseboard   # only these slugs
 *   npm run capture -- --force      # re-capture even if files exist
 *
 * Needs a browser once: npx playwright install chromium
 * Optional: ffmpeg on PATH converts the WebM loop to a smaller MP4 as well.
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import matter from 'gray-matter'
import { chromium } from '@playwright/test'

const ROOT = path.resolve(import.meta.dirname, '..')
const CONTENT = path.join(ROOT, 'content', 'projects')
const MEDIA = path.join(ROOT, 'public', 'media')
const TMP = path.join(ROOT, 'capture-tmp')
const VIEWPORT = { width: 1440, height: 900 }
const LOOP_SECONDS = 6

const args = process.argv.slice(2)
const force = args.includes('--force')
const only = new Set(args.filter((a) => !a.startsWith('--')))

const projects = fs
  .readdirSync(CONTENT)
  .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
  .map((f) => ({ slug: f.replace(/\.mdx?$/, ''), ...matter(fs.readFileSync(path.join(CONTENT, f), 'utf8')).data }))
  .filter((p) => p.links?.live && (only.size === 0 || only.has(p.slug)))

if (projects.length === 0) {
  process.stdout.write('No projects with a live URL to capture. Add links.live to content/projects/*.md first.\n')
  process.exit(0)
}

const hasFfmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0
fs.mkdirSync(TMP, { recursive: true })
const browser = await chromium.launch()
const report = []

for (const p of projects) {
  const dir = path.join(MEDIA, p.slug)
  if (!force && fs.existsSync(path.join(dir, 'poster.jpg'))) {
    report.push(`skip  ${p.slug} (already captured, use --force)`)
    continue
  }
  fs.mkdirSync(dir, { recursive: true })
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    recordVideo: { dir: TMP, size: VIEWPORT },
  })
  const page = await context.newPage()
  try {
    await page.goto(p.links.live, { waitUntil: 'networkidle', timeout: 45_000 })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(dir, 'poster.jpg'), type: 'jpeg', quality: 85 })

    // Gentle scroll down and back up: reads as a seamless loop on the museum wall.
    const height = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
    const distance = Math.min(height, 1600)
    const steps = LOOP_SECONDS * 30
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const y = distance * (0.5 - 0.5 * Math.cos(t * Math.PI * 2))
      await page.evaluate((top) => window.scrollTo({ top }), y)
      await page.waitForTimeout(1000 / 30)
    }
    const video = page.video()
    await context.close()
    const src = await video.path()
    const webm = path.join(dir, 'loop.webm')
    fs.copyFileSync(src, webm)
    fs.rmSync(src, { force: true })
    if (hasFfmpeg) {
      // Trim the blank first second and make a small, broadly supported MP4.
      spawnSync('ffmpeg', ['-y', '-ss', '1', '-i', webm, '-t', String(LOOP_SECONDS), '-vf', 'scale=1280:-2', '-an', '-c:v', 'libx264', '-crf', '28', '-preset', 'slow', '-movflags', '+faststart', path.join(dir, 'loop.mp4')], { stdio: 'ignore' })
      if (fs.existsSync(path.join(dir, 'loop.mp4'))) fs.rmSync(webm)
    }
    report.push(`ok    ${p.slug}`)
  } catch (err) {
    await context.close().catch(() => {})
    report.push(`fail  ${p.slug}: ${err.message.split('\n')[0]}`)
  }
}

await browser.close()
fs.rmSync(TMP, { recursive: true, force: true })
process.stdout.write(report.join('\n') + '\n')
