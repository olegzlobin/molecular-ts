import { describe, expect, it } from '@jest/globals';
import { deriveTypeLinksMatrix, typeLinkLimit } from '@/lib/config/bond-limits';

describe('derived type links', () => {
  it('uses floor(valence / weight)', () => {
    expect(typeLinkLimit(4, 2)).toBe(2);
    expect(typeLinkLimit(2, 2)).toBe(1);
    expect(typeLinkLimit(3, 3)).toBe(1);
    expect(typeLinkLimit(0, 1)).toBe(0);
  });

  it('builds matrix from links and weights', () => {
    expect(deriveTypeLinksMatrix(
      [4, 1, 2, 3],
      [
        [1, 1, 2, 1],
        [1, 1, 1, 1],
        [2, 1, 2, 1],
        [1, 1, 1, 3],
      ],
    )).toEqual([
      [4, 4, 2, 4],
      [1, 1, 1, 1],
      [1, 2, 1, 2],
      [3, 3, 3, 1],
    ]);
  });
});
