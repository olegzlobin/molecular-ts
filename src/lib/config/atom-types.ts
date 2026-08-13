import type {
  ColorVector,
  RandomTypesConfig,
  TypesConfig,
  TypesSymmetricConfig,
} from './types';
import {
  getRandomColor,
  fullCopyObject,
  getDifferentRandomColor,
} from '../utils/functions';
import {
  concatArrays,
  createFilledMatrix,
  createFilledArray,
  createRandomFloat,
  createRandomInteger,
  randomizeMatrix,
} from '../math';
import {
  copyArrayIndex,
  makeMatrixSymmetric,
  removeIndexFromArray,
} from '../math/operations';
import {
  concatNumericTypesFields,
  copyNumericTypesFieldIndex,
  crossNumericTypesFields,
  crossNumericTypesFieldsByIndexes,
  fillNumericTypesFields,
  randomCrossNumericTypesFields,
  removeNumericTypesFieldIndex,
} from './types-config-fields';

export const COLORS_PREDEFINED: Array<ColorVector> = [
  [250, 20, 20],
  [200, 140, 100],
  [80, 170, 140],
  [180, 180, 80],
  [70, 120, 250],
  [250, 100, 250],
  [206, 255, 182],
  [157, 68, 216],
  [61, 192, 249],
  [121, 242, 52],
];

export function createColors(count: number, randomize: boolean = false, usePredefined: boolean = true, smartChoice: boolean = false): Array<ColorVector> {
  const result: Array<ColorVector> = [];

  if (!randomize) {
    const predefined = fullCopyObject(COLORS_PREDEFINED) as Array<ColorVector>;
    for (let i = 0; i < count; ++i) {
      if (i < predefined.length) {
        result.push(predefined[i]);
      } else {
        result.push(getRandomColor());
      }
    }
    return result;
  }

  const predefined: Array<ColorVector> = usePredefined
    ? (fullCopyObject(COLORS_PREDEFINED) as Array<ColorVector>).reverse()
    : [];
  for (let i = 0; i < count; ++i) {
    if (predefined.length) {
      result.push(predefined.pop() as ColorVector);
    } else if (smartChoice) {
      result.push(getDifferentRandomColor(result));
    } else {
      result.push(getRandomColor());
    }
  }
  return result;
}

