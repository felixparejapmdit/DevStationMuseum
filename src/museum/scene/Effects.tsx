'use client'
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useScene, type Tier } from '../store'

/**
 * Night: bloom makes the neon glow. Day: ambient occlusion grounds the white-cube
 * architecture (soft shading in corners, under benches and frames) with a hint of
 * bloom on the skylights. Tone mapping happens here because the composer renders in HDR.
 */
export function Effects({ tier }: { tier: Tier }) {
  const t = useScene()
  const day = t.name === 'day'
  if (tier === 'high') {
    return day ? (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <N8AO aoRadius={1.1} distanceFalloff={0.8} intensity={2.2} quality="medium" halfRes color="#2a2018" />
        <Bloom mipmapBlur intensity={t.bloom.intensity} luminanceThreshold={t.bloom.threshold} luminanceSmoothing={0.3} radius={0.7} />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        <SMAA />
        <Vignette offset={0.35} darkness={0.35} />
      </EffectComposer>
    ) : (
      <EffectComposer multisampling={2} enableNormalPass={false}>
        <Bloom mipmapBlur intensity={t.bloom.intensity} luminanceThreshold={t.bloom.threshold} luminanceSmoothing={0.2} radius={0.78} />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        <Vignette offset={0.28} darkness={0.72} />
      </EffectComposer>
    )
  }
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom mipmapBlur intensity={t.bloom.intensity * 0.85} luminanceThreshold={t.bloom.threshold} luminanceSmoothing={0.2} radius={0.7} levels={5} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <SMAA />
    </EffectComposer>
  )
}
