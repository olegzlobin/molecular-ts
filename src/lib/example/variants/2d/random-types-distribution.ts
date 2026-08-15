import type {
  TypesConfig,
  WorldConfig,
} from "../../../config/types";
import { create2dDrawer, createDefaultShowConfig } from "../../../drawer/2d";
import { createRandomTypesConfig } from "../../../config/atom-types";
import { createBaseWorldConfig } from "../../../config/world";
import { create2dRandomDistribution } from "../../../config/atoms";
import { Simulation } from "../../../simulation/simulation";
import { PhysicModelSpring } from "../../../physics/spring";

const WORLD_CONFIG: WorldConfig = createBaseWorldConfig();
const TYPES_CONFIG: TypesConfig = createRandomTypesConfig({
  TYPES_COUNT: 4,

  USE_RADIUS_BOUNDS: false,
  USE_FREQUENCY_BOUNDS: false,
  USE_CHARGE_BOUNDS: false,
  USE_GRAVITY_BOUNDS: true,
  USE_LINK_BIAS_BOUNDS: true,
  USE_LINK_BOUNDS: true,
  USE_LINK_TYPE_BOUNDS: true,
  USE_LINK_TYPE_WEIGHT_BOUNDS: true,
  USE_BOND_PREFERENCE_BOUNDS: false,
  USE_BOND_PREFERENCE_FACTOR_BOUNDS: false,
  USE_LINK_LENGTH_BOUNDS: false,
  USE_LINK_STIFFNESS_BOUNDS: false,

  RADIUS_BOUNDS: [0.5, 1.5],
  FREQUENCY_BOUNDS: [0.1, 1, 0.5, 0.1],
  CHARGE_BOUNDS: [-2, 2, 0, 0.5],
  GRAVITY_BOUNDS: [-1, 0.5],
  LINK_BIAS_BOUNDS: [-0.3, 0.15],
  LINK_BOUNDS: [1, 3],
  LINK_TYPE_BOUNDS: [0, 4],
  LINK_TYPE_WEIGHT_BOUNDS: [1, 2, 0.1],
  BOND_PREFERENCE_BOUNDS: [0, 4, 1.5, 0.1],
  BOND_PREFERENCE_FACTOR_BOUNDS: [0.5, 2, 1, 0.1],
  LINK_LENGTH_BOUNDS: [0.7, 1.3],
  LINK_STIFFNESS_BOUNDS: [0.5, 1.2],

  GRAVITY_MATRIX_SYMMETRIC: false,
  LINK_BIAS_MATRIX_SYMMETRIC: false,
  LINK_TYPE_MATRIX_SYMMETRIC: false,
  LINK_TYPE_WEIGHT_MATRIX_SYMMETRIC: false,
  BOND_PREFERENCE_MATRIX_SYMMETRIC: true,
  BOND_PREFERENCE_FACTOR_MATRIX_SYMMETRIC: true,
  BOND_PREFERENCE_FACTOR_IGNORE_SELF_TYPE: true,
});

export function create2dSimulationWithRandomTypes() {
  return new Simulation({
    viewMode: '2d',
    worldConfig: WORLD_CONFIG,
    typesConfig: TYPES_CONFIG,
    physicModel: new PhysicModelSpring(WORLD_CONFIG, TYPES_CONFIG),
    atomsFactory: create2dRandomDistribution,
    drawer: create2dDrawer('canvas', WORLD_CONFIG, TYPES_CONFIG, createDefaultShowConfig()),
  });
}
