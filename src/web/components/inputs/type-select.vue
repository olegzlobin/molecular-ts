<script setup lang="ts">

import { getColorString } from "@/web/components/config-editor/utils";
import { computed, ref } from "vue";

const modelValue = defineModel<number | null>();
const props = withDefaults(defineProps<{
  colors: [number, number, number][];
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
      @click="toggle"
    >
      <span v-if="modelValue === null">∅</span>
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
        @mousedown.prevent="select(index)"
      />
    </ul>
  </div>
</template>

<style scoped lang="scss">

.type-select {
  position: relative;
  display: inline-block;
}

.type-select__toggle {
  width: 50px;
  height: 30px;
  border: 1px solid #999;
  padding: 0;
  cursor: pointer;
  color: #ccc;
  line-height: 28px;
  text-align: center;
}

.type-select__toggle--none {
  background: #2a2a2a !important;
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
  width: 42px;
  height: 24px;
  margin: 2px 0;
  cursor: pointer;
  border: 1px solid transparent;
  transition: filter 0.1s ease, outline 0.1s ease;
}

.type-select__option--none {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ccc;
  background: #2a2a2a;
  font-size: 14px;
}

.type-select__option:hover {
  filter: brightness(1.25);
  outline: 1px solid #fff;
}

.type-select__option--active {
  border-color: #fff;
}

</style>
