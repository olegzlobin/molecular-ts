<script setup lang="ts">

import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue';
import ConfigSection from '@/web/components/config-editor/components/containers/config-section.vue';
import { useSimulationStore } from '@/web/store/simulation';
import type { TimeSeriesConfig } from "@/web/components/config-editor/components/widgets/chart-flow.vue";
import ChartFlow from "@/web/components/config-editor/components/widgets/chart-flow.vue";
import Flag from '@/web/components/inputs/flag.vue';
import InputHeader from '@/web/components/base/input-header.vue';
import { emptyEnergyReport } from '@/lib/analysis/energy';
import { buildMoleculeSnapshot, type MoleculeSnapshot } from '@/lib/analysis/molecules';

const { getCurrentSimulation } = useSimulationStore();

const showMean: Ref<boolean> = ref(false);

const waitTicks = ref(500);
const waitStartTick = ref<number | null>(null);
const waitProgress = ref(0);
const moleculeSnapshot = ref<MoleculeSnapshot | null>(null);
const moleculeStatus = ref('');

const isWaitingMolecules = computed(() => waitStartTick.value !== null);

const takeMoleculeSnapshot = (stepIndex?: number) => {
  try {
    const sim = getCurrentSimulation();
    moleculeSnapshot.value = buildMoleculeSnapshot(
      sim.atoms,
      sim.config.typesConfig.NAMES,
      stepIndex ?? sim.stepIndex,
    );
    moleculeStatus.value = `Snapshot at step ${moleculeSnapshot.value.tick}`;
  } catch {
    moleculeStatus.value = 'Simulation not ready';
  }
};

const startMoleculeWait = () => {
  try {
    const sim = getCurrentSimulation();
    waitStartTick.value = sim.stepIndex;
    waitProgress.value = 0;
    moleculeStatus.value = `Waiting ${waitTicks.value} ticks from ${sim.stepIndex}…`;
  } catch {
    moleculeStatus.value = 'Simulation not ready';
  }
};

const cancelMoleculeWait = () => {
  waitStartTick.value = null;
  waitProgress.value = 0;
  moleculeStatus.value = 'Cancelled';
};

const pollMoleculeWait = () => {
  if (waitStartTick.value === null) {
    return;
  }
  try {
    const sim = getCurrentSimulation();
    const elapsed = sim.stepIndex - waitStartTick.value;
    waitProgress.value = Math.max(0, elapsed);
    if (elapsed >= waitTicks.value) {
      waitStartTick.value = null;
      takeMoleculeSnapshot(sim.stepIndex);
    }
  } catch {
    // simulation not ready
  }
};

const copyMoleculeJson = async () => {
  if (!moleculeSnapshot.value) {
    return;
  }
  await navigator.clipboard.writeText(JSON.stringify(moleculeSnapshot.value, null, 2));
  moleculeStatus.value = 'JSON copied';
};

const pct = (value: number): string => `${(value * 100).toFixed(1)}%`;

const getEnergy = () => {
  try {
    return getCurrentSimulation().energy;
  } catch {
    return emptyEnergyReport();
  }
};

const fmt = (value: number, digits = 2): string => {
  if (!Number.isFinite(value)) {
    return '—';
  }
  const abs = Math.abs(value);
  if (abs !== 0 && (abs >= 1e5 || abs < 1e-3)) {
    return value.toExponential(2);
  }
  return value.toFixed(digits);
};

const energySnapshot = ref(emptyEnergyReport());

const energyPotential = computed(() => {
  const c = energySnapshot.value.current;
  return c.gravity + c.bounce + c.link + c.bounds;
});

const energyDeltaPct = computed(() => {
  const rel = energySnapshot.value.deltaRel;
  if (!Number.isFinite(rel)) {
    return '—';
  }
  return `${(rel * 100).toFixed(3)}%`;
});

const refreshEnergyReadout = () => {
  energySnapshot.value = getEnergy();
};

const resetEnergyBaseline = () => {
  try {
    getCurrentSimulation().resetEnergyBaseline();
    refreshEnergyReadout();
  } catch {
    // simulation not ready
  }
};

let energyReadoutTimer: ReturnType<typeof setInterval> | undefined;
let moleculeWaitTimer: ReturnType<typeof setInterval> | undefined;

