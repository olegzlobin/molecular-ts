<script setup lang="ts">

import type { DecayConfig } from "@/lib/config/types";
import { ref, watch } from "vue";
import TypeSelect from "@/web/components/inputs/type-select.vue";

const modelValue = defineModel<DecayConfig>();
defineProps<{
  colors: [number, number, number][];
}>();

type DecayRow = {
  from: number;
  halfLife: number;
  to: number;
  secondary: number | null;
  stabilizers: number[];
};

const rows = ref<DecayRow[]>([]);
let syncing = false;

const syncForward = () => {
  if (syncing || !modelValue.value) {
    return;
  }
  syncing = true;
  const next: DecayRow[] = [];
  for (const from in modelValue.value) {
    const rule = modelValue.value[Number(from)];
    next.push({
      from: Number(from),
      halfLife: rule.halfLife,
      to: rule.to,
      secondary: rule.secondary ?? null,
      stabilizers: [...(rule.stabilizers ?? [])],
    });
  }
  rows.value = next;
  syncing = false;
};

const syncBackward = () => {
  if (syncing || !modelValue.value) {
    return;
  }
  syncing = true;
  for (const key in modelValue.value) {
    delete modelValue.value[Number(key)];
  }
  for (const row of rows.value) {
    modelValue.value[Number(row.from)] = {
      halfLife: Number(row.halfLife),
      to: Number(row.to),
      secondary: row.secondary === null || row.secondary === undefined ? null : Number(row.secondary),
      stabilizers: row.stabilizers.map(Number),
    };
  }
  syncing = false;
};

watch(modelValue, syncForward, { immediate: true });
watch(rows, syncBackward, { deep: true });

const addRule = () => {
  rows.value.push({ from: 0, halfLife: 100, to: 0, secondary: null, stabilizers: [] });
};

const removeRule = (index: number) => {
  rows.value.splice(index, 1);
};

const addStabilizer = (row: DecayRow) => {
  row.stabilizers.push(0);
};

const removeStabilizer = (row: DecayRow, index: number) => {
  row.stabilizers.splice(index, 1);
};

</script>

<template>
  <div class="input-group mb-3">
    <div class="input-group-append">
      <button class="btn btn-outline-secondary" @click="addRule">Add rule</button>
    </div>
  </div>
  <div class="list-group">
    <div
      class="list-group-item d-flex justify-content-between align-items-center"
      v-for="(row, index) in rows"
      :key="index"
    >
      <div class="list-item__name">
        <div>
          <type-select :colors="colors" v-model="row.from" />
        </div>
        <div class="list-item__icon">⏳</div>
        <div>
          <input class="half-life" type="number" min="1" step="1" v-model.number="row.halfLife" />
        </div>
        <div class="list-item__icon">➔</div>
        <div>
          <type-select :colors="colors" v-model="row.to" />
        </div>
        <div class="list-item__icon">+</div>
        <div>
          <type-select :colors="colors" allow-none v-model="row.secondary" />
        </div>
        <div class="list-item__icon">⛓</div>
        <div
          v-for="(_, sIndex) in row.stabilizers"
          :key="sIndex"
          class="stabilizer"
        >
          <type-select :colors="colors" v-model="row.stabilizers[sIndex]" />
          <button class="btn btn-sm btn-outline-secondary stabilizer__remove" @click="removeStabilizer(row, sIndex)">×</button>
        </div>
        <div>
          <button class="btn btn-sm btn-outline-secondary" @click="addStabilizer(row)">+</button>
        </div>
      </div>
      <div class="btn-group">
        <button class="btn btn-outline-secondary" @click="removeRule(index)">Remove</button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">

.list-item__name > div {
  display: inline-block;
  padding-right: 15px;
  vertical-align: middle;
}

.list-item__icon {
  min-width: 20px;
  text-align: center;
}

.half-life {
  width: 70px;
  height: 30px;
}

.stabilizer {
  position: relative;
}

.stabilizer__remove {
  margin-left: 4px;
  padding: 0 6px;
  height: 30px;
  vertical-align: top;
}

</style>
