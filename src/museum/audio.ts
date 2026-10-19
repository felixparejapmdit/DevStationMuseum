import { MOOD_ROOTS, type ThemeName } from './theme'
import type { Zone } from './layout/layoutMuseum'

/**
 * Fully procedural Web Audio ambience: no audio files to download.
 * Outside: wind with birdsong by day, a low city hum at night. Inside: a soft pad
 * whose root changes per room (warm triangle waves by day, synth saws at night),
 * sent through a generated reverb so each space sounds like a gallery.
 */
class MuseumAudio {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private dry!: GainNode
  private wet!: GainNode
  private outside!: GainNode
  private inside!: GainNode
  private pad: { gain: GainNode; nodes: AudioScheduledSourceNode[] } | null = null
  private padKey = ''
  private noise: AudioBuffer | null = null
  private muted = false
  private lastStep = 0
  private theme: ThemeName = 'day'
  private zone: Zone = 'courtyard'
  private hum!: GainNode
  private padRoot = MOOD_ROOTS[0]
  private birds: ReturnType<typeof setInterval> | null = null

  start() {
    if (this.ctx) {
      void this.ctx.resume()
      return
    }
    try {
      const ctx = new AudioContext()
      this.ctx = ctx
      this.master = ctx.createGain()
      this.master.gain.value = 0
      this.master.connect(ctx.destination)
      this.master.gain.linearRampToValueAtTime(this.muted ? 0 : 0.9, ctx.currentTime + 2.5)

      const reverb = ctx.createConvolver()
      reverb.buffer = this.impulse(3.2, 2.6)
      this.dry = ctx.createGain()
      this.wet = ctx.createGain()
      this.wet.gain.value = 0.1
      this.dry.connect(this.master)
      this.wet.connect(reverb)
      reverb.connect(this.master)

      this.noise = this.brownNoise(6)
      this.outside = ctx.createGain()
      this.inside = ctx.createGain()
      this.outside.gain.value = 1
      this.inside.gain.value = 0
      this.outside.connect(this.dry)
      this.inside.connect(this.dry)
      this.inside.connect(this.wet)

      // Wind: brown noise through a slowly wandering low-pass.
      const wind = ctx.createBufferSource()
      wind.buffer = this.noise
      wind.loop = true
      const windFilter = ctx.createBiquadFilter()
      windFilter.type = 'lowpass'
      windFilter.frequency.value = 420
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.frequency.value = 0.07
      lfoGain.gain.value = 220
      lfo.connect(lfoGain).connect(windFilter.frequency)
      const windGain = ctx.createGain()
      windGain.gain.value = 0.32
      wind.connect(windFilter).connect(windGain).connect(this.outside)
      wind.start()
      lfo.start()

      // Distant city hum (night).
      this.hum = ctx.createGain()
      this.hum.gain.value = this.theme === 'night' ? 1 : 0
      this.hum.connect(this.outside)
      for (const [f, g] of [
        [55, 0.018],
        [110.4, 0.008],
      ] as const) {
        const o = ctx.createOscillator()
        o.frequency.value = f
        const og = ctx.createGain()
        og.gain.value = g
        o.connect(og).connect(this.hum)
        o.start()
      }
      this.birds = setInterval(() => this.birdsong(), 3800)
      this.setPad(MOOD_ROOTS[0], 'init')
    } catch {
      this.ctx = null
    }
  }

