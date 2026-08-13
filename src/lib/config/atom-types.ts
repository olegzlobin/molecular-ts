import type {
  ColorVector,
  LinkFactorDistanceConfig,
  LinkFactorElasticConfig,
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
  concatMatrices,
  concatTensors,
  createFilledMatrix,
  createFilledArray,
  createRandomFloat,
  createRandomInteger,
  crossArrays,
  crossMatrices,
  crossTensors,
  randomCrossArrays,
  randomCrossMatrices,
  randomCrossTensors,
  randomizeMatrix,
  setTensorMainDiagonal,
  createFilledTensor,
} from '../math';
import {
  copyArrayIndex,
  copyMatrixIndex,
  copyTensorIndex,
  crossArraysByIndexes,
  crossMatricesByIndexes,
  crossTensorsByIndexes,
  makeMatrixSymmetric,
  makeTensorSymmetric,
  removeIndexFromArray,
  removeIndexFromMatrix,
  removeIndexFromTensor,
} from '../math/operations';

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
      [3, 1, 1, 3],
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
    LINK_FACTOR_DISTANCE: createFilledTensor(4, 4, 4, 1),
    LINK_FACTOR_ELASTIC: createFilledTensor(4, 4, 4, 1),
    TRANSFORMATION: {},
    DECAYS: {},
  };
}

export function createTransparentTypesConfig(typesCount: number): TypesConfig {
  return {
    RADIUS: createFilledArray(typesCount, 1),
    CHARGE: createFilledArray(typesCount, 0),
    GRAVITY: createFilledMatrix(typesCount, typesCount, 0),
    LINK_GRAVITY: createFilledMatrix(typesCount, typesCount, 0),
    LINKS: createFilledArray(typesCount, 0),
    TYPE_LINKS: createFilledMatrix(typesCount, typesCount, 0),
    TYPE_LINK_WEIGHTS: createFilledMatrix(typesCount, typesCount, 1),
    BOND_PREFERENCE: createFilledMatrix(typesCount, typesCount, 0),
    LINK_LENGTH: createFilledArray(typesCount, 1),
    LINK_STIFFNESS: createFilledArray(typesCount, 1),
    LINK_FACTOR_DISTANCE: createFilledTensor(typesCount, typesCount, typesCount, 1),
    LINK_FACTOR_ELASTIC: createFilledTensor(typesCount, typesCount, typesCount, 1),
    FREQUENCIES: createFilledArray(typesCount, 1),
    COLORS: createColors(typesCount),
    TRANSFORMATION: {},
    DECAYS: {},
  }
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
  return {
    RADIUS: [1],
    FREQUENCIES: [1],
    COLORS: [pickUnusedTypeColor(existingColors)],
    CHARGE: [0],
    GRAVITY: [[0]],
    LINK_GRAVITY: [[0]],
    LINKS: [0],
    TYPE_LINKS: [[0]],
    TYPE_LINK_WEIGHTS: [[1]],
    BOND_PREFERENCE: [[0]],
    LINK_LENGTH: [1],
    LINK_STIFFNESS: [1],
    LINK_FACTOR_DISTANCE: [[[1]]],
    LINK_FACTOR_ELASTIC: [[[1]]],
    TRANSFORMATION: {},
    DECAYS: {},
  };
}

