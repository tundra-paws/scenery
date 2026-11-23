// src/overrides.ts
import type { QualityTier } from 'threejs-scenes'
import { WORLD_SEED } from './world/world.ts'


const TIERS: readonly QualityTier[] = [ 'mobile', 'desktop', 'highEnd' ]

/** What the query string asks for instead of what the page would choose itself. */
export interface Overrides {

  /** `?harness=1`: no loop, no input, time advances only when a capture asks. */
  harness: boolean

  /** `?tier=mobile|desktop|highEnd`: skip device detection. */
  tier: QualityTier | null

  /** `?seed=<positive integer>`: build a different world. */
  seed: number
}

export function readOverrides (search: string): Overrides {
  const params = new URLSearchParams(search)
  const tier   = params.get('tier')
  const seed   = Number(params.get('seed'))

  return {
    harness: params.get('harness') === '1',
    tier:    TIERS.find(known => known === tier) ?? null,
    seed:    Number.isInteger(seed) && seed > 0 ? seed : WORLD_SEED,
  }
}
