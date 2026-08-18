<script setup lang="ts">

import { computed, ref, useSlots } from "vue";

type Position = 'center' | 'left' | 'right';

const props = withDefaults(defineProps<{
  text?: string;
  nowrap?: boolean;
  width?: number;
  position?: Position;
}>(), {
  text: '',
  nowrap: false,
  width: 300,
  position: 'center',
});

const slots = useSlots();
const isRich = computed(() => !!slots.content);

const container = ref<HTMLElement | null>(null);
const anchor = ref<HTMLElement | null>(null);
const richShown = ref(false);
const richBox = ref({ top: 0, left: 0, maxHeight: 0 });
let hideTimer: ReturnType<typeof setTimeout> | undefined;

const offset = (el: HTMLElement) => {
  const rect = el.getBoundingClientRect();
  const scrollLeft = document.documentElement.scrollLeft;
  const scrollTop = document.documentElement.scrollTop;
  return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
}

const placeRich = () => {
  const el = anchor.value;
  if (!el) {
    return;
  }
  const pad = 8;
  const rect = el.getBoundingClientRect();
  const maxLeft = window.innerWidth - props.width - pad;
  const top = Math.min(rect.bottom + 4, window.innerHeight - pad);
  richBox.value = {
    top: Math.max(pad, top),
    left: Math.max(pad, Math.min(rect.left, maxLeft)),
    maxHeight: Math.max(80, window.innerHeight - Math.max(pad, top) - pad),
  };
  richShown.value = true;
};

const onMouseover = () => {
  if (hideTimer !== undefined) {
    clearTimeout(hideTimer);
    hideTimer = undefined;
  }

  if (isRich.value) {
    placeRich();
    return;
  }

  if (props.position === 'left') {
    return;
  }

  const divOffset = offset((container.value as unknown as HTMLElement));
  const element = (container.value as unknown as HTMLElement);
  if (divOffset.left < 0) {
    element.style.marginLeft = `${-divOffset.left}px`;
  }
};

const onMouseleave = () => {
  if (!isRich.value) {
    return;
  }
  hideTimer = setTimeout(() => {
    richShown.value = false;
    hideTimer = undefined;
  }, 120);
};

const style = computed(() => {
  if (isRich.value) {
    return {
      width: `${props.width}px`,
      top: `${richBox.value.top}px`,
      left: `${richBox.value.left}px`,
      maxHeight: `${richBox.value.maxHeight}px`,
    };
  }

  let left = '0';
  if (props.position === 'center') {
    left = `${-props.width/2}px`;
  } else if (props.position === 'right') {
    left = `100%`;
  }

  return {
    width: `${props.width}px`,
    left: left,
  };
});

</script>

<template>
  <span
    ref="anchor"
    :data-tooltip="text"
    :class="{ nowrap, rich: isRich }"
    @mouseover="onMouseover"
    @mouseleave="onMouseleave"
  >
    <Teleport to="body" :disabled="!isRich">
      <span
        v-show="!isRich || richShown"
        class="before"
        :class="{ floating: isRich }"
        :style="style"
        ref="container"
        @mouseover="onMouseover"
        @mouseleave="onMouseleave"
      >
        <slot name="content">{{ text }}</slot>
      </span>
    </Teleport>
    <slot />
  </span>
</template>

<style scoped lang="scss">

[data-tooltip] {
  position: relative;
}

[data-tooltip] .before,
.before.floating {
  transform: scale(0);
  position: absolute;
  bottom: 50%;
  background: #1e1e1e;
  color: rgb(180, 180, 180);
  padding: 7px 15px;
  border-radius: 5px;
  border: 2px solid rgb(115, 115, 115);
  opacity: 0;
  transition: 0.3s opacity ease, 0.3s bottom ease;
  overflow: hidden;
  pointer-events: none;
  text-align: left;
  white-space: pre-line;
  z-index: 100000;
  margin-bottom: 3px;
  box-shadow: 0 0 30px 0 rgba(0, 0, 0, 0.9);
}

[data-tooltip].nowrap .before {
  white-space: nowrap;
}

[data-tooltip]:hover .before:not(.floating) {
  transform: scale(1);
  position: absolute;
  display: inline-block;
  opacity: 1;
  bottom: 100%;
}

.before.floating {
  position: fixed;
  bottom: auto;
  margin-bottom: 0;
  overflow: auto;
  white-space: normal;
  transform: none;
  opacity: 1;
  pointer-events: auto;
}

</style>