type ChartConfig = {
  id: string;
  name: string;
  data: () => number[];
  width?: number;
  height?: number;
  period?: number;
  config: TimeSeriesConfig[];
}

const timeSeriesEnergyTotalConfig: ChartConfig = {
  id: 'energy-total',
  name: 'Total Energy',
  data: () => [getEnergy().current.total],
  config: [
    {
      name: 'E',
      options: {
        strokeStyle: 'rgb(255, 193, 7)',
        fillStyle: 'rgba(255, 193, 7, 0.25)',
        lineWidth: 3,
      },
    },
  ],
};

const timeSeriesEnergyPartsConfig: ChartConfig = {
  id: 'energy-parts',
  name: 'Kinetic / Potential',
  data: () => {
    const e = getEnergy().current;
    return [e.kinetic, e.gravity + e.bounce + e.link + e.bounds];
  },
  config: [
    {
      name: 'KE',
      options: {
        strokeStyle: 'rgb(13, 110, 253)',
        lineWidth: 2,
      },
    },
    {
      name: 'U',
      options: {
        strokeStyle: 'rgb(220, 53, 69)',
        lineWidth: 2,
      },
    },
  ],
};

const timeSeriesEnergyDeltaConfig: ChartConfig = {
  id: 'energy-delta-rel',
  name: 'ΔE / E₀ (%)',
  data: () => [getEnergy().deltaRel * 100],
  config: [
    {
      name: 'ΔE/E₀',
      options: {
        strokeStyle: 'rgb(25, 135, 84)',
        fillStyle: 'rgba(25, 135, 84, 0.25)',
        lineWidth: 3,
      },
    },
  ],
};

const timeSeriesFpsConfig: ChartConfig = {
  id: 'fps',
  name: 'FPS',
  data: () => getCurrentSimulation().summary['STEP_FREQUENCY'],
  config: [
    {
      name: 'FPS',
      options: {
        strokeStyle: 'rgb(13, 110, 253)',
        fillStyle: 'rgba(13, 110, 253, 0.4)',
        lineWidth: 3,
      },
    },
  ],
};
const timeSeriesLinksCountConfig = {
  id: 'links-count',
  name: 'Links Count',
  data: () => getCurrentSimulation().summary['LINKS_COUNT'],
  config: [
    {
      name: 'Links Count',
      options: {
        strokeStyle: 'rgb(13, 110, 253)',
        fillStyle: 'rgba(13, 110, 253, 0.4)',
        lineWidth: 3,
      },
    },
  ],
};
const timeSeriesAtomsMeanSpeedConfig = {
  id: 'atoms-mean-speed',
  name: 'Atoms Mean Speed',
  data: () => getCurrentSimulation().summary['ATOMS_MEAN_SPEED'],
  config: [
    {
      name: 'Atoms Mean Speed',
      options: {
        strokeStyle: 'rgb(13, 110, 253)',
        fillStyle: 'rgba(13, 110, 253, 0.4)',
        lineWidth: 3,
      },
    },
  ],
}
const timeSeriesAtomsTypesCountConfig = {
  id: 'atoms-types-count',
  name: 'Atoms Types Count',
  height: 200,
  data: () => getCurrentSimulation().summary['ATOMS_TYPE_COUNT'],
  config: getCurrentSimulation().config.typesConfig.COLORS.map((color, index) => {
    const strColor = color.join(', ');
    const typeName = getCurrentSimulation().config.typesConfig.NAMES?.[index] || `T${index}`;
    return {
      name: typeName,
      options: {
        strokeStyle: `rgb(${strColor})`,
        lineWidth: 2,
      },
    };
  }),
}
const timeSeriesAtomsTypesMeanCountConfig = {
  id: 'atoms-types-mean-count',
  name: 'Atoms Types Count',
  height: 200,
  data: () => getCurrentSimulation().summary['ATOMS_TYPE_MEAN_COUNT'],
  config: getCurrentSimulation().config.typesConfig.COLORS.map((color, index) => {
    const strColor = color.join(', ');
    const typeName = getCurrentSimulation().config.typesConfig.NAMES?.[index] || `T${index}`;
    return {
      name: typeName,
      options: {
        strokeStyle: `rgb(${strColor})`,
        lineWidth: 2,
      },
    };
  }),
}
const timeSeriesAtomsTypeMeanSpeedConfig = {
  id: 'atoms-type-mean-speed',
  name: 'Atoms Type Mean Speed',
  height: 200,
  data: () => getCurrentSimulation().summary['ATOMS_TYPE_MEAN_SPEED'],
  config: getCurrentSimulation().config.typesConfig.COLORS.map((color, index) => {
    const strColor = color.join(', ');
    const typeName = getCurrentSimulation().config.typesConfig.NAMES?.[index] || `T${index}`;
    return {
      name: typeName,
      options: {
        strokeStyle: `rgb(${strColor})`,
        lineWidth: 2,
      },
    };
  }),
}
const timeSeriesAtomsTypeLinksCountConfig = {
  id: 'atoms-type-links-count',
  name: 'Atoms Type Links Count',
  height: 200,
  data: () => getCurrentSimulation().summary['ATOMS_TYPE_LINKS_COUNT'],
  config: getCurrentSimulation().config.typesConfig.COLORS.map((color, index) => {
    const strColor = color.join(', ');
    const typeName = getCurrentSimulation().config.typesConfig.NAMES?.[index] || `T${index}`;
    return {
      name: typeName,
      options: {
        strokeStyle: `rgb(${strColor})`,
        lineWidth: 2,
      },
    };
  }),
}
const timeSeriesAtomsTypeLinksMeanCountConfig = {
  id: 'atoms-type-links-mean-count',
  name: 'Atoms Type Links Mean Count',
  height: 200,
  data: () => getCurrentSimulation().summary['ATOMS_TYPE_LINKS_MEAN_COUNT'],
  config: getCurrentSimulation().config.typesConfig.COLORS.map((color, index) => {
    const strColor = color.join(', ');
    const typeName = getCurrentSimulation().config.typesConfig.NAMES?.[index] || `T${index}`;
    return {
      name: typeName,
      options: {
        strokeStyle: `rgb(${strColor})`,
        lineWidth: 2,
      },
    };
  }),
}

