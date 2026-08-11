import { describe, expect, test } from '@jest/globals';
import {
  decodeTransformType,
  encodeTransform,
  isMergeTransform,
} from '../../src/lib/config/types';

describe('transform encode/decode', () => {
  test('type change stays non-negative', () => {
    expect(encodeTransform(2, false)).toBe(2);
    expect(isMergeTransform(2)).toBe(false);
    expect(decodeTransformType(2)).toBe(2);
  });

  test('merge encodes as negative', () => {
    expect(encodeTransform(0, true)).toBe(-1);
    expect(encodeTransform(3, true)).toBe(-4);
    expect(isMergeTransform(-4)).toBe(true);
    expect(decodeTransformType(-4)).toBe(3);
  });
});