export function createRandomTypesConfig({
  TYPES_COUNT,
  RADIUS_BOUNDS,
  FREQUENCY_BOUNDS,
  GRAVITY_BOUNDS,
  LINK_GRAVITY_BOUNDS,
  LINK_BOUNDS,
  LINK_TYPE_BOUNDS,
  LINK_TYPE_WEIGHT_BOUNDS,
  LINK_LENGTH_BOUNDS,
  LINK_STIFFNESS_BOUNDS,
  LINK_FACTOR_DISTANCE_BOUNDS,
  LINK_FACTOR_ELASTIC_BOUNDS,
  GRAVITY_MATRIX_SYMMETRIC,
  LINK_GRAVITY_MATRIX_SYMMETRIC,
  LINK_TYPE_MATRIX_SYMMETRIC,
  LINK_TYPE_WEIGHT_MATRIX_SYMMETRIC,
  LINK_FACTOR_DISTANCE_MATRIX_SYMMETRIC,
  LINK_FACTOR_DISTANCE_IGNORE_SELF_TYPE,
  LINK_FACTOR_ELASTIC_MATRIX_SYMMETRIC,
  LINK_FACTOR_ELASTIC_IGNORE_SELF_TYPE,
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

  const linkFactorDistance: LinkFactorDistanceConfig = [];

  for (let i=0; i<TYPES_COUNT; ++i) {
    linkFactorDistance.push(randomizeMatrix(
      TYPES_COUNT,
      LINK_FACTOR_DISTANCE_BOUNDS,
      createRandomFloat,
      LINK_FACTOR_DISTANCE_MATRIX_SYMMETRIC,
      precision,
    ));

    if (LINK_FACTOR_DISTANCE_IGNORE_SELF_TYPE) {
      setTensorMainDiagonal(linkFactorDistance, 1);
    }
  }

  const linkFactorElastic: LinkFactorElasticConfig = [];

  for (let i=0; i<TYPES_COUNT; ++i) {
    linkFactorElastic.push(randomizeMatrix(
      TYPES_COUNT,
      LINK_FACTOR_ELASTIC_BOUNDS,
      createRandomFloat,
      LINK_FACTOR_ELASTIC_MATRIX_SYMMETRIC,
      precision,
    ));

    if (LINK_FACTOR_ELASTIC_IGNORE_SELF_TYPE) {
      setTensorMainDiagonal(linkFactorElastic, 1);
    }
  }

  return {
    RADIUS: radius,
    CHARGE: createFilledArray(TYPES_COUNT, 0),
    GRAVITY: gravity,
    FREQUENCIES: frequencies,
    LINK_GRAVITY: linkGravity,
    LINKS: links,
    TYPE_LINKS: typeLinks,
    TYPE_LINK_WEIGHTS: typeLinkWeights,
    BOND_PREFERENCE: createFilledMatrix(TYPES_COUNT, TYPES_COUNT, 0),
    LINK_LENGTH: linkLength,
    LINK_STIFFNESS: linkStiffness,
    LINK_FACTOR_DISTANCE: linkFactorDistance,
    LINK_FACTOR_ELASTIC: linkFactorElastic,
    COLORS: createColors(TYPES_COUNT),
    TRANSFORMATION: {},
    DECAYS: {}, // TODO randomize it
  };
}

export function createRandomIntTypesConfig({
  TYPES_COUNT,
  RADIUS_BOUNDS,
  FREQUENCY_BOUNDS,
  GRAVITY_BOUNDS,
  LINK_GRAVITY_BOUNDS,
  LINK_BOUNDS,
  LINK_TYPE_BOUNDS,
  LINK_TYPE_WEIGHT_BOUNDS,
  LINK_LENGTH_BOUNDS,
  LINK_STIFFNESS_BOUNDS,
  LINK_FACTOR_DISTANCE_BOUNDS,
  LINK_FACTOR_ELASTIC_BOUNDS,
  GRAVITY_MATRIX_SYMMETRIC,
  LINK_GRAVITY_MATRIX_SYMMETRIC,
  LINK_TYPE_MATRIX_SYMMETRIC,
  LINK_TYPE_WEIGHT_MATRIX_SYMMETRIC,
  LINK_FACTOR_DISTANCE_MATRIX_SYMMETRIC,
  LINK_FACTOR_DISTANCE_IGNORE_SELF_TYPE,
  LINK_FACTOR_ELASTIC_MATRIX_SYMMETRIC,
  LINK_FACTOR_ELASTIC_IGNORE_SELF_TYPE,
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

  const linkFactorDistance: LinkFactorDistanceConfig = [];

  for (let i=0; i<TYPES_COUNT; ++i) {
    linkFactorDistance.push(randomizeMatrix(
      TYPES_COUNT,
      LINK_FACTOR_DISTANCE_BOUNDS,
      createRandomInteger,
      LINK_FACTOR_DISTANCE_MATRIX_SYMMETRIC,
      0,
    ));

    if (LINK_FACTOR_DISTANCE_IGNORE_SELF_TYPE) {
      setTensorMainDiagonal(linkFactorDistance, 1);
    }
  }

  const linkFactorElastic: LinkFactorElasticConfig = [];

  for (let i=0; i<TYPES_COUNT; ++i) {
    linkFactorElastic.push(randomizeMatrix(
      TYPES_COUNT,
      LINK_FACTOR_ELASTIC_BOUNDS,
      createRandomInteger,
      LINK_FACTOR_ELASTIC_MATRIX_SYMMETRIC,
      0,
    ));

    if (LINK_FACTOR_ELASTIC_IGNORE_SELF_TYPE) {
      setTensorMainDiagonal(linkFactorElastic, 1);
    }
  }

  return {
    RADIUS: radius,
    CHARGE: createFilledArray(TYPES_COUNT, 0),
    GRAVITY: gravity,
    FREQUENCIES: frequencies,
    LINK_GRAVITY: linkGravity,
    LINKS: links,
    TYPE_LINKS: typeLinks,
    TYPE_LINK_WEIGHTS: typeLinkWeights,
    BOND_PREFERENCE: createFilledMatrix(TYPES_COUNT, TYPES_COUNT, 0),
    LINK_LENGTH: linkLength,
    LINK_STIFFNESS: linkStiffness,
    LINK_FACTOR_DISTANCE: linkFactorDistance,
    LINK_FACTOR_ELASTIC: linkFactorElastic,
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
    USE_GRAVITY_BOUNDS: true,
    USE_LINK_GRAVITY_BOUNDS: true,
    USE_LINK_BOUNDS: true,
    USE_LINK_TYPE_BOUNDS: true,
    USE_LINK_TYPE_WEIGHT_BOUNDS: true,
    USE_LINK_LENGTH_BOUNDS: true,
    USE_LINK_STIFFNESS_BOUNDS: true,
    USE_LINK_FACTOR_DISTANCE_BOUNDS: true,
    USE_LINK_FACTOR_ELASTIC_BOUNDS: true,

    RADIUS_BOUNDS: [0.8, 1.3, 1, 0.1],
    FREQUENCY_BOUNDS: [0.1, 1, 0.5, 0.1],
    GRAVITY_BOUNDS: [-15, 1, -1, 0.1],
    LINK_GRAVITY_BOUNDS: [-20, -1, -1, 0.1],
    LINK_BOUNDS: [1, 8, 3],
    LINK_TYPE_BOUNDS: [0, 4, 2],
    LINK_TYPE_WEIGHT_BOUNDS: [0.5, 2, 1, 0.5],
    LINK_LENGTH_BOUNDS: [0.7, 1.3, 1, 0.1],
    LINK_STIFFNESS_BOUNDS: [0.5, 1.2, 1, 0.1],
    LINK_FACTOR_DISTANCE_BOUNDS: [0.7, 1.2, 1, 0.1],
    LINK_FACTOR_ELASTIC_BOUNDS: [0.5, 1, 1, 0.1],

    GRAVITY_MATRIX_SYMMETRIC: false,
    LINK_GRAVITY_MATRIX_SYMMETRIC: false,
    LINK_TYPE_MATRIX_SYMMETRIC: false,
    LINK_TYPE_WEIGHT_MATRIX_SYMMETRIC: false,
    LINK_FACTOR_DISTANCE_MATRIX_SYMMETRIC: true,
    LINK_FACTOR_DISTANCE_IGNORE_SELF_TYPE: true,
    LINK_FACTOR_ELASTIC_MATRIX_SYMMETRIC: true,
    LINK_FACTOR_ELASTIC_IGNORE_SELF_TYPE: true,
  };
}

export function createDisabledTypesSymmetricConfig(): TypesSymmetricConfig {
  return {
    GRAVITY_MATRIX_SYMMETRIC: false,
    LINK_GRAVITY_MATRIX_SYMMETRIC: false,
    LINK_TYPE_MATRIX_SYMMETRIC: false,
    LINK_TYPE_WEIGHT_MATRIX_SYMMETRIC: false,
    BOND_PREFERENCE_MATRIX_SYMMETRIC: false,
    LINK_FACTOR_DISTANCE_MATRIX_SYMMETRIC: false,
    LINK_FACTOR_ELASTIC_MATRIX_SYMMETRIC: false,
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

export function copyConfigTensorValue(
  copyFrom: unknown[][][],
  copyTo: unknown[][][],
  defaultValue: number,
  skipSubMatricesBoundaryIndex?: number,
) {
  for (let i=0; i<copyTo.length; ++i) {
    for (let j=0; j<copyTo[i].length; ++j) {
      for (let k=0; k<copyTo[i][j].length; ++k) {
        if (
          skipSubMatricesBoundaryIndex !== undefined &&
          !(i < skipSubMatricesBoundaryIndex && j < skipSubMatricesBoundaryIndex && k < skipSubMatricesBoundaryIndex) &&
          !(i >= skipSubMatricesBoundaryIndex && j >= skipSubMatricesBoundaryIndex && k >= skipSubMatricesBoundaryIndex)
        ) continue;
        if (copyFrom[i] === undefined || copyFrom[i][j] === undefined) {
          copyTo[i][j][k] = defaultValue;
        } else {
          copyTo[i][j][k] = copyFrom[i][j][k] ?? defaultValue;
        }
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
  newConfig.CHARGE = fullCopyObject(oldConfig.CHARGE ?? createFilledArray(oldConfig.RADIUS.length, 0));

  if (!randomTypesConfig.USE_FREQUENCY_BOUNDS || skipSubMatricesBoundaryIndex !== undefined) {
    copyConfigListValue(oldConfig.FREQUENCIES, newConfig.FREQUENCIES, 1);
  }

  if (!randomTypesConfig.USE_RADIUS_BOUNDS || skipSubMatricesBoundaryIndex !== undefined) {
    copyConfigListValue(oldConfig.RADIUS, newConfig.RADIUS, 1);
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

  copyConfigMatrixValue(
    oldConfig.BOND_PREFERENCE ?? createFilledMatrix(oldConfig.RADIUS.length, oldConfig.RADIUS.length, 0),
    newConfig.BOND_PREFERENCE,
    0,
    skipSubMatricesBoundaryIndex,
  );

  if (!randomTypesConfig.USE_LINK_FACTOR_DISTANCE_BOUNDS) {
    copyConfigTensorValue(oldConfig.LINK_FACTOR_DISTANCE, newConfig.LINK_FACTOR_DISTANCE, 1);
  } else {
    if (randomTypesConfig.LINK_FACTOR_DISTANCE_MATRIX_SYMMETRIC) {
      makeTensorSymmetric(newConfig.LINK_FACTOR_DISTANCE);
    }
    if (skipSubMatricesBoundaryIndex !== undefined) {
      copyConfigTensorValue(
        oldConfig.LINK_FACTOR_DISTANCE,
        newConfig.LINK_FACTOR_DISTANCE,
        1,
        skipSubMatricesBoundaryIndex,
      );
    }
  }

  if (!randomTypesConfig.USE_LINK_FACTOR_ELASTIC_BOUNDS) {
    copyConfigTensorValue(oldConfig.LINK_FACTOR_ELASTIC, newConfig.LINK_FACTOR_ELASTIC, 1);
  } else {
    if (randomTypesConfig.LINK_FACTOR_ELASTIC_MATRIX_SYMMETRIC) {
      makeTensorSymmetric(newConfig.LINK_FACTOR_ELASTIC);
    }
    if (skipSubMatricesBoundaryIndex !== undefined) {
      copyConfigTensorValue(
        oldConfig.LINK_FACTOR_ELASTIC,
        newConfig.LINK_FACTOR_ELASTIC,
        1,
        skipSubMatricesBoundaryIndex,
      );
    }
  }

  return newConfig;
}

export function concatTypesConfigs(lhs: TypesConfig, rhs: TypesConfig): TypesConfig {
  const result = fullCopyObject(lhs);

  result.COLORS = concatArrays(lhs.COLORS, rhs.COLORS);
  result.RADIUS = concatArrays(lhs.RADIUS, rhs.RADIUS);
  result.CHARGE = concatArrays(
    lhs.CHARGE ?? createFilledArray(lhs.RADIUS.length, 0),
    rhs.CHARGE ?? createFilledArray(rhs.RADIUS.length, 0),
  );
  result.FREQUENCIES = concatArrays(lhs.FREQUENCIES, rhs.FREQUENCIES);

  result.GRAVITY = concatMatrices(lhs.GRAVITY, rhs.GRAVITY, 0);
  result.LINK_GRAVITY = concatMatrices(lhs.LINK_GRAVITY, rhs.LINK_GRAVITY, 0);

  result.LINKS = concatArrays(lhs.LINKS, rhs.LINKS);
  result.TYPE_LINKS = concatMatrices(lhs.TYPE_LINKS, rhs.TYPE_LINKS, 0);
  result.TYPE_LINK_WEIGHTS = concatMatrices(lhs.TYPE_LINK_WEIGHTS, rhs.TYPE_LINK_WEIGHTS, 1);
  result.BOND_PREFERENCE = concatMatrices(
    lhs.BOND_PREFERENCE ?? createFilledMatrix(lhs.RADIUS.length, lhs.RADIUS.length, 0),
    rhs.BOND_PREFERENCE ?? createFilledMatrix(rhs.RADIUS.length, rhs.RADIUS.length, 0),
    0,
  );

  result.LINK_LENGTH = concatArrays(lhs.LINK_LENGTH ?? createFilledArray(lhs.RADIUS.length, 1), rhs.LINK_LENGTH ?? createFilledArray(rhs.RADIUS.length, 1));
  result.LINK_STIFFNESS = concatArrays(lhs.LINK_STIFFNESS ?? createFilledArray(lhs.RADIUS.length, 1), rhs.LINK_STIFFNESS ?? createFilledArray(rhs.RADIUS.length, 1));

  result.LINK_FACTOR_DISTANCE = concatTensors(lhs.LINK_FACTOR_DISTANCE, rhs.LINK_FACTOR_DISTANCE, 1);
  result.LINK_FACTOR_ELASTIC = concatTensors(lhs.LINK_FACTOR_ELASTIC, rhs.LINK_FACTOR_ELASTIC, 1);

  return result;
}

export function crossTypesConfigs(lhs: TypesConfig, rhs: TypesConfig, separator: number): TypesConfig {
  const result = fullCopyObject(lhs);

  result.COLORS = createColors(lhs.COLORS.length);
  result.RADIUS = crossArrays(lhs.RADIUS, rhs.RADIUS, separator);
  result.CHARGE = crossArrays(
    lhs.CHARGE ?? createFilledArray(lhs.RADIUS.length, 0),
    rhs.CHARGE ?? createFilledArray(rhs.RADIUS.length, 0),
    separator,
  );
  result.FREQUENCIES = crossArrays(lhs.FREQUENCIES, rhs.FREQUENCIES, separator);

  result.GRAVITY = crossMatrices(lhs.GRAVITY, rhs.GRAVITY, separator, 0);
  result.LINK_GRAVITY = crossMatrices(lhs.LINK_GRAVITY, rhs.LINK_GRAVITY, separator, 0);

  result.LINKS = crossArrays(lhs.LINKS, rhs.LINKS, separator);
  result.TYPE_LINKS = crossMatrices(lhs.TYPE_LINKS, rhs.TYPE_LINKS, separator, 0);
  result.TYPE_LINK_WEIGHTS = crossMatrices(lhs.TYPE_LINK_WEIGHTS, rhs.TYPE_LINK_WEIGHTS, separator, 1);
  result.BOND_PREFERENCE = crossMatrices(
    lhs.BOND_PREFERENCE ?? createFilledMatrix(lhs.RADIUS.length, lhs.RADIUS.length, 0),
    rhs.BOND_PREFERENCE ?? createFilledMatrix(rhs.RADIUS.length, rhs.RADIUS.length, 0),
    separator,
    0,
  );

  result.LINK_LENGTH = crossArrays(lhs.LINK_LENGTH ?? createFilledArray(lhs.RADIUS.length, 1), rhs.LINK_LENGTH ?? createFilledArray(rhs.RADIUS.length, 1), separator);
  result.LINK_STIFFNESS = crossArrays(lhs.LINK_STIFFNESS ?? createFilledArray(lhs.RADIUS.length, 1), rhs.LINK_STIFFNESS ?? createFilledArray(rhs.RADIUS.length, 1), separator);

  result.LINK_FACTOR_DISTANCE = crossTensors(lhs.LINK_FACTOR_DISTANCE, rhs.LINK_FACTOR_DISTANCE, separator, 1);
  result.LINK_FACTOR_ELASTIC = crossTensors(lhs.LINK_FACTOR_ELASTIC, rhs.LINK_FACTOR_ELASTIC, separator, 1);

  return result;
}

export function randomCrossTypesConfigs(lhs: TypesConfig, rhs: TypesConfig, separator: number): TypesConfig {
  const result = fullCopyObject(lhs);

  result.COLORS = createColors(lhs.COLORS.length);
  result.RADIUS = randomCrossArrays(lhs.RADIUS, rhs.RADIUS, separator);
  result.CHARGE = randomCrossArrays(
    lhs.CHARGE ?? createFilledArray(lhs.RADIUS.length, 0),
    rhs.CHARGE ?? createFilledArray(rhs.RADIUS.length, 0),
    separator,
  );
  result.FREQUENCIES = randomCrossArrays(lhs.FREQUENCIES, rhs.FREQUENCIES, separator);

  result.GRAVITY = randomCrossMatrices(lhs.GRAVITY, rhs.GRAVITY, separator);
  result.LINK_GRAVITY = randomCrossMatrices(lhs.LINK_GRAVITY, rhs.LINK_GRAVITY, separator);

  result.LINKS = randomCrossArrays(lhs.LINKS, rhs.LINKS, separator);
  result.TYPE_LINKS = randomCrossMatrices(lhs.TYPE_LINKS, rhs.TYPE_LINKS, separator);
  result.TYPE_LINK_WEIGHTS = randomCrossMatrices(lhs.TYPE_LINK_WEIGHTS, rhs.TYPE_LINK_WEIGHTS, separator);
  result.BOND_PREFERENCE = randomCrossMatrices(
    lhs.BOND_PREFERENCE ?? createFilledMatrix(lhs.RADIUS.length, lhs.RADIUS.length, 0),
    rhs.BOND_PREFERENCE ?? createFilledMatrix(rhs.RADIUS.length, rhs.RADIUS.length, 0),
    separator,
  );

  result.LINK_LENGTH = randomCrossArrays(lhs.LINK_LENGTH ?? createFilledArray(lhs.RADIUS.length, 1), rhs.LINK_LENGTH ?? createFilledArray(rhs.RADIUS.length, 1), separator);
  result.LINK_STIFFNESS = randomCrossArrays(lhs.LINK_STIFFNESS ?? createFilledArray(lhs.RADIUS.length, 1), rhs.LINK_STIFFNESS ?? createFilledArray(rhs.RADIUS.length, 1), separator);

  result.LINK_FACTOR_DISTANCE = randomCrossTensors(lhs.LINK_FACTOR_DISTANCE, rhs.LINK_FACTOR_DISTANCE, separator);
  result.LINK_FACTOR_ELASTIC = randomCrossTensors(lhs.LINK_FACTOR_ELASTIC, rhs.LINK_FACTOR_ELASTIC, separator);

  return result;
}

export function crossTypesConfigsByIndexes(lhs: TypesConfig, rhs: TypesConfig, indexes: number[]): TypesConfig {
  const result = fullCopyObject(lhs);

  result.COLORS = createColors(lhs.COLORS.length);
  result.RADIUS = crossArraysByIndexes(lhs.RADIUS, rhs.RADIUS, indexes);
  result.CHARGE = crossArraysByIndexes(
    lhs.CHARGE ?? createFilledArray(lhs.RADIUS.length, 0),
    rhs.CHARGE ?? createFilledArray(rhs.RADIUS.length, 0),
    indexes,
  );
  result.FREQUENCIES = crossArraysByIndexes(lhs.FREQUENCIES, rhs.FREQUENCIES, indexes);

  result.GRAVITY = crossMatricesByIndexes(lhs.GRAVITY, rhs.GRAVITY, indexes);
  result.LINK_GRAVITY = crossMatricesByIndexes(lhs.LINK_GRAVITY, rhs.LINK_GRAVITY, indexes);

  result.LINKS = crossArraysByIndexes(lhs.LINKS, rhs.LINKS, indexes);
  result.TYPE_LINKS = crossMatricesByIndexes(lhs.TYPE_LINKS, rhs.TYPE_LINKS, indexes);
  result.TYPE_LINK_WEIGHTS = crossMatricesByIndexes(lhs.TYPE_LINK_WEIGHTS, rhs.TYPE_LINK_WEIGHTS, indexes);
  result.BOND_PREFERENCE = crossMatricesByIndexes(
    lhs.BOND_PREFERENCE ?? createFilledMatrix(lhs.RADIUS.length, lhs.RADIUS.length, 0),
    rhs.BOND_PREFERENCE ?? createFilledMatrix(rhs.RADIUS.length, rhs.RADIUS.length, 0),
    indexes,
  );

  result.LINK_LENGTH = crossArraysByIndexes(lhs.LINK_LENGTH ?? createFilledArray(lhs.RADIUS.length, 1), rhs.LINK_LENGTH ?? createFilledArray(rhs.RADIUS.length, 1), indexes);
  result.LINK_STIFFNESS = crossArraysByIndexes(lhs.LINK_STIFFNESS ?? createFilledArray(lhs.RADIUS.length, 1), rhs.LINK_STIFFNESS ?? createFilledArray(rhs.RADIUS.length, 1), indexes);

  result.LINK_FACTOR_DISTANCE = crossTensorsByIndexes(lhs.LINK_FACTOR_DISTANCE, rhs.LINK_FACTOR_DISTANCE, indexes);
  result.LINK_FACTOR_ELASTIC = crossTensorsByIndexes(lhs.LINK_FACTOR_ELASTIC, rhs.LINK_FACTOR_ELASTIC, indexes);

  return result;
}

export function removeIndexFromTypesConfig(input: TypesConfig, index: number): TypesConfig {
  const result = fullCopyObject(input);

  result.COLORS = removeIndexFromArray(input.COLORS, index);
  result.RADIUS = removeIndexFromArray(input.RADIUS, index);
  result.CHARGE = removeIndexFromArray(input.CHARGE ?? createFilledArray(input.RADIUS.length, 0), index);
  result.FREQUENCIES = removeIndexFromArray(input.FREQUENCIES, index);

  result.GRAVITY = removeIndexFromMatrix(input.GRAVITY, index);
  result.LINK_GRAVITY = removeIndexFromMatrix(input.LINK_GRAVITY, index);

  result.LINKS = removeIndexFromArray(input.LINKS, index);
  result.TYPE_LINKS = removeIndexFromMatrix(input.TYPE_LINKS, index);
  result.TYPE_LINK_WEIGHTS = removeIndexFromMatrix(input.TYPE_LINK_WEIGHTS, index);
  result.BOND_PREFERENCE = removeIndexFromMatrix(
    input.BOND_PREFERENCE ?? createFilledMatrix(input.RADIUS.length, input.RADIUS.length, 0),
    index,
  );

  result.LINK_LENGTH = removeIndexFromArray(input.LINK_LENGTH ?? createFilledArray(input.RADIUS.length, 1), index);
  result.LINK_STIFFNESS = removeIndexFromArray(input.LINK_STIFFNESS ?? createFilledArray(input.RADIUS.length, 1), index);

  result.LINK_FACTOR_DISTANCE = removeIndexFromTensor(input.LINK_FACTOR_DISTANCE, index);
  result.LINK_FACTOR_ELASTIC = removeIndexFromTensor(input.LINK_FACTOR_ELASTIC, index);

  result.TRANSFORMATION = {};
  result.DECAYS = {};

  return result;
}

export function copyIndexInTypesConfig(input: TypesConfig, indexFrom: number, indexTo: number): TypesConfig {
  const result = fullCopyObject(input);

  result.COLORS = copyArrayIndex(input.COLORS, indexFrom, indexTo);
  result.RADIUS = copyArrayIndex(input.RADIUS, indexFrom, indexTo);
  result.CHARGE = copyArrayIndex(input.CHARGE ?? createFilledArray(input.RADIUS.length, 0), indexFrom, indexTo);
  result.FREQUENCIES = copyArrayIndex(input.FREQUENCIES, indexFrom, indexTo);

  result.GRAVITY = copyMatrixIndex(input.GRAVITY, indexFrom, indexTo);
  result.LINK_GRAVITY = copyMatrixIndex(input.LINK_GRAVITY, indexFrom, indexTo);

  result.LINKS = copyArrayIndex(input.LINKS, indexFrom, indexTo);
  result.TYPE_LINKS = copyMatrixIndex(input.TYPE_LINKS, indexFrom, indexTo);
  result.TYPE_LINK_WEIGHTS = copyMatrixIndex(input.TYPE_LINK_WEIGHTS, indexFrom, indexTo);
  result.BOND_PREFERENCE = copyMatrixIndex(
    input.BOND_PREFERENCE ?? createFilledMatrix(input.RADIUS.length, input.RADIUS.length, 0),
    indexFrom,
    indexTo,
  );

  result.LINK_LENGTH = copyArrayIndex(input.LINK_LENGTH ?? createFilledArray(input.RADIUS.length, 1), indexFrom, indexTo);
  result.LINK_STIFFNESS = copyArrayIndex(input.LINK_STIFFNESS ?? createFilledArray(input.RADIUS.length, 1), indexFrom, indexTo);

  result.LINK_FACTOR_DISTANCE = copyTensorIndex(input.LINK_FACTOR_DISTANCE, indexFrom, indexTo);
  result.LINK_FACTOR_ELASTIC = copyTensorIndex(input.LINK_FACTOR_ELASTIC, indexFrom, indexTo);

  // TODO do not need to clear transformation, but maybe need to copy it

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
    for (const matrix of config.LINK_FACTOR_DISTANCE) {
      matrix[i][j] = 1;
    }
    for (const matrix of config.LINK_FACTOR_ELASTIC) {
      matrix[i][j] = 1;
    }
  }
}