const timeSeriesLinksCreatedDeletedConfig = {
  id: 'links-created-deleted',
  name: 'New links / Deleted links',
  height: 200,
  data: () => [getCurrentSimulation().summary['LINKS_CREATED'][0], getCurrentSimulation().summary['LINKS_DELETED'][0]],
  config: [
    {
      name: 'New links',
      options: {
        strokeStyle: 'rgb(0, 255, 0)',
        lineWidth: 3,
      },
    },
    {
      name: 'Deleted links',
      options: {
        strokeStyle: 'rgb(255, 0, 0)',
        lineWidth: 3,
      },
    },
  ],
}

const timeSeriesLinksCreatedDeletedMeanConfig = {
  id: 'links-created-deleted-mean',
  name: 'New links / Deleted links Mean',
  height: 200,
  data: () => [getCurrentSimulation().summary['LINKS_CREATED_MEAN'][0], getCurrentSimulation().summary['LINKS_DELETED_MEAN'][0]],
  config: [
    {
      name: 'New links',
      options: {
        strokeStyle: 'rgb(0, 255, 0)',
        lineWidth: 3,
      },
    },
    {
      name: 'Deleted links',
      options: {
        strokeStyle: 'rgb(255, 0, 0)',
        lineWidth: 3,
      },
    },
  ],
}

const timeSeriesLinksTypeCreatedConfig = {
  id: 'links-types-created',
  name: 'Links Types Created',
  height: 200,
  data: () => getCurrentSimulation().summary['LINKS_TYPE_CREATED'],
  config: getCurrentSimulation().config.typesConfig.COLORS.map((color, index) => {
    const strColor = color.join(', ');
    const typeName = getCurrentSimulation().config.typesConfig.NAMES?.[index] || `T${index}`;
    return {
      name: typeName,
      options: {
        strokeStyle: `rgb(${strColor})`,
        lineWidth: 2,
      },
    };
  }),
}

