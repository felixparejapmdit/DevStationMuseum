import { ImageResponse } from 'next/og'
import { site } from '@/site.config'

export const alt = `${site.name} — ${site.museumName}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: 'linear-gradient(135deg, #f7f5f0, #e9e4da)', color: '#1d1f24' }}>
        <div style={{ fontSize: 26, letterSpacing: 10, color: '#2447d6' }}>PORTFOLIO MUSEUM</div>
        <div style={{ fontSize: 96, fontWeight: 700, color: '#1d1f24', marginTop: 18 }}>{site.shortName}</div>
        <div style={{ fontSize: 54, marginTop: 6 }}>{site.museumName}</div>
        <div style={{ fontSize: 28, marginTop: 28, color: '#686d78', maxWidth: 900 }}>{site.tagline}</div>
      </div>
    ),
    size,
  )
}
