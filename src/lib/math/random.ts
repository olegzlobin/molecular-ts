import { roundWithStep } from './helpers';

type NumberFactory = ((bounds: [number, number, number?, number?, number?], precision?: number) => number) |
  ((bounds: [number, number, number?, number?, number?], precision?: number) => number);

type RandomBounds = [number, number, number?, number?, number?];

function applyMedian(from: number, until: number, median?: number): [number, number] {
  if (median === undefined) {
    return [from, until];
  }

  if (Math.random() > 0.5) {
    return [median, until];
  }

  return [from, median];
}

function getBoundsMean(bounds: RandomBounds): number {
  if (bounds[2] !== undefined && bounds[2] !== null) {
    return bounds[2];
  }
  return (bounds[0] + bounds[1]) / 2;
}

function getDeviationShare(bounds: RandomBounds): number {
  const share = bounds[4];
  if (share === undefined || share === null) {
    return 1;
  }
  return Math.min(1, Math.max(0, share));
}

export function createRandomInteger(bounds: RandomBounds): number {
  if (Math.random() >= getDeviationShare(bounds)) {
    return Math.round(getBoundsMean(bounds));
  }
  let [from, until] = bounds;
  const median = bounds[2] ?? undefined;
  [from, until] = applyMedian(from, until, median);
  return Math.round(Math.random() * (until - from) + from);
}

export function createRandomFloat(
  bounds: RandomBounds,
  precision?: number,
): number {
  const step = bounds[3] ?? undefined;
  if (Math.random() >= getDeviationShare(bounds)) {
    const mean = getBoundsMean(bounds);
    if (step !== undefined && step !== 0) {
      return roundWithStep(mean, step, precision);
    }
    return mean;
  }

  let [from, until] = bounds;
  const median = bounds[2] ?? undefined;
  [from, until] = applyMedian(from, until, median);

  let result = Math.random() * (until - from) + from;
  if (step !== undefined && step !== 0) {
    result = roundWithStep(result, step, precision);
  }
  return result;
}

export function randomizeMatrix(
  count: number,
  bounds: RandomBounds,
  numberFactory: NumberFactory,
  symmetric: boolean = false,
  precision?: number,
): number[][] {
  const result: number[][] = [];
  for (let i=0; i<count; ++i) {
    result.push([]);
    for (let j=0; j<count; ++j) {
      if (symmetric && i > j) {
        result[i].push(result[j][i]);
      } else {
        result[i].push(numberFactory(bounds, precision));
      }
    }
  }
  return result;
}

export function normalizeFrequencies(weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b);
  return weights.map((x) => x / sum);
}

export function getIndexByFrequencies(frequencies: number[]): number {
  const normFrequencies = normalizeFrequencies(frequencies);
  const rand = Math.random();
  let sum = 0;
  for (let i=0; i<normFrequencies.length; ++i) {
    sum += normFrequencies[i];
    if (rand <= sum) {
      return i;
    }
  }
  return 0;
}

export function getRandomArrayItem<T>(input: T[]): T {
  return input[Math.floor(Math.random() * input.length)];
}
