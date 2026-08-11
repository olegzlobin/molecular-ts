<script setup lang="ts">

import type { TransformationConfig } from "@/lib/config/types";
import { decodeTransformType, encodeTransform, isMergeTransform } from "@/lib/config/types";
import { ref, watch } from "vue";
import TypeSelect from "@/web/components/inputs/type-select.vue";

const modelValue = defineModel<TransformationConfig>();
defineProps<{
  colors: [number, number, number][];
}>();

type InteractionKind = 'link' | 'merge';

type TransformationRow = {
  lhs: number;
  rhs: number;
  type: number;
  kind: InteractionKind;
};

const transformations = ref<TransformationRow[]>([]);
let syncing = false;

const syncForward = () => {
  if (syncing || !modelValue.value) {
    return;
  }
  syncing = true;
  const next: TransformationRow[] = [];
  for (const i in modelValue.value) {
    for (const j in modelValue.value[Number(i)]) {
      const raw = modelValue.value[Number(i)][Number(j)];
      next.push({
        lhs: Number(i),
        rhs: Number(j),
        type: decodeTransformType(raw),
        kind: isMergeTransform(raw) ? 'merge' : 'link',
      });
    }
  }
  transformations.value = next;
  syncing = false;
};

const syncBackward = () => {
  if (syncing || !modelValue.value) {
    return;
  }
  syncing = true;
  for (const i in modelValue.value) {
    delete modelValue.value[Number(i)];
  }
  for (const { lhs, rhs, type, kind } of transformations.value) {
    const from = Number(lhs);
    const withType = Number(rhs);
    const to = Number(type);
    if (!(from in modelValue.value)) {
      modelValue.value[from] = {};
    }
    modelValue.value[from][withType] = encodeTransform(to, kind === 'merge');
  }
  syncing = false;
};

watch(modelValue, syncForward, { immediate: true });
watch(transformations, syncBackward, { deep: true });

const addTransformation = () => {
  transformations.value.push({ lhs: 0, rhs: 0, type: 0, kind: 'link' });
};

const removeTransformation = (index: number) => {
  transformations.value.splice(index, 1);
};

</script>

<template>
  <div class="input-group mb-3">
    <div class="input-group-append">
      <button class="btn btn-outline-secondary" @click="addTransformation">Add rule</button>
    </div>
  </div>
  <div class="list-group">
    <div class="list-group-item d-flex justify-content-between align-items-center" v-for="(transform, index) in transformations" :key="index">
      <div class="list-item__name">
        <div>
          <type-select :colors="colors" v-model="transform.lhs" />
        </div>
        <div>
          <select class="kind-select" v-model="transform.kind">
            <option value="link">↻</option>
            <option value="merge">+</option>
          </select>
        </div>
        <div>
          <type-select :colors="colors" v-model="transform.rhs" />
        </div>
        <div>
          ➔
        </div>
        <div>
          <type-select :colors="colors" v-model="transform.type" />
        </div>
      </div>
      <div class="btn-group">
        <button class="btn btn-outline-secondary" @click="removeTransformation(index)">Remove</button>
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

.kind-select {
  width: 50px;
  height: 30px;
  text-align: center;
}

</style>