const timeSeriesLinksTypeDeletedConfig = {
  id: 'links-types-deleted',
  name: 'Links Types Deleted',
  height: 200,
  data: () => getCurrentSimulation().summary['LINKS_TYPE_DELETED'],
  config: getCurrentSimulation().config.typesConfig.COLORS.map((color, index) => {
    const strColor = color.join(', ');
    const typeName = getCurrentSimulation().config.typesConfig.NAMES?.[index] || `T${index}`;
    return {
      name: typeName,
      options: {
        strokeStyle: `rgb(${strColor})`,
        lineWidth: 2,
      },
    };
  }),
}

const timeSeriesLinksTypeCreatedMeanConfig = {
  id: 'links-types-created-mean',
  name: 'Links Types Created Mean',
  height: 200,
  data: () => getCurrentSimulation().summary['LINKS_TYPE_CREATED_MEAN'],
  config: getCurrentSimulation().config.typesConfig.COLORS.map((color, index) => {
    const strColor = color.join(', ');
    const typeName = getCurrentSimulation().config.typesConfig.NAMES?.[index] || `T${index}`;
    return {
      name: typeName,
      options: {
        strokeStyle: `rgb(${strColor})`,
        lineWidth: 2,
      },
    };
  }),
}

const timeSeriesLinksTypeDeletedMeanConfig = {
  id: 'links-types-deleted-mean',
  name: 'Links Types Deleted Mean',
  height: 200,
  data: () => getCurrentSimulation().summary['LINKS_TYPE_DELETED_MEAN'],
  config: getCurrentSimulation().config.typesConfig.COLORS.map((color, index) => {
    const strColor = color.join(', ');
    const typeName = getCurrentSimulation().config.typesConfig.NAMES?.[index] || `T${index}`;
    return {
      name: typeName,
      options: {
        strokeStyle: `rgb(${strColor})`,
        lineWidth: 2,
      },
    };
  }),
}

const timeSeriesTransformationsCountConfig: ChartConfig = {
  id: 'transformations-count',
  name: 'Transformations Count',
  data: () => getCurrentSimulation().summary['TRANSFORMATION_COUNT'],
  config: [
    {
      name: 'Transformations Count',
      options: {
        strokeStyle: 'rgb(13, 110, 253)',
        fillStyle: 'rgba(13, 110, 253, 0.4)',
        lineWidth: 3,
      },
    },
  ],
};
const timeSeriesTransformationsMeanCountConfig: ChartConfig = {
  id: 'transformations-mean-count',
  name: 'Transformations Mean Count',
  data: () => getCurrentSimulation().summary['TRANSFORMATION_MEAN_COUNT'],
  config: [
    {
      name: 'Transformations Mean Count',
      options: {
        strokeStyle: 'rgb(13, 110, 253)',
        fillStyle: 'rgba(13, 110, 253, 0.4)',
        lineWidth: 3,
      },
    },
  ],
};
const timeSeriesTransformationsTypeFromCountConfig = {
  id: 'transformations-type-from-count',
  name: 'Transformations Type From Count',
  height: 200,
  data: () => getCurrentSimulation().summary['TRANSFORMATION_TYPE_FROM_COUNT'],
  config: getCurrentSimulation().config.typesConfig.COLORS.map((color, index) => {
    const strColor = color.join(', ');
    const typeName = getCurrentSimulation().config.typesConfig.NAMES?.[index] || `T${index}`;
    return {
      name: typeName,
      options: {
        strokeStyle: `rgb(${strColor})`,
        lineWidth: 2,
      },
    };
  }),
}
const timeSeriesTransformationsTypeToCountConfig = {
  id: 'transformations-type-to-count',
  name: 'Transformations Type To Count',
  height: 200,
  data: () => getCurrentSimulation().summary['TRANSFORMATION_TYPE_TO_COUNT'],
  config: getCurrentSimulation().config.typesConfig.COLORS.map((color, index) => {
    const strColor = color.join(', ');
    const typeName = getCurrentSimulation().config.typesConfig.NAMES?.[index] || `T${index}`;
    return {
      name: typeName,
      options: {
        strokeStyle: `rgb(${strColor})`,
        lineWidth: 2,
      },
    };
  }),
}
const timeSeriesTransformationsTypeFromMeanCountConfig = {
  id: 'transformations-type-from-mean-count',
  name: 'Transformations Type From Mean Count',
  height: 200,
  data: () => getCurrentSimulation().summary['TRANSFORMATION_TYPE_FROM_MEAN_COUNT'],
  config: getCurrentSimulation().config.typesConfig.COLORS.map((color, index) => {
    const strColor = color.join(', ');
    const typeName = getCurrentSimulation().config.typesConfig.NAMES?.[index] || `T${index}`;
    return {
      name: typeName,
      options: {
        strokeStyle: `rgb(${strColor})`,
        lineWidth: 2,
      },
    };
  }),
}
const timeSeriesTransformationsTypeToMeanCountConfig = {
  id: 'transformations-type-to-mean-count',
  name: 'Transformations Type To Mean Count',
  height: 200,
  data: () => getCurrentSimulation().summary['TRANSFORMATION_TYPE_TO_MEAN_COUNT'],
  config: getCurrentSimulation().config.typesConfig.COLORS.map((color, index) => {
    const strColor = color.join(', ');
    const typeName = getCurrentSimulation().config.typesConfig.NAMES?.[index] || `T${index}`;
    return {
      name: typeName,
      options: {
        strokeStyle: `rgb(${strColor})`,
        lineWidth: 2,
      },
    };
  }),
}

