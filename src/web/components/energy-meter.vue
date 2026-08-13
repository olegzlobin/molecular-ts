<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useSimulationStore } from '@/web/store/simulation';
import { emptyEnergyReport, type EnergyReport } from '@/lib/analysis/energy';

const STORAGE_KEY = 'energy-meter-visible';

const simulationStore = useSimulationStore();
const report = ref<EnergyReport>(emptyEnergyReport());
const visible = ref(true);
let timer: ReturnType<typeof setInterval> | undefined;

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

const deltaPct = computed(() => {
  const rel = report.value.deltaRel;
  if (!Number.isFinite(rel)) {
    return '—';
  }
  return `${(rel * 100).toFixed(3)}%`;
});

const potential = computed(() => {
  const c = report.value.current;
  return c.gravity + c.bounce + c.link + c.bounds;
});

const refresh = () => {
  try {
    const sim = simulationStore.getCurrentSimulation();
    if (visible.value) {
      sim.setEnergyTracking(true);
    }
    report.value = sim.energy;
  } catch {
    report.value = emptyEnergyReport();
  }
};

const resetBaseline = () => {
  try {
    simulationStore.getCurrentSimulation().resetEnergyBaseline();
    refresh();
  } catch {
    // simulation not ready
  }
};

const startPolling = () => {
  if (timer !== undefined) {
    return;
  }
  try {
    simulationStore.getCurrentSimulation().setEnergyTracking(true);
  } catch {
    // simulation not ready
  }
  refresh();
  timer = setInterval(refresh, 200);
};

const stopPolling = () => {
  if (timer === undefined) {
    return;
  }
  clearInterval(timer);
  timer = undefined;
  try {
    simulationStore.getCurrentSimulation().setEnergyTracking(false);
  } catch {
    // simulation not ready
  }
};

watch(visible, (isVisible) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(isVisible));
  if (isVisible) {
    startPolling();
  } else {
    stopPolling();
  }
});

onMounted(() => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) {
    try {
      visible.value = JSON.parse(stored) === true;
    } catch {
      visible.value = true;
    }
  }
  if (visible.value) {
    startPolling();
  }
});

onUnmounted(() => {
  stopPolling();
});
</script>

<template>
  <div v-if="visible" class="energy-meter card bg-body-tertiary border-secondary shadow-sm">
    <div class="card-header d-flex align-items-center justify-content-between py-2 px-3">
      <span class="fw-semibold">Energy</span>
      <div class="btn-group btn-group-sm" role="group">
        <button
          type="button"
          class="btn btn-outline-secondary"
          title="Reset baseline E₀"
          @click="resetBaseline"
        >
          E₀
        </button>
        <button
          type="button"
          class="btn btn-outline-secondary"
          title="Hide energy meter"
          aria-label="Hide"
          @click="visible = false"
        >
          ×
        </button>
      </div>
    </div>
    <div class="card-body py-2 px-3">
      <dl class="energy-rows mb-0">
        <div>
          <dt class="text-secondary">E</dt>
          <dd>{{ fmt(report.current.total) }}</dd>
        </div>
        <div>
          <dt class="text-secondary">KE</dt>
          <dd>{{ fmt(report.current.kinetic) }}</dd>
        </div>
        <div>
          <dt class="text-secondary">U</dt>
          <dd>{{ fmt(potential) }}</dd>
        </div>
        <div>
          <dt class="text-secondary">ΔE/E₀</dt>
          <dd :class="{ 'text-warning': Math.abs(report.deltaRel) > 0.05 }">{{ deltaPct }}</dd>
        </div>
      </dl>
      <details class="mt-2">
        <summary class="text-secondary small">breakdown</summary>
        <dl class="energy-rows mt-1 mb-0">
          <div>
            <dt class="text-secondary">grav</dt>
            <dd>{{ fmt(report.current.gravity) }}</dd>
          </div>
          <div>
            <dt class="text-secondary">bounce</dt>
            <dd>{{ fmt(report.current.bounce) }}</dd>
          </div>
          <div>
            <dt class="text-secondary">link</dt>
            <dd>{{ fmt(report.current.link) }}</dd>
          </div>
          <div>
            <dt class="text-secondary">bounds</dt>
            <dd>{{ fmt(report.current.bounds) }}</dd>
          </div>
        </dl>
      </details>
    </div>
  </div>
  <button
    v-else
    type="button"
    class="energy-meter-show btn btn-outline-secondary bg-body-tertiary shadow-sm"
    title="Show energy meter"
    @click="visible = true"
  >
    Energy
  </button>
</template>

<style scoped lang="scss">
.energy-meter,
.energy-meter-show {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 40;
}

.energy-meter {
  min-width: 180px;
  font-size: 0.875rem;
}

.energy-rows {
  display: grid;
  gap: 0.15rem;

  > div {
    display: grid;
    grid-template-columns: 3.25rem 1fr;
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

details summary {
  cursor: pointer;
  list-style: none;

  &::-webkit-details-marker {
    display: none;
  }
}
</style>