export function createDefaultTypesConfig(): TypesConfig {
  // 0 = C, 1 = H, 2 = O, 3 = N
  return {
    COLORS: [
      [170, 170, 185],
      [230, 230, 235],
      [220, 45, 45],
      [50, 110, 230],
    ],
    FREQUENCIES: [1, 2, 1, 0.2],
    RADIUS: [1, 0.6, 1, 1],
    CHARGE: [0, 0, 0, 0],
    GRAVITY: createFilledMatrix(4, 4, 0),
    // Strong C–C repulsion while bonded keeps carbon networks from collapsing into mush
    LINK_GRAVITY: [
      [-15, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    LINKS: [4, 1, 2, 3],
    TYPE_LINKS: [
      [4, 4, 2, 3],
      [4, 1, 2, 1],
      [2, 2, 2, 1],
      [3, 3, 1, 3],
    ],
    TYPE_LINK_WEIGHTS: [
      // C–O=2 (CO₂); O–O=2 (O₂); N–N=3 (N₂)
      [1, 1, 2, 1],
      [1, 1, 1, 1],
      [2, 1, 2, 1],
      [1, 1, 1, 3],
    ],
    BOND_PREFERENCE: [
      // Roughly follows bond strength: N≡N ≫ O–H / C=O > C–H / H–H > C–C > O=O > N–O
      // So H₂O and CO₂ win over H₂/O₂/C-networks; N₂ stays inert.
      [2.0, 2.5, 2.9, 1.9],
      [2.5, 2.2, 3.0, 2.4],
      [2.9, 3.0, 1.7, 1.1],
      [1.9, 2.4, 1.1, 3.8],
    ],
    LINK_LENGTH: [1, 0.7, 1, 1],
    LINK_STIFFNESS: [1, 1, 1, 1],
    TRANSFORMATION: {},
    DECAYS: {},
  };
}

export function createTransparentTypesConfig(typesCount: number): TypesConfig {
  const config = {
    COLORS: createColors(typesCount),
    TRANSFORMATION: {},
    DECAYS: {},
  } as TypesConfig;
  fillNumericTypesFields(config, typesCount);
  return config;
}

export function pickUnusedTypeColor(existing: ColorVector[]): ColorVector {
  const used = new Set(existing.map((color) => color.join(',')));
  for (const color of COLORS_PREDEFINED) {
    if (!used.has(color.join(','))) {
      return [color[0], color[1], color[2]];
    }
  }
  return getDifferentRandomColor(existing);
}

export function createSingleTypeConfig(existingColors: ColorVector[] = []): TypesConfig {
  const config = createTransparentTypesConfig(1);
  config.COLORS = [pickUnusedTypeColor(existingColors)];
  return config;
}

export function createRandomTypesConfig({
  TYPES_COUNT,
  RADIUS_BOUNDS,
  FREQUENCY_BOUNDS,
  CHARGE_BOUNDS,
  GRAVITY_BOUNDS,
  LINK_GRAVITY_BOUNDS,
  LINK_BOUNDS,
  LINK_TYPE_BOUNDS,
  LINK_TYPE_WEIGHT_BOUNDS,
  BOND_PREFERENCE_BOUNDS,
  LINK_LENGTH_BOUNDS,
  LINK_STIFFNESS_BOUNDS,
  GRAVITY_MATRIX_SYMMETRIC,
  LINK_GRAVITY_MATRIX_SYMMETRIC,
  LINK_TYPE_MATRIX_SYMMETRIC,
  LINK_TYPE_WEIGHT_MATRIX_SYMMETRIC,
  BOND_PREFERENCE_MATRIX_SYMMETRIC,
}: RandomTypesConfig): TypesConfig {
  const precision = 8;

  const radius: number[] = [];
  for (let i=0; i<TYPES_COUNT; ++i) {
    radius.push(createRandomFloat(RADIUS_BOUNDS, precision));
  }

  const gravity = randomizeMatrix(
    TYPES_COUNT,
    GRAVITY_BOUNDS,
    createRandomFloat,
    GRAVITY_MATRIX_SYMMETRIC,
    precision,
  );

  const frequencies: number[] = [];
  for (let i=0; i<TYPES_COUNT; ++i) {
    frequencies.push(createRandomFloat(FREQUENCY_BOUNDS, precision));
  }

  const charge: number[] = [];
  for (let i=0; i<TYPES_COUNT; ++i) {
    charge.push(createRandomFloat(CHARGE_BOUNDS, precision));
  }

  const bondPreference = randomizeMatrix(
    TYPES_COUNT,
    BOND_PREFERENCE_BOUNDS,
    createRandomFloat,
    BOND_PREFERENCE_MATRIX_SYMMETRIC,
    precision,
  );

  const linkGravity = randomizeMatrix(
    TYPES_COUNT,
    LINK_GRAVITY_BOUNDS,
    createRandomFloat,
    LINK_GRAVITY_MATRIX_SYMMETRIC,
    precision,
  );

  const links: number[] = [];
  for (let i=0; i<TYPES_COUNT; ++i) {
    links.push(createRandomInteger(LINK_BOUNDS));
  }

  const typeLinks = randomizeMatrix(
    TYPES_COUNT,
    LINK_TYPE_BOUNDS,
    createRandomInteger,
    LINK_TYPE_MATRIX_SYMMETRIC,
    precision,
  );

  const typeLinkWeights = randomizeMatrix(
    TYPES_COUNT,
    LINK_TYPE_WEIGHT_BOUNDS,
    createRandomFloat,
    LINK_TYPE_WEIGHT_MATRIX_SYMMETRIC,
    precision,
  );

  const linkLength: number[] = [];
  for (let i=0; i<TYPES_COUNT; ++i) {
    linkLength.push(createRandomFloat(LINK_LENGTH_BOUNDS, precision));
  }

  const linkStiffness: number[] = [];
  for (let i=0; i<TYPES_COUNT; ++i) {
    linkStiffness.push(createRandomFloat(LINK_STIFFNESS_BOUNDS, precision));
  }


  return {
    RADIUS: radius,
    CHARGE: charge,
    GRAVITY: gravity,
    FREQUENCIES: frequencies,
    LINK_GRAVITY: linkGravity,
    LINKS: links,
    TYPE_LINKS: typeLinks,
    TYPE_LINK_WEIGHTS: typeLinkWeights,
    BOND_PREFERENCE: bondPreference,
    LINK_LENGTH: linkLength,
    LINK_STIFFNESS: linkStiffness,
    COLORS: createColors(TYPES_COUNT),
    TRANSFORMATION: {},
    DECAYS: {}, // TODO randomize it
  };
}

export function createRandomIntTypesConfig({
  TYPES_COUNT,
  RADIUS_BOUNDS,
  FREQUENCY_BOUNDS,
  CHARGE_BOUNDS,
  GRAVITY_BOUNDS,
  LINK_GRAVITY_BOUNDS,
  LINK_BOUNDS,
  LINK_TYPE_BOUNDS,
  LINK_TYPE_WEIGHT_BOUNDS,
  BOND_PREFERENCE_BOUNDS,
  LINK_LENGTH_BOUNDS,
  LINK_STIFFNESS_BOUNDS,
  GRAVITY_MATRIX_SYMMETRIC,
  LINK_GRAVITY_MATRIX_SYMMETRIC,
  LINK_TYPE_MATRIX_SYMMETRIC,
  LINK_TYPE_WEIGHT_MATRIX_SYMMETRIC,
  BOND_PREFERENCE_MATRIX_SYMMETRIC,
}: RandomTypesConfig): TypesConfig {
  const radius: number[] = [];
  for (let i=0; i<TYPES_COUNT; ++i) {
    radius.push(createRandomInteger([RADIUS_BOUNDS[0], RADIUS_BOUNDS[1]]));
  }

  const gravity = randomizeMatrix(
    TYPES_COUNT,
    GRAVITY_BOUNDS,
    createRandomInteger,
    GRAVITY_MATRIX_SYMMETRIC,
    0,
  );

  const frequencies: number[] = [];
  for (let i=0; i<TYPES_COUNT; ++i) {
    frequencies.push(createRandomInteger([FREQUENCY_BOUNDS[0], FREQUENCY_BOUNDS[1]]));
  }

  const charge: number[] = [];
  for (let i=0; i<TYPES_COUNT; ++i) {
    charge.push(createRandomInteger([CHARGE_BOUNDS[0], CHARGE_BOUNDS[1]]));
  }

  const bondPreference = randomizeMatrix(
    TYPES_COUNT,
    BOND_PREFERENCE_BOUNDS,
    createRandomInteger,
    BOND_PREFERENCE_MATRIX_SYMMETRIC,
    0,
  );

  const linkGravity = randomizeMatrix(
    TYPES_COUNT,
    LINK_GRAVITY_BOUNDS,
    createRandomInteger,
    LINK_GRAVITY_MATRIX_SYMMETRIC,
    0,
  );

  const links: number[] = [];
  for (let i=0; i<TYPES_COUNT; ++i) {
    links.push(createRandomInteger(LINK_BOUNDS));
  }

  const typeLinks = randomizeMatrix(
    TYPES_COUNT,
    LINK_TYPE_BOUNDS,
    createRandomInteger,
    LINK_TYPE_MATRIX_SYMMETRIC,
    0,
  );

  const typeLinkWeights = randomizeMatrix(
    TYPES_COUNT,
    LINK_TYPE_WEIGHT_BOUNDS,
    createRandomInteger,
    LINK_TYPE_WEIGHT_MATRIX_SYMMETRIC,
    0,
  );

  const linkLength: number[] = [];
  for (let i=0; i<TYPES_COUNT; ++i) {
    linkLength.push(createRandomInteger([LINK_LENGTH_BOUNDS[0], LINK_LENGTH_BOUNDS[1]]));
  }

  const linkStiffness: number[] = [];
  for (let i=0; i<TYPES_COUNT; ++i) {
    linkStiffness.push(createRandomInteger([LINK_STIFFNESS_BOUNDS[0], LINK_STIFFNESS_BOUNDS[1]]));
  }


  return {
    RADIUS: radius,
    CHARGE: charge,
    GRAVITY: gravity,
    FREQUENCIES: frequencies,
    LINK_GRAVITY: linkGravity,
    LINKS: links,
    TYPE_LINKS: typeLinks,
    TYPE_LINK_WEIGHTS: typeLinkWeights,
    BOND_PREFERENCE: bondPreference,
    LINK_LENGTH: linkLength,
    LINK_STIFFNESS: linkStiffness,
    COLORS: createColors(TYPES_COUNT),
    TRANSFORMATION: {},
    DECAYS: {}, // TODO randomize it
  };
}

export function createDefaultRandomTypesConfig(typesCount: number): RandomTypesConfig {
  return {
    TYPES_COUNT: typesCount,

    USE_RADIUS_BOUNDS: false,
    USE_FREQUENCY_BOUNDS: false,
    USE_CHARGE_BOUNDS: false,
    USE_GRAVITY_BOUNDS: true,
    USE_LINK_GRAVITY_BOUNDS: true,
    USE_LINK_BOUNDS: true,
    USE_LINK_TYPE_BOUNDS: true,
    USE_LINK_TYPE_WEIGHT_BOUNDS: true,
    USE_BOND_PREFERENCE_BOUNDS: false,
    USE_LINK_LENGTH_BOUNDS: true,
    USE_LINK_STIFFNESS_BOUNDS: true,

    RADIUS_BOUNDS: [0.8, 1.3, 1, 0.1],
    FREQUENCY_BOUNDS: [0.1, 1, 0.5, 0.1],
    CHARGE_BOUNDS: [-2, 2, 0, 0.5],
    GRAVITY_BOUNDS: [-15, 1, -1, 0.1],
    LINK_GRAVITY_BOUNDS: [-20, -1, -1, 0.1],
    LINK_BOUNDS: [1, 8, 3],
    LINK_TYPE_BOUNDS: [0, 4, 2],
    LINK_TYPE_WEIGHT_BOUNDS: [0.5, 2, 1, 0.5],
    BOND_PREFERENCE_BOUNDS: [0, 4, 1.5, 0.1],
    LINK_LENGTH_BOUNDS: [0.7, 1.3, 1, 0.1],
    LINK_STIFFNESS_BOUNDS: [0.5, 1.2, 1, 0.1],

    GRAVITY_MATRIX_SYMMETRIC: false,
    LINK_GRAVITY_MATRIX_SYMMETRIC: false,
    LINK_TYPE_MATRIX_SYMMETRIC: false,
    LINK_TYPE_WEIGHT_MATRIX_SYMMETRIC: false,
    BOND_PREFERENCE_MATRIX_SYMMETRIC: true,
  };
}

export function createDisabledTypesSymmetricConfig(): TypesSymmetricConfig {
  return {
    GRAVITY_MATRIX_SYMMETRIC: false,
    LINK_GRAVITY_MATRIX_SYMMETRIC: false,
    LINK_TYPE_MATRIX_SYMMETRIC: false,
    LINK_TYPE_WEIGHT_MATRIX_SYMMETRIC: false,
    BOND_PREFERENCE_MATRIX_SYMMETRIC: false,
  };
}

export function copyConfigListValue(copyFrom: unknown[], copyTo: unknown[], defaultValue: number) {
  for (const i in copyTo as Array<unknown>) {
    copyTo[i] = copyFrom[i] ?? defaultValue;
  }
}

export function copyConfigMatrixValue(
  copyFrom: unknown[][],
  copyTo: unknown[][],
  defaultValue: number,
  skipSubMatricesBoundaryIndex?: number,
) {
  for (let i=0; i<copyTo.length; ++i) {
    for (let j=0; j<copyTo[i].length; ++j) {
      if (skipSubMatricesBoundaryIndex !== undefined) {
        if (i < skipSubMatricesBoundaryIndex && j >= skipSubMatricesBoundaryIndex) continue;
        if (i >= skipSubMatricesBoundaryIndex && j < skipSubMatricesBoundaryIndex) continue;
      }

      if (copyFrom[i] === undefined) {
        copyTo[i][j] = defaultValue;
      } else {
        copyTo[i][j] = copyFrom[i][j] ?? defaultValue;
      }
    }
  }
}


export function randomizeTypesConfig(
  randomTypesConfig: RandomTypesConfig,
  oldConfig?: TypesConfig,
  skipSubMatricesBoundaryIndex?: number,
) {
  oldConfig = oldConfig ?? createRandomTypesConfig(randomTypesConfig);
  const newConfig = createRandomTypesConfig(randomTypesConfig);

  newConfig.COLORS = fullCopyObject(oldConfig.COLORS);

  if (!randomTypesConfig.USE_FREQUENCY_BOUNDS || skipSubMatricesBoundaryIndex !== undefined) {
    copyConfigListValue(oldConfig.FREQUENCIES, newConfig.FREQUENCIES, 1);
  }

  if (!randomTypesConfig.USE_RADIUS_BOUNDS || skipSubMatricesBoundaryIndex !== undefined) {
    copyConfigListValue(oldConfig.RADIUS, newConfig.RADIUS, 1);
  }

  if (!randomTypesConfig.USE_CHARGE_BOUNDS || skipSubMatricesBoundaryIndex !== undefined) {
    copyConfigListValue(
      oldConfig.CHARGE ?? createFilledArray(oldConfig.RADIUS.length, 0),
      newConfig.CHARGE,
      0,
    );
  }

  if (!randomTypesConfig.USE_LINK_BOUNDS || skipSubMatricesBoundaryIndex !== undefined) {
    copyConfigListValue(oldConfig.LINKS, newConfig.LINKS, 0);
  }

  if (!randomTypesConfig.USE_LINK_LENGTH_BOUNDS || skipSubMatricesBoundaryIndex !== undefined) {
    copyConfigListValue(oldConfig.LINK_LENGTH ?? createFilledArray(oldConfig.RADIUS.length, 1), newConfig.LINK_LENGTH, 1);
  }

  if (!randomTypesConfig.USE_LINK_STIFFNESS_BOUNDS || skipSubMatricesBoundaryIndex !== undefined) {
    copyConfigListValue(oldConfig.LINK_STIFFNESS ?? createFilledArray(oldConfig.RADIUS.length, 1), newConfig.LINK_STIFFNESS, 1);
  }

  // TODO randomize transformations
  if (newConfig.FREQUENCIES.length === oldConfig.FREQUENCIES.length) {
    newConfig.TRANSFORMATION = fullCopyObject(oldConfig.TRANSFORMATION ?? {});
    newConfig.DECAYS = fullCopyObject(oldConfig.DECAYS ?? {});
  }

  if (!randomTypesConfig.USE_GRAVITY_BOUNDS) {
    copyConfigMatrixValue(oldConfig.GRAVITY, newConfig.GRAVITY, 0);
  } else {
    if (randomTypesConfig.GRAVITY_MATRIX_SYMMETRIC) {
      makeMatrixSymmetric(newConfig.GRAVITY);
    }
    if (skipSubMatricesBoundaryIndex !== undefined) {
      copyConfigMatrixValue(oldConfig.GRAVITY, newConfig.GRAVITY, 0, skipSubMatricesBoundaryIndex);
    }
  }

  if (!randomTypesConfig.USE_LINK_GRAVITY_BOUNDS) {
    copyConfigMatrixValue(oldConfig.LINK_GRAVITY, newConfig.LINK_GRAVITY, 0);
  } else {
    if (randomTypesConfig.LINK_GRAVITY_MATRIX_SYMMETRIC) {
      makeMatrixSymmetric(newConfig.LINK_GRAVITY);
    }
    if (skipSubMatricesBoundaryIndex !== undefined) {
      copyConfigMatrixValue(oldConfig.LINK_GRAVITY, newConfig.LINK_GRAVITY, 0, skipSubMatricesBoundaryIndex);
    }
  }

  if (!randomTypesConfig.USE_LINK_TYPE_BOUNDS) {
    copyConfigMatrixValue(oldConfig.TYPE_LINKS, newConfig.TYPE_LINKS, 0);
  } else {
    if (randomTypesConfig.LINK_TYPE_MATRIX_SYMMETRIC) {
      makeMatrixSymmetric(newConfig.TYPE_LINKS);
    }
    if (skipSubMatricesBoundaryIndex !== undefined) {
      copyConfigMatrixValue(oldConfig.TYPE_LINKS, newConfig.TYPE_LINKS, 0, skipSubMatricesBoundaryIndex);
    }
  }

  if (!randomTypesConfig.USE_LINK_TYPE_WEIGHT_BOUNDS) {
    copyConfigMatrixValue(oldConfig.TYPE_LINK_WEIGHTS, newConfig.TYPE_LINK_WEIGHTS, 1);
  } else {
    if (randomTypesConfig.LINK_TYPE_WEIGHT_MATRIX_SYMMETRIC) {
      makeMatrixSymmetric(newConfig.TYPE_LINK_WEIGHTS);
    }
    if (skipSubMatricesBoundaryIndex !== undefined) {
      copyConfigMatrixValue(oldConfig.TYPE_LINK_WEIGHTS, newConfig.TYPE_LINK_WEIGHTS, 1, skipSubMatricesBoundaryIndex);
    }
  }

  if (!randomTypesConfig.USE_BOND_PREFERENCE_BOUNDS) {
    copyConfigMatrixValue(
      oldConfig.BOND_PREFERENCE ?? createFilledMatrix(oldConfig.RADIUS.length, oldConfig.RADIUS.length, 0),
      newConfig.BOND_PREFERENCE,
      0,
    );
  } else {
    if (randomTypesConfig.BOND_PREFERENCE_MATRIX_SYMMETRIC) {
      makeMatrixSymmetric(newConfig.BOND_PREFERENCE);
    }
    if (skipSubMatricesBoundaryIndex !== undefined) {
      copyConfigMatrixValue(
        oldConfig.BOND_PREFERENCE ?? createFilledMatrix(oldConfig.RADIUS.length, oldConfig.RADIUS.length, 0),
        newConfig.BOND_PREFERENCE,
        0,
        skipSubMatricesBoundaryIndex,
      );
    }
  }


  return newConfig;
}

export function concatTypesConfigs(lhs: TypesConfig, rhs: TypesConfig): TypesConfig {
  const result = fullCopyObject(lhs);
  result.COLORS = concatArrays(lhs.COLORS, rhs.COLORS);
  concatNumericTypesFields(result, lhs, rhs);
  return result;
}

export function crossTypesConfigs(lhs: TypesConfig, rhs: TypesConfig, separator: number): TypesConfig {
  const result = fullCopyObject(lhs);
  result.COLORS = createColors(lhs.COLORS.length);
  crossNumericTypesFields(result, lhs, rhs, separator);
  return result;
}

export function randomCrossTypesConfigs(lhs: TypesConfig, rhs: TypesConfig, separator: number): TypesConfig {
  const result = fullCopyObject(lhs);
  result.COLORS = createColors(lhs.COLORS.length);
  randomCrossNumericTypesFields(result, lhs, rhs, separator);
  return result;
}

export function crossTypesConfigsByIndexes(lhs: TypesConfig, rhs: TypesConfig, indexes: number[]): TypesConfig {
  const result = fullCopyObject(lhs);
  result.COLORS = createColors(lhs.COLORS.length);
  crossNumericTypesFieldsByIndexes(result, lhs, rhs, indexes);
  return result;
}

export function removeIndexFromTypesConfig(input: TypesConfig, index: number): TypesConfig {
  const result = fullCopyObject(input);
  result.COLORS = removeIndexFromArray(input.COLORS, index);
  removeNumericTypesFieldIndex(result, input, index);
  result.TRANSFORMATION = {};
  result.DECAYS = {};
  return result;
}

export function copyIndexInTypesConfig(input: TypesConfig, indexFrom: number, indexTo: number): TypesConfig {
  const result = fullCopyObject(input);
  result.COLORS = copyArrayIndex(input.COLORS, indexFrom, indexTo);
  copyNumericTypesFieldIndex(result, input, indexFrom, indexTo);
  return result;
}

function getUnableToConnectTypePairs(typesConfig: TypesConfig): [number, number][] {
  const result: Set<string> = new Set();
  for (let i = 0; i < typesConfig.LINKS.length; ++i) {
    if (typesConfig.LINKS[i] === 0) {
      for (let j = 0; j < typesConfig.LINKS.length; ++j) {
        if (typesConfig.TYPE_LINKS[i][j] === 1) {
          result.add(`${i},${j}`);
          result.add(`${j},${i}`);
        }
      }
    }
  }

  for (let i = 0; i < typesConfig.TYPE_LINKS.length; ++i) {
    for (let j = 0; j < typesConfig.TYPE_LINKS[i].length; ++j) {
      if (typesConfig.TYPE_LINKS[i][j] === 0) {
        result.add(`${i},${j}`);
        result.add(`${j},${i}`);
      }
    }
  }

  return [...result.values()].map((x) => x.split(',').map((y) => Number(y))) as [number, number][];
}

export function clearInactiveParams(config: TypesConfig) {
  const pairs = getUnableToConnectTypePairs(config);
  for (const [i, j] of pairs) {
    config.TYPE_LINKS[i][j] = 0;
    config.TYPE_LINK_WEIGHTS[i][j] = 1;
    config.LINK_GRAVITY[i][j] = 0;
  }
}