  private impulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx!
    const len = Math.floor(ctx.sampleRate * seconds)
    const buf = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch)
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
    }
    return buf
  }

  private brownNoise(seconds: number): AudioBuffer {
    const ctx = this.ctx!
    const len = Math.floor(ctx.sampleRate * seconds)
    const buf = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch)
      let last = 0
      for (let i = 0; i < len; i++) {
        last = (last + (Math.random() * 2 - 1) * 0.02) / 1.02
        data[i] = last * 3.2
      }
    }
    return buf
  }

  /** Crossfades the interior pad to a new chord rooted at `root` Hz. */
  private setPad(root: number, key: string) {
    const ctx = this.ctx
    if (!ctx || key === this.padKey) return
    this.padKey = key
    this.padRoot = root
    const day = this.theme === 'day'
    const now = ctx.currentTime
    if (this.pad) {
      const old = this.pad
      old.gain.gain.cancelScheduledValues(now)
      old.gain.gain.setTargetAtTime(0, now, 0.6)
      setTimeout(() => old.nodes.forEach((n) => { try { n.stop() } catch {} }), 4000)
    }
    const gain = ctx.createGain()
    gain.gain.value = 0
    gain.gain.setTargetAtTime(1, now, 0.8)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = day ? 760 : 520
    filter.Q.value = 0.6
    filter.connect(gain).connect(this.inside)
    const nodes: AudioScheduledSourceNode[] = []
    // Minor-ninth voicing: root, fifth, octave, minor tenth, ninth.
    for (const [ratio, level] of [
      [1, 0.05],
      [1.5, 0.035],
      [2, 0.03],
      [2.378, 0.02],
      [4.49, 0.008],
    ] as const) {
      for (const detune of [-7, 7]) {
        const o = ctx.createOscillator()
        o.type = day ? 'triangle' : 'sawtooth'
        o.frequency.value = root * ratio
        o.detune.value = detune
        const g = ctx.createGain()
        g.gain.value = level * (day ? 0.55 : 0.5)
        o.connect(g).connect(filter)
        o.start()
        nodes.push(o)
      }
    }
    this.pad = { gain, nodes }
  }

  /** Called when the visitor changes space. */
  environment(zone: Zone, mood: number | null) {
    const ctx = this.ctx
    if (!ctx) return
    this.zone = zone
    const now = ctx.currentTime
    const outside = zone === 'courtyard'
    this.outside.gain.setTargetAtTime(outside ? 1 : 0.06, now, 0.5)
    this.inside.gain.setTargetAtTime(outside ? 0.05 : 1, now, 0.5)
    const wet = { courtyard: 0.08, entrance: 0.3, rotunda: 0.65, gallery: 0.45, room: 0.38 }[zone]
    this.wet.gain.setTargetAtTime(wet, now, 0.4)
    if (zone === 'room' && mood !== null) this.setPad(MOOD_ROOTS[mood % MOOD_ROOTS.length], `room-${mood}`)
    else if (zone === 'rotunda') this.setPad(82.41, 'rotunda')
    else if (zone === 'gallery' || zone === 'entrance') this.setPad(73.42, 'gallery')
  }

  private env(duration: number, peak: number) {
    const ctx = this.ctx!
    const g = ctx.createGain()
    const t = ctx.currentTime
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(peak, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    return g
  }

  footstep(intensity = 1) {
    const ctx = this.ctx
    if (!ctx || this.muted || ctx.state !== 'running' || !this.noise) return
    const t = ctx.currentTime
    if (t - this.lastStep < 0.18) return
    this.lastStep = t
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 700 + Math.random() * 500
    bp.Q.value = 1.4
    const g = this.env(0.09, 0.5 * intensity)
    src.connect(bp).connect(g)
    g.connect(this.dry)
    g.connect(this.wet)
    src.start(t, Math.random() * 4, 0.12)
    const thump = ctx.createOscillator()
    thump.frequency.setValueAtTime(90, t)
    thump.frequency.exponentialRampToValueAtTime(45, t + 0.08)
    const tg = this.env(0.1, 0.12 * intensity)
    thump.connect(tg).connect(this.dry)
    thump.start(t)
    thump.stop(t + 0.12)
  }

  tick() {
    const ctx = this.ctx
    if (!ctx || this.muted || ctx.state !== 'running') return
    const o = ctx.createOscillator()
    o.type = 'triangle'
    o.frequency.setValueAtTime(1600, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.05)
    const g = this.env(0.08, 0.05)
    o.connect(g)
    g.connect(this.dry)
    g.connect(this.wet)
    o.start()
    o.stop(ctx.currentTime + 0.1)
  }

  whoosh() {
    const ctx = this.ctx
    if (!ctx || this.muted || ctx.state !== 'running' || !this.noise) return
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 2
    bp.frequency.setValueAtTime(260, t)
    bp.frequency.exponentialRampToValueAtTime(2400, t + 0.45)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.6, t + 0.2)
    g.gain.linearRampToValueAtTime(0, t + 0.6)
    src.connect(bp).connect(g)
    g.connect(this.dry)
    g.connect(this.wet)
    src.start(t, 0, 0.7)
  }

  chime() {
    const ctx = this.ctx
    if (!ctx || this.muted || ctx.state !== 'running') return
    ;[880, 1318.5].forEach((f, i) => {
      const t = ctx.currentTime + i * 0.09
      const o = ctx.createOscillator()
      o.frequency.value = f
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.06, t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9)
      o.connect(g)
      g.connect(this.dry)
      g.connect(this.wet)
      o.start(t)
      o.stop(t + 1)
    })
  }

  /** Day: a short phrase of birdsong now and then while outside. */
  private birdsong() {
    const ctx = this.ctx
    if (!ctx || this.muted || this.theme !== 'day' || this.zone !== 'courtyard' || ctx.state !== 'running' || Math.random() < 0.35) return
    const base = 2000 + Math.random() * 1400
    const notes = 2 + Math.floor(Math.random() * 3)
    for (let i = 0; i < notes; i++) {
      const t = ctx.currentTime + i * (0.12 + Math.random() * 0.1)
      const o = ctx.createOscillator()
      o.frequency.setValueAtTime(base * (1 + i * 0.08), t)
      o.frequency.exponentialRampToValueAtTime(base * 1.45, t + 0.04)
      o.frequency.exponentialRampToValueAtTime(base * 0.85, t + 0.11)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.035, t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13)
      const pan = ctx.createStereoPanner()
      pan.pan.value = Math.random() * 1.6 - 0.8
      o.connect(g).connect(pan).connect(this.outside)
      o.start(t)
      o.stop(t + 0.15)
    }
  }

  /** Switch the soundscape between the daylit gallery and neon night. */
  setTheme(theme: ThemeName) {
    this.theme = theme
    const ctx = this.ctx
    if (!ctx) return
    this.hum.gain.setTargetAtTime(theme === 'night' ? 1 : 0, ctx.currentTime, 0.5)
    const root = this.padRoot
    this.padKey = ''
    this.setPad(root, `${theme}-${root}`)
  }

  mute(muted: boolean) {
    this.muted = muted
    if (this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.15)
  }

  suspend() {
    void this.ctx?.suspend()
  }

  resume() {
    void this.ctx?.resume()
  }
}

export const audio = new MuseumAudio()
