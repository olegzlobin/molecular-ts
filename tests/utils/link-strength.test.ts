import { describe, expect, it } from '@jest/globals';
import { createTransparentTypesConfig } from '@/lib/config/atom-types';
import { createAtom } from '@/lib/utils/functions';
import { LinkManager } from '@/lib/utils/structs';
import { linkStrengthFactor } from '@/lib/utils/link-strength';

describe('linkStrengthFactor', () => {
  it('returns 1 with no agents', () => {
    const types = createTransparentTypesConfig(2);
    const a = createAtom(0, [0, 0], undefined, 0);
    const b = createAtom(1, [1, 0], undefined, 1);
    expect(linkStrengthFactor(types, a, b)).toBe(1);
  });

  it('multiplies by agent factor when third type is bonded', () => {
    const types = createTransparentTypesConfig(3);
    types.LINK_STRENGTH_FACTOR[2][0][1] = 0.5;
    const links = new LinkManager();
    const a = createAtom(0, [0, 0], undefined, 0);
    const b = createAtom(1, [1, 0], undefined, 1);
    const c = createAtom(2, [0, 1], undefined, 2);
    links.create(a, b, 1);
    links.create(a, c, 1);
    expect(linkStrengthFactor(types, a, b)).toBe(0.5);
  });
});
