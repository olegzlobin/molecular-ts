<script setup lang="ts">

import { getColorString } from "@/web/components/config-editor/utils";
import { defaultTypeName } from "@/lib/config/atom-types";
import { computed, ref } from "vue";

const modelValue = defineModel<number | null>();
const props = withDefaults(defineProps<{
  colors: [number, number, number][];
  names?: string[];
  allowNone?: boolean;
}>(), {
  allowNone: false,
});

const isOpen = ref(false);

const selectedColor = computed(() => {
  if (modelValue.value === null || modelValue.value === undefined) {
    return 'transparent';
  }
  const color = props.colors[Number(modelValue.value)] ?? props.colors[0];
  return color ? getColorString(color) : 'rgb(128, 128, 128)';
});

const selectedName = computed(() => {
  if (modelValue.value === null || modelValue.value === undefined) {
    return '∅';
  }
  return props.names?.[Number(modelValue.value)] || defaultTypeName(Number(modelValue.value));
});

const typeName = (index: number) => props.names?.[index] || defaultTypeName(index);

const select = (index: number | null) => {
  modelValue.value = index;
  isOpen.value = false;
};

const toggle = () => {
  isOpen.value = !isOpen.value;
};

const close = () => {
  isOpen.value = false;
};

</script>

<template>
  <div class="type-select" @focusout="close">
    <button
      type="button"
      class="type-select__toggle"
      :class="{ 'type-select__toggle--none': modelValue === null }"
      :style="{ backgroundColor: selectedColor }"
      :aria-expanded="isOpen"
      :title="selectedName"
      @click="toggle"
    >
      <span>{{ selectedName }}</span>
    </button>
    <ul v-show="isOpen" class="type-select__menu">
      <li
        v-if="allowNone"
        class="type-select__option type-select__option--none"
        :class="{ 'type-select__option--active': modelValue === null }"
        @mousedown.prevent="select(null)"
      >∅</li>
      <li
        v-for="(color, index) in colors"
        :key="index"
        class="type-select__option"
        :class="{ 'type-select__option--active': index === modelValue }"
        :style="{ backgroundColor: getColorString(color) }"
        :title="typeName(index)"
        @mousedown.prevent="select(index)"
      >
        <span>{{ typeName(index) }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">

.type-select {
  position: relative;
  display: inline-block;
}

.type-select__toggle {
  min-width: 50px;
  height: 30px;
  border: 1px solid #999;
  padding: 0 6px;
  cursor: pointer;
  color: #111;
  font-size: 12px;
  font-weight: 600;
  line-height: 28px;
  text-align: center;
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.7);
}

.type-select__toggle--none {
  background: #2a2a2a !important;
  color: #ccc;
  text-shadow: none;
}

.type-select__menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 20;
  margin: 0;
  padding: 4px;
  list-style: none;
  background: #1e1e1e;
  border: 1px solid rgb(115, 115, 115);
  min-width: 50px;
}

.type-select__option {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  height: 24px;
  margin: 2px 0;
  padding: 0 6px;
  cursor: pointer;
  border: 1px solid transparent;
  color: #111;
  font-size: 11px;
  font-weight: 600;
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.7);
  transition: filter 0.1s ease, outline 0.1s ease;
}

.type-select__option--none {
  color: #ccc;
  background: #2a2a2a;
  font-size: 14px;
  text-shadow: none;
}

.type-select__option:hover {
  filter: brightness(1.25);
  outline: 1px solid #fff;
}

.type-select__option--active {
  border-color: #fff;
}

</style>
