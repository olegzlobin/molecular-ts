<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18nStore } from '@/web/store/i18n';

const props = withDefaults(defineProps<{
  values: [number, number, number?, number?, number?];
  min?: number;
  max?: number;
  step?: number;
}>(), {
  step: 1,
});

const i18n = useI18nStore();

onMounted(() => {
  if (props.values[4] === undefined || props.values[4] === null) {
    props.values[4] = 1;
  }
});

</script>

<template>
  <table>
    <tbody>
      <tr>
        <td>{{ i18n.t('min') }}</td>
        <td>{{ i18n.t('max') }}</td>
        <td>{{ i18n.t('median') }}</td>
        <td v-if="values[3] !== undefined && values[3] !== null" width="20%">{{ i18n.t('step') }}</td>
        <td width="20%" :title="i18n.t('Share of values that deviate from median. 1 = fully random, 0 = all median.')">{{ i18n.t('share') }}</td>
      </tr>
      <tr>
        <td>
          <input type="number" v-model="values[0]" :step="step" :min="min" :max="max">
        </td>
        <td>
          <input type="number" v-model="values[1]" :step="step" :min="min" :max="max">
        </td>
        <td>
          <input type="number" v-model="values[2]" :step="0.1" :min="min" :max="max">
        </td>
        <td v-if="values[3] !== undefined && values[3] !== null">
          <input type="number" v-model="values[3]" :step="0.1" :min="0" :max="values[1] - values[0]">
        </td>
        <td>
          <input type="number" v-model="values[4]" :step="0.05" :min="0" :max="1">
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped lang="scss">

@use "../config-editor/assets/config-editor";

</style>
