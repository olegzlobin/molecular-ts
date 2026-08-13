<script setup lang="ts">

import { computed, ref } from "vue";
import {
  MDBTabs,
  MDBTabNav,
  MDBTabContent,
  MDBTabItem,
  MDBTabPane,
} from 'mdb-vue-ui-kit';
import { getColorString } from '@/web/components/config-editor/utils';
import ConfigMatrix from '@/web/components/inputs/config-matrix.vue';

const symmetric = defineModel<boolean | undefined>('symmetric');

const props = withDefaults(defineProps<{
  colors: [number, number, number][];
  values: number[][][];
  min?: number;
  max?: number;
  step?: number;
  tabLabel?: string;
  matrixHint?: string;
}>(), {
  step: 0.1,
  tabLabel: 'Agent',
  matrixHint: '',
});

const activeTabId = ref('tab-0');

const activeAgentIndex = computed(() => {
  const match = /^tab-(\d+)$/.exec(activeTabId.value);
  return match ? Number(match[1]) : 0;
});

</script>

<template>
  <div class="config-tensor-widget">
    <div class="tensor-axis-label">{{ tabLabel }}</div>
    <MDBTabs v-model="activeTabId">
      <MDBTabNav fill>
        <MDBTabItem
          :tabId="`tab-${index}`"
          href="javascript:void(0);"
          v-for="(color, index) in colors"
          :style="{ backgroundColor: getColorString(color), height: '30px' }"
        ></MDBTabItem>
      </MDBTabNav>
      <MDBTabContent>
        <MDBTabPane :tabId="`tab-${index}`" v-for="(matrix, index) in values">
          <div class="my-tab-pane">
            <div v-if="matrixHint" class="tensor-matrix-hint">
              {{ matrixHint }}
            </div>
            <div class="tensor-matrix-caption">
              Bond A ⟷ B
              <span
                class="agent-swatch"
                :style="{ backgroundColor: getColorString(colors[activeAgentIndex] ?? colors[0]) }"
              ></span>
            </div>
            <config-matrix
              :values="matrix"
              :colors="colors"
              :step="step"
              :min="min"
              :max="max"
              v-model:symmetric="symmetric"
            />
          </div>
        </MDBTabPane>
      </MDBTabContent>
    </MDBTabs>
  </div>
</template>

<style scoped lang="scss">

@use "../config-editor/assets/config-editor";
@use "../../../../node_modules/bootstrap/scss/bootstrap-utilities";

.tensor-axis-label {
  font-size: 0.85rem;
  opacity: 0.8;
  margin-bottom: 6px;
}

.tensor-matrix-hint {
  font-size: 0.8rem;
  opacity: 0.75;
  margin-bottom: 8px;
  line-height: 1.35;
}

.tensor-matrix-caption {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  margin-bottom: 8px;
}

.agent-swatch {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.2);
  flex: 0 0 auto;
}

.my-tab-pane {
  padding: 15px;
  border: 1px solid var(--bs-border-color);
  border-top: transparent;
}

</style>

<style lang="scss">

.config-tensor-widget {
  .fade {
    transition: none !important;
    opacity: 1 !important;
  }

  .nav-link {
    opacity: 0.4 !important;
  }

  .nav-link.active {
    opacity: 1 !important;
  }
}

</style>
