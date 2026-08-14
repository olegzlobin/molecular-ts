import type {
  TypesConfig,
  WorldConfig,
} from "../../../config/types";
import { createDefaultTypesConfig } from "../../../config/atom-types";
import { createBaseWorldConfig } from "../../../config/world";
import { create3dButterfly } from "../../../config/atoms";
import { Simulation } from "../../../simulation/simulation";
import { create3dDrawer } from "../../../drawer/3d";
import { PhysicModelSpring } from "../../../physics/spring";

const WORLD_CONFIG: WorldConfig = createBaseWorldConfig();
const TYPES_CONFIG: TypesConfig = createDefaultTypesConfig();

export function create3dSimulationButterfly() {
  return new Simulation({
    viewMode: '3d',
    worldConfig: WORLD_CONFIG,
    typesConfig: TYPES_CONFIG,
    physicModel: new PhysicModelSpring(WORLD_CONFIG, TYPES_CONFIG),
    atomsFactory: create3dButterfly,
    drawer: create3dDrawer('canvas', WORLD_CONFIG, TYPES_CONFIG),
  });
}