const timeSeriesConfigBase: ChartConfig[] = [
  timeSeriesEnergyTotalConfig,
  timeSeriesEnergyPartsConfig,
  timeSeriesEnergyDeltaConfig,
  timeSeriesFpsConfig,
  timeSeriesAtomsMeanSpeedConfig,
  timeSeriesLinksCountConfig,
];

const timeSeriesConfigCount: ChartConfig[] = [
  timeSeriesTransformationsCountConfig,
  timeSeriesAtomsTypesCountConfig,
  timeSeriesAtomsTypeLinksCountConfig,
  timeSeriesLinksCreatedDeletedConfig,
  timeSeriesLinksTypeCreatedConfig,
  timeSeriesLinksTypeDeletedConfig,
  timeSeriesAtomsTypeMeanSpeedConfig,
  timeSeriesTransformationsTypeFromCountConfig,
  timeSeriesTransformationsTypeToCountConfig,
];

const timeSeriesConfigMean: ChartConfig[] = [
  timeSeriesTransformationsMeanCountConfig,
  timeSeriesAtomsTypesMeanCountConfig,
  timeSeriesAtomsTypeLinksMeanCountConfig,
  timeSeriesLinksCreatedDeletedMeanConfig,
  timeSeriesLinksTypeCreatedMeanConfig,
  timeSeriesLinksTypeDeletedMeanConfig,
  timeSeriesTransformationsTypeFromMeanCountConfig,
  timeSeriesTransformationsTypeToMeanCountConfig,
];

onMounted(() => {
  try {
    getCurrentSimulation().setEnergyTracking(true);
  } catch {
    // simulation not ready
  }
  refreshEnergyReadout();
  energyReadoutTimer = setInterval(refreshEnergyReadout, 200);
  moleculeWaitTimer = setInterval(pollMoleculeWait, 200);
});

onUnmounted(() => {
  if (energyReadoutTimer !== undefined) {
    clearInterval(energyReadoutTimer);
    energyReadoutTimer = undefined;
  }
  if (moleculeWaitTimer !== undefined) {
    clearInterval(moleculeWaitTimer);
    moleculeWaitTimer = undefined;
  }
  try {
    getCurrentSimulation().setEnergyTracking(false);
  } catch {
    // simulation not ready
  }
});

</script>

