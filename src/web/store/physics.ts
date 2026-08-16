import { type Ref, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import type { PhysicModelName } from '@/lib/config/types';
import { useConfigStore } from '@/web/store/config';
import { useSimulationStore } from '@/web/store/simulation';
import { createPhysicModel } from '@/lib/utils/functions';

export const usePhysicsStore = defineStore('physics', () => {
  const configStore = useConfigStore();
  const simulationStore = useSimulationStore();

  const physicModelName: Ref<PhysicModelName> = ref(configStore.worldConfig.PHYSIC_MODEL);
  const physicModelNameMap: Record<PhysicModelName, string> = {
    spring: 'Spring',
  };
  const physicModelTooltipMap: Record<PhysicModelName, string> = {
    spring: `Hookean bonds, soft overlap bounce, 1/r² gravity and Coulomb.

Link: F = k · ε · (r − L) / m
  L = (Rᵢ + Rⱼ) · (ℓᵢ + ℓⱼ) / 2
  ε = (sᵢ + sⱼ) / 2

Bounce (r < Rᵢ+Rⱼ): F = −k_b · (Rᵢ+Rⱼ − r) / m

Gravity: F = (G·g − k_c·qᵢ·qⱼ) / r² / m
Link Bias (bonded): F = G·b / m  (constant; coulomb still / r²)

Bounds: F = k_w · Δ

m is the type Mass (legacy configs: Radius³).`,
  };

  watch(physicModelName, (modelName: PhysicModelName) => {
    configStore.worldConfig.PHYSIC_MODEL = modelName;

    const { worldConfig, typesConfig } = configStore.getConfigValues();
    worldConfig.PHYSIC_MODEL = modelName;

    simulationStore.setPhysicModel(createPhysicModel(worldConfig, typesConfig));
  });

  watch(() => configStore.worldConfig.PHYSIC_MODEL, (modelName: PhysicModelName) => {
    physicModelName.value = modelName;
  });

  return {
    physicModelName,
    physicModelNameMap,
    physicModelTooltipMap,
  };
});
