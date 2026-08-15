import type { TypesConfig } from './types';
import { createFilledMatrix } from '../math/factories';

export function typeLinkLimit(valence: number, weight: number): number {
  if (valence <= 0) {
    return 0;
  }
  const w = Math.max(1, Math.round(weight));
  return Math.floor(valence / w);
}

export function deriveTypeLinksMatrix(links: number[], weights: number[][]): number[][] {
  const n = links.length;
  const result = createFilledMatrix(n, n, 0);
  for (let i = 0; i < n; ++i) {
    for (let j = 0; j < n; ++j) {
      result[i][j] = typeLinkLimit(links[i], weights[i]?.[j] ?? 1);
    }
  }
  return result;
}

export function syncDerivedTypeLinks(config: TypesConfig): void {
  if (!config.LINKS?.length || !config.TYPE_LINK_WEIGHTS?.length) {
    return;
  }
  const derived = deriveTypeLinksMatrix(config.LINKS, config.TYPE_LINK_WEIGHTS);
  const n = derived.length;
  if (
    config.TYPE_LINKS?.length === n
    && config.TYPE_LINKS.every((row, i) => row.length === n)
  ) {
    for (let i = 0; i < n; ++i) {
      for (let j = 0; j < n; ++j) {
        config.TYPE_LINKS[i][j] = derived[i][j];
      }
    }
    return;
  }
  config.TYPE_LINKS = derived;
}