<template>
  <config-section>
    <template #body>
      <div class="molecules-panel">
        <input-header
          name="Molecules"
          tooltip="Count bonded groups by chemical-like formulas from type names (Hill order: C, H, then A–Z). Free atoms are included as single-letter formulas."
        />
        <div class="molecules-controls">
          <label class="molecules-wait">
            Wait ticks
            <input type="number" v-model.number="waitTicks" min="1" step="1" />
          </label>
          <div class="btn-group" role="group">
            <button
              type="button"
              class="btn btn-outline-secondary"
              :disabled="isWaitingMolecules"
              @click="startMoleculeWait"
            >
              Wait & snapshot
            </button>
            <button
              type="button"
              class="btn btn-outline-secondary"
              :disabled="!isWaitingMolecules"
              @click="cancelMoleculeWait"
            >
              Cancel
            </button>
            <button type="button" class="btn btn-outline-secondary" @click="takeMoleculeSnapshot()">
              Now
            </button>
            <button
              type="button"
              class="btn btn-outline-secondary"
              :disabled="!moleculeSnapshot"
              @click="copyMoleculeJson"
            >
              Copy JSON
            </button>
          </div>
        </div>
        <div v-if="isWaitingMolecules" class="molecules-status">
          Progress: {{ waitProgress }} / {{ waitTicks }}
        </div>
        <div v-else-if="moleculeStatus" class="molecules-status">{{ moleculeStatus }}</div>
        <table v-if="moleculeSnapshot" class="molecules-table">
          <thead>
            <tr>
              <th>Formula</th>
              <th>Count</th>
              <th>Atoms</th>
              <th>Mol %</th>
              <th>Atom %</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in moleculeSnapshot.formulas" :key="row.formula">
              <td>{{ row.formula }}</td>
              <td>{{ row.count }}</td>
              <td>{{ row.atomTotal }}</td>
              <td>{{ pct(row.moleculeFraction) }}</td>
              <td>{{ pct(row.atomFraction) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="moleculeSnapshot" class="molecules-status">
          Molecules: {{ moleculeSnapshot.moleculeCount }},
          free atoms: {{ moleculeSnapshot.freeAtomCount }},
          total atoms: {{ moleculeSnapshot.totalAtoms }}
        </div>
      </div>
      <div class="energy-readout">
        <div class="energy-readout-header">
          <h5 class="mb-0">Energy</h5>
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary"
            title="Reset baseline E₀"
            @click="resetEnergyBaseline"
          >
            E₀
          </button>
        </div>
        <dl class="energy-readout-rows">
          <div>
            <dt>E</dt>
            <dd>{{ fmt(energySnapshot.current.total) }}</dd>
          </div>
          <div>
            <dt>KE</dt>
            <dd>{{ fmt(energySnapshot.current.kinetic) }}</dd>
          </div>
          <div>
            <dt>U</dt>
            <dd>{{ fmt(energyPotential) }}</dd>
          </div>
          <div>
            <dt>ΔE/E₀</dt>
            <dd>{{ energyDeltaPct }}</dd>
          </div>
        </dl>
      </div>
      <div v-for="config in timeSeriesConfigBase">
        <chart-flow
          :id="config.id"
          :name="config.name"
          :data="config.data"
          :period="config.period ?? 100"
          :width="config.width ?? 467"
          :height="config.height ?? 100"
          :config="config.config"
        />
      </div>
      <div>
        <flag title="Mean Mode" v-model="showMean" />
      </div>
      <div v-for="config in timeSeriesConfigCount" v-show="!showMean">
        <chart-flow
          :id="config.id"
          :name="config.name"
          :data="config.data"
          :period="config.period ?? 100"
          :width="config.width ?? 467"
          :height="config.height ?? 100"
          :config="config.config"
        />
      </div>
      <div v-for="config in timeSeriesConfigMean" v-show="showMean">
        <chart-flow
          :id="config.id"
          :name="config.name"
          :data="config.data"
          :period="config.period ?? 100"
          :width="config.width ?? 467"
          :height="config.height ?? 100"
          :config="config.config"
        />
      </div>
    </template>
  </config-section>
</template>

<style scoped lang="scss">

@use "../../assets/config-editor";

.energy-readout {
  margin-bottom: 1rem;
}

.molecules-panel {
  margin-bottom: 1.25rem;
}

.molecules-controls {
  display: grid;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.molecules-wait {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem;
  align-items: center;
}

.molecules-status {
  margin-top: 0.5rem;
  color: #bbb;
  font-size: 0.9rem;
}

.molecules-table {
  width: 100%;
  margin-top: 0.75rem;
  border-collapse: collapse;

  th,
  td {
    padding: 0.25rem 0.35rem;
    border-bottom: 1px solid #444;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  th:first-child,
  td:first-child {
    text-align: left;
  }
}

.energy-readout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.energy-readout-rows {
  display: grid;
  gap: 0.2rem;
  margin: 0;

  > div {
    display: grid;
    grid-template-columns: 3.5rem 1fr;
    gap: 0.5rem;
  }

  dt,
  dd {
    margin: 0;
  }

  dd {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
}

</style>
