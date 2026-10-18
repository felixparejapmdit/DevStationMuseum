'use client'
import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import type { Tier } from '../store'

/** Bloom makes the neon glow; tone mapping is done here because the composer renders in HDR. */
export function Effects({ tier }: { tier: Tier }) {
  if (tier === 'high') {
    return (
      <EffectComposer multisampling={2} enableNormalPass={false}>
        <Bloom mipmapBlur intensity={0.95} luminanceThreshold={1} luminanceSmoothing={0.2} radius={0.78} />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        <Vignette offset={0.28} darkness={0.72} />
      </EffectComposer>
    )
  }
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom mipmapBlur intensity={0.8} luminanceThreshold={1} luminanceSmoothing={0.2} radius={0.7} levels={5} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <SMAA />
    </EffectComposer>
  )
}
