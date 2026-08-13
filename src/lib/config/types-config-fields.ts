import type { TypesConfig } from './types';
import {
  createFilledArray,
  createFilledMatrix,
} from '../math/factories';
import {
  concatArrays,
  concatMatrices,
  crossArrays,
  crossArraysByIndexes,
  crossMatrices,
  crossMatricesByIndexes,
  copyArrayIndex,
  copyMatrixIndex,
  randomCrossArrays,
  randomCrossMatrices,
  removeIndexFromArray,
  removeIndexFromMatrix,
} from '../math/operations';

type TypeFieldRank = 1 | 2;

export type TypeNumericField = {
  key: keyof TypesConfig;
  rank: TypeFieldRank;
  fill: number;
};

export const TYPE_NUMERIC_FIELDS: TypeNumericField[] = [
  { key: 'RADIUS', rank: 1, fill: 1 },
  { key: 'CHARGE', rank: 1, fill: 0 },
  { key: 'FREQUENCIES', rank: 1, fill: 1 },
  { key: 'LINKS', rank: 1, fill: 0 },
  { key: 'LINK_LENGTH', rank: 1, fill: 1 },
  { key: 'LINK_STIFFNESS', rank: 1, fill: 1 },
  { key: 'GRAVITY', rank: 2, fill: 0 },
  { key: 'LINK_GRAVITY', rank: 2, fill: 0 },
  { key: 'TYPE_LINKS', rank: 2, fill: 0 },
  { key: 'TYPE_LINK_WEIGHTS', rank: 2, fill: 1 },
  { key: 'BOND_PREFERENCE', rank: 2, fill: 0 },
];

export function createFilledTypeField(field: TypeNumericField, typesCount: number): unknown {
  if (field.rank === 1) {
    return createFilledArray(typesCount, field.fill);
  }
  return createFilledMatrix(typesCount, typesCount, field.fill);
}

function writeField(config: TypesConfig, field: TypeNumericField, value: unknown): void {
  (config as Record<string, unknown>)[field.key as string] = value;
}

function ensureList(config: TypesConfig, field: TypeNumericField, n: number): number[] {
  const value = config[field.key] as number[] | undefined;
  return value?.length === n ? value : createFilledArray(n, field.fill);
}

function ensureMatrix(config: TypesConfig, field: TypeNumericField, n: number): number[][] {
  const value = config[field.key] as number[][] | undefined;
  return value?.length === n && value.every((row) => row.length === n)
    ? value
    : createFilledMatrix(n, n, field.fill);
}

type FieldOps = {
  list: (lhs: number[], rhs: number[], fill: number) => unknown;
  matrix: (lhs: number[][], rhs: number[][], fill: number) => unknown;
};

function mapNumericFields(
  result: TypesConfig,
  lhs: TypesConfig,
  rhs: TypesConfig,
  ops: FieldOps,
): void {
  const nL = lhs.RADIUS.length;
  const nR = rhs.RADIUS.length;
  for (const field of TYPE_NUMERIC_FIELDS) {
    if (field.rank === 1) {
      writeField(result, field, ops.list(ensureList(lhs, field, nL), ensureList(rhs, field, nR), field.fill));
    } else {
      writeField(result, field, ops.matrix(ensureMatrix(lhs, field, nL), ensureMatrix(rhs, field, nR), field.fill));
    }
  }
}

type UnaryFieldOps = {
  list: (value: number[], fill: number) => unknown;
  matrix: (value: number[][], fill: number) => unknown;
};

function mapNumericFieldsUnary(
  result: TypesConfig,
  input: TypesConfig,
  ops: UnaryFieldOps,
): void {
  const n = input.RADIUS.length;
  for (const field of TYPE_NUMERIC_FIELDS) {
    if (field.rank === 1) {
      writeField(result, field, ops.list(ensureList(input, field, n), field.fill));
    } else {
      writeField(result, field, ops.matrix(ensureMatrix(input, field, n), field.fill));
    }
  }
}

export function fillNumericTypesFields(config: TypesConfig, typesCount: number): void {
  for (const field of TYPE_NUMERIC_FIELDS) {
    writeField(config, field, createFilledTypeField(field, typesCount));
  }
}

export function ensureNumericTypesFields(config: TypesConfig): void {
  const typesCount = config.FREQUENCIES?.length ?? config.RADIUS?.length ?? 0;
  if (!typesCount) {
    return;
  }
  for (const field of TYPE_NUMERIC_FIELDS) {
    if (field.rank === 1) {
      writeField(config, field, ensureList(config, field, typesCount));
    } else {
      writeField(config, field, ensureMatrix(config, field, typesCount));
    }
  }
}

export function concatNumericTypesFields(result: TypesConfig, lhs: TypesConfig, rhs: TypesConfig): void {
  mapNumericFields(result, lhs, rhs, {
    list: (a, b) => concatArrays(a, b),
    matrix: (a, b, fill) => concatMatrices(a, b, fill),
  });
}

export function crossNumericTypesFields(
  result: TypesConfig,
  lhs: TypesConfig,
  rhs: TypesConfig,
  separator: number,
): void {
  mapNumericFields(result, lhs, rhs, {
    list: (a, b) => crossArrays(a, b, separator),
    matrix: (a, b, fill) => crossMatrices(a, b, separator, fill),
  });
}

export function randomCrossNumericTypesFields(
  result: TypesConfig,
  lhs: TypesConfig,
  rhs: TypesConfig,
  separator: number,
): void {
  mapNumericFields(result, lhs, rhs, {
    list: (a, b) => randomCrossArrays(a, b, separator),
    matrix: (a, b) => randomCrossMatrices(a, b, separator),
  });
}

export function crossNumericTypesFieldsByIndexes(
  result: TypesConfig,
  lhs: TypesConfig,
  rhs: TypesConfig,
  indexes: number[],
): void {
  mapNumericFields(result, lhs, rhs, {
    list: (a, b) => crossArraysByIndexes(a, b, indexes),
    matrix: (a, b) => crossMatricesByIndexes(a, b, indexes),
  });
}

export function removeNumericTypesFieldIndex(result: TypesConfig, input: TypesConfig, index: number): void {
  mapNumericFieldsUnary(result, input, {
    list: (value) => removeIndexFromArray(value, index),
    matrix: (value) => removeIndexFromMatrix(value, index),
  });
}

export function copyNumericTypesFieldIndex(
  result: TypesConfig,
  input: TypesConfig,
  indexFrom: number,
  indexTo: number,
): void {
  mapNumericFieldsUnary(result, input, {
    list: (value) => copyArrayIndex(value, indexFrom, indexTo),
    matrix: (value) => copyMatrixIndex(value, indexFrom, indexTo),
  });
}
