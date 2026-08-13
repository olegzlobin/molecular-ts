import type { TypesConfig } from './types';
import {
  createFilledArray,
  createFilledMatrix,
  createFilledTensor,
} from '../math/factories';
import {
  concatArrays,
  concatMatrices,
  concatTensors,
  crossArrays,
  crossArraysByIndexes,
  crossMatrices,
  crossMatricesByIndexes,
  crossTensors,
  crossTensorsByIndexes,
  copyArrayIndex,
  copyMatrixIndex,
  copyTensorIndex,
  randomCrossArrays,
  randomCrossMatrices,
  randomCrossTensors,
  removeIndexFromArray,
  removeIndexFromMatrix,
  removeIndexFromTensor,
} from '../math/operations';

type TypeFieldRank = 1 | 2 | 3;

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
  { key: 'LINK_FACTOR_DISTANCE', rank: 3, fill: 1 },
  { key: 'LINK_FACTOR_ELASTIC', rank: 3, fill: 1 },
];

export function createFilledTypeField(field: TypeNumericField, typesCount: number): unknown {
  if (field.rank === 1) {
    return createFilledArray(typesCount, field.fill);
  }
  if (field.rank === 2) {
    return createFilledMatrix(typesCount, typesCount, field.fill);
  }
  return createFilledTensor(typesCount, typesCount, typesCount, field.fill);
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

function ensureTensor(config: TypesConfig, field: TypeNumericField, n: number): number[][][] {
  const value = config[field.key] as number[][][] | undefined;
  const ok = value?.length === n
    && value.every((row) => row.length === n && row.every((col) => col.length === n));
  return ok ? value! : createFilledTensor(n, n, n, field.fill);
}

type FieldOps = {
  list: (lhs: number[], rhs: number[], fill: number) => unknown;
  matrix: (lhs: number[][], rhs: number[][], fill: number) => unknown;
  tensor: (lhs: number[][][], rhs: number[][][], fill: number) => unknown;
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
    } else if (field.rank === 2) {
      writeField(result, field, ops.matrix(ensureMatrix(lhs, field, nL), ensureMatrix(rhs, field, nR), field.fill));
    } else {
      writeField(result, field, ops.tensor(ensureTensor(lhs, field, nL), ensureTensor(rhs, field, nR), field.fill));
    }
  }
}

type UnaryFieldOps = {
  list: (value: number[], fill: number) => unknown;
  matrix: (value: number[][], fill: number) => unknown;
  tensor: (value: number[][][], fill: number) => unknown;
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
    } else if (field.rank === 2) {
      writeField(result, field, ops.matrix(ensureMatrix(input, field, n), field.fill));
    } else {
      writeField(result, field, ops.tensor(ensureTensor(input, field, n), field.fill));
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
    } else if (field.rank === 2) {
      writeField(config, field, ensureMatrix(config, field, typesCount));
    } else {
      writeField(config, field, ensureTensor(config, field, typesCount));
    }
  }
}

export function concatNumericTypesFields(result: TypesConfig, lhs: TypesConfig, rhs: TypesConfig): void {
  mapNumericFields(result, lhs, rhs, {
    list: (a, b) => concatArrays(a, b),
    matrix: (a, b, fill) => concatMatrices(a, b, fill),
    tensor: (a, b, fill) => concatTensors(a, b, fill),
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
    tensor: (a, b, fill) => crossTensors(a, b, separator, fill),
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
    tensor: (a, b) => randomCrossTensors(a, b, separator),
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
    tensor: (a, b) => crossTensorsByIndexes(a, b, indexes),
  });
}

export function removeNumericTypesFieldIndex(result: TypesConfig, input: TypesConfig, index: number): void {
  mapNumericFieldsUnary(result, input, {
    list: (value) => removeIndexFromArray(value, index),
    matrix: (value) => removeIndexFromMatrix(value, index),
    tensor: (value) => removeIndexFromTensor(value, index),
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
    tensor: (value) => copyTensorIndex(value, indexFrom, indexTo),
  });
}
