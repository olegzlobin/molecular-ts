<script setup lang="ts">

import { computed, type Ref, ref, watch } from "vue";
import { useConfigStore } from "@/web/store/config";
import { useSimulationStore } from "@/web/store/simulation";
import ConfigSection from '@/web/components/config-editor/components/containers/config-section.vue';
import ConfigBounds from "@/web/components/inputs/config-bounds.vue";
import InitialConfigSection from "@/web/components/config-editor/components/sections/initial-config-section.vue";
import Flag from "@/web/components/inputs/flag.vue";
import InputHeader from "@/web/components/base/input-header.vue";
import RandomizeConfigSnippets from "@/web/components/config-editor/components/widgets/randomize-config-snippets.vue";
import { useI18nStore } from "@/web/store/i18n";

const configStore = useConfigStore();
const { randomTypesConfig, typesConfig } = configStore;
const i18n = useI18nStore();

const {
  clearAtoms,
  refillAtoms,
} = useSimulationStore();

const forceRefill = ref(true);

const needRefill = computed((): boolean => {
  return randomTypesConfig.TYPES_COUNT !== configStore.typesConfig.COLORS.length ||
    randomTypesConfig.USE_FREQUENCY_BOUNDS || forceRefill.value;
});

const useIgnoreSubMatricesBoundaryIndex: Ref<boolean> = ref(false);
const ignoreSubMatricesBoundaryIndex: Ref<number | undefined> = ref(3);

watch(useIgnoreSubMatricesBoundaryIndex, () => {
  if (useIgnoreSubMatricesBoundaryIndex.value) {
    randomTypesConfig.TYPES_COUNT = typesConfig.FREQUENCIES.length;
  }
});

const randomizeTypesConfig = () => {
  if (!confirm(i18n.t('Are you sure?'))) {
    return;
  }

  const crossValue = useIgnoreSubMatricesBoundaryIndex.value
    ? ignoreSubMatricesBoundaryIndex.value
    : undefined;

  if (needRefill.value) {
    clearAtoms!(true);
    configStore.randomizeTypesConfig(crossValue);
    refillAtoms!(true);
  } else {
    configStore.randomizeTypesConfig(crossValue);
  }
};

</script>

<template>
  <config-section>
    <template #body>
      <div>
        <input-header
          name="Types Count"
          tooltip="Count of particle types."
          tooltip-position="left"
          :tooltip-width="200"
        />
      </div>
      <div>
        <input type="number" min="0" step="1" v-model="randomTypesConfig.TYPES_COUNT" />
      </div>

      <div v-show="!useIgnoreSubMatricesBoundaryIndex">
        <input-header
          name="Radius"
          tooltip="Radius of each type of particles."
          tooltip-position="left"
          :tooltip-width="400"
        >
          <input type="checkbox" class="title-flag" v-model="randomTypesConfig.USE_RADIUS_BOUNDS" />
        </input-header>
        <div v-show="randomTypesConfig.USE_RADIUS_BOUNDS">
          <config-bounds
            :step="1"
            :values="randomTypesConfig.RADIUS_BOUNDS"
          />
        </div>
      </div>

      <div v-show="!useIgnoreSubMatricesBoundaryIndex">
        <input-header
          name="Frequencies"
          tooltip="Ratio of the number of particles that will be generated on refill."
          tooltip-position="left"
          :tooltip-width="400"
        >
          <input type="checkbox" class="title-flag" v-model="randomTypesConfig.USE_FREQUENCY_BOUNDS" />
        </input-header>
        <div v-show="randomTypesConfig.USE_FREQUENCY_BOUNDS">
          <config-bounds
            :step="1"
            :values="randomTypesConfig.FREQUENCY_BOUNDS"
          />
        </div>
      </div>


      <div v-show="!useIgnoreSubMatricesBoundaryIndex">
        <input-header
          name="Mass"
          tooltip="Inertial mass of each type (a = F / m)."
          tooltip-position="left"
        >
          <input type="checkbox" class="title-flag" v-model="randomTypesConfig.USE_MASS_BOUNDS" />
        </input-header>
        <div v-show="randomTypesConfig.USE_MASS_BOUNDS">
          <config-bounds :step="0.1" :values="randomTypesConfig.MASS_BOUNDS" />
        </div>
      </div>

      <div>
        <input-header
          name="Gravity"
          tooltip="Gravity coefficient matrix for unlinked particles shows whether a particle of one type will attract or
                 repel a particle of another type in the case when they are not linked to each other, and with what force."
          tooltip-position="left"
        >
          <input type="checkbox" class="title-flag" v-model="randomTypesConfig.USE_GRAVITY_BOUNDS" />
        </input-header>
        <div v-show="randomTypesConfig.USE_GRAVITY_BOUNDS">
          <config-bounds
            :step="1"
            :values="randomTypesConfig.GRAVITY_BOUNDS"
          />
          <flag title="Symmetric" v-model="randomTypesConfig.GRAVITY_MATRIX_SYMMETRIC" />
        </div>
      </div>

      <div>
        <input-header
          name="Link Bias"
          tooltip="Constant radial force along bonded pairs. Positive attracts, negative repels."
          tooltip-position="left"
        >
          <input type="checkbox" class="title-flag" v-model="randomTypesConfig.USE_LINK_BIAS_BOUNDS" />
        </input-header>
        <div v-show="randomTypesConfig.USE_LINK_BIAS_BOUNDS">
          <config-bounds
            :step="0.05"
            :values="randomTypesConfig.LINK_BIAS_BOUNDS"
          />
        <flag title="Symmetric" v-model="randomTypesConfig.LINK_BIAS_MATRIX_SYMMETRIC" />
        </div>
      </div>

      <div v-show="!useIgnoreSubMatricesBoundaryIndex">
        <input-header
          name="Links Count"
          tooltip="Maximum total bond order (valence) per type. Used valence is the sum of bond orders on the atom."
          tooltip-position="left"
        >
          <input type="checkbox" class="title-flag" v-model="randomTypesConfig.USE_LINK_BOUNDS" />
        </input-header>
        <div v-show="randomTypesConfig.USE_LINK_BOUNDS">
          <config-bounds :step="1" :values="randomTypesConfig.LINK_BOUNDS" />
        </div>
      </div>

      <div>
        <input-header
          name="Types Link Weights"
          tooltip="Nominal bond order per type pair. Max partners of that type = floor(Links / weight). Preference = Bond Preference × order."
          tooltip-position="left"
        >
          <input type="checkbox" class="title-flag" v-model="randomTypesConfig.USE_LINK_TYPE_WEIGHT_BOUNDS" />
        </input-header>
        <div v-show="randomTypesConfig.USE_LINK_TYPE_WEIGHT_BOUNDS">
          <config-bounds :step="1" :values="randomTypesConfig.LINK_TYPE_WEIGHT_BOUNDS" />
          <flag title="Symmetric" v-model="randomTypesConfig.LINK_TYPE_WEIGHT_MATRIX_SYMMETRIC" />
        </div>
      </div>

      <div>
        <input-header
          name="Bond Preference"
          tooltip="Preference per unit of bond order. Effective preference is this × order."
          tooltip-position="left"
        >
          <input type="checkbox" class="title-flag" v-model="randomTypesConfig.USE_BOND_PREFERENCE_BOUNDS" />
        </input-header>
        <div v-show="randomTypesConfig.USE_BOND_PREFERENCE_BOUNDS">
          <config-bounds :step="0.1" :values="randomTypesConfig.BOND_PREFERENCE_BOUNDS" />
          <flag title="Symmetric" v-model="randomTypesConfig.BOND_PREFERENCE_MATRIX_SYMMETRIC" />
        </div>
      </div>

      <div>
        <input-header
          name="Bond Preference Factor"
          tooltip="Per-agent multipliers for bond A⟷B while the agent is bonded to A or B. >1 catalyzes, <1 inhibits."
          tooltip-position="left"
        >
          <input type="checkbox" class="title-flag" v-model="randomTypesConfig.USE_BOND_PREFERENCE_FACTOR_BOUNDS" />
        </input-header>
        <div v-show="randomTypesConfig.USE_BOND_PREFERENCE_FACTOR_BOUNDS">
          <config-bounds :step="0.1" :values="randomTypesConfig.BOND_PREFERENCE_FACTOR_BOUNDS" />
          <div class="grid-wrapper">
            <div>
              <flag
                title="Symmetric"
                v-model="randomTypesConfig.BOND_PREFERENCE_FACTOR_MATRIX_SYMMETRIC"
              />
            </div>
            <div></div>
            <div>
              <flag
                title="Ignore self type"
                v-model="randomTypesConfig.BOND_PREFERENCE_FACTOR_IGNORE_SELF_TYPE"
                style="text-align: center;"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <input-header
          name="Link Strength Factor"
          tooltip="Per-agent multipliers for stiffness and break radius of A⟷B while the agent is bonded to A or B. <1 weakens, >1 strengthens."
          tooltip-position="left"
        >
          <input type="checkbox" class="title-flag" v-model="randomTypesConfig.USE_LINK_STRENGTH_FACTOR_BOUNDS" />
        </input-header>
        <div v-show="randomTypesConfig.USE_LINK_STRENGTH_FACTOR_BOUNDS">
          <config-bounds :step="0.1" :values="randomTypesConfig.LINK_STRENGTH_FACTOR_BOUNDS" />
          <div class="grid-wrapper">
            <div>
              <flag
                title="Symmetric"
                v-model="randomTypesConfig.LINK_STRENGTH_FACTOR_MATRIX_SYMMETRIC"
              />
            </div>
            <div></div>
            <div>
              <flag
                title="Ignore self type"
                v-model="randomTypesConfig.LINK_STRENGTH_FACTOR_IGNORE_SELF_TYPE"
                style="text-align: center;"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-show="!useIgnoreSubMatricesBoundaryIndex">
        <input-header
          name="Link Length"
          tooltip="Per-type link length multiplier. Pair length is the average of both types."
          tooltip-position="left"
          :tooltip-width="400"
        >
          <input type="checkbox" class="title-flag" v-model="randomTypesConfig.USE_LINK_LENGTH_BOUNDS" />
        </input-header>
        <div v-show="randomTypesConfig.USE_LINK_LENGTH_BOUNDS">
          <config-bounds :step="0.1" :values="randomTypesConfig.LINK_LENGTH_BOUNDS" />
        </div>
      </div>

      <div v-show="!useIgnoreSubMatricesBoundaryIndex">
        <input-header
          name="Link Stiffness"
          tooltip="Per-type link stiffness multiplier. Pair stiffness is the average of both types."
          tooltip-position="left"
          :tooltip-width="400"
        >
          <input type="checkbox" class="title-flag" v-model="randomTypesConfig.USE_LINK_STIFFNESS_BOUNDS" />
        </input-header>
        <div v-show="randomTypesConfig.USE_LINK_STIFFNESS_BOUNDS">
          <config-bounds :step="0.1" :values="randomTypesConfig.LINK_STIFFNESS_BOUNDS" />
        </div>
      </div>

      <div>
        <input-header
          name="Change only crossed submatrices"
          tooltip="Apply changes only to the upper right and lower left quadrants of a matrix divided by
                   a specified number of types."
          tooltip-position="center"
          :style-bold="false"
        >
          <input type="checkbox" class="title-flag" v-model="useIgnoreSubMatricesBoundaryIndex" />
        </input-header>
        <input
          v-show="useIgnoreSubMatricesBoundaryIndex"
          type="number"
          v-model="ignoreSubMatricesBoundaryIndex"
          :placeholder="i18n.t('Cross position')"
          style="margin-top: 10px;"
        />
      </div>
      <div>
        <flag
          title="Force refill"
          v-model="forceRefill"
        />
      </div>
      <div v-if="needRefill">
        <br />
        <initial-config-section :with-buttons="false" />
      </div>
      <br />
      <button class="btn btn-outline-primary" @click="randomizeTypesConfig" style="width: 100%;">
        {{ needRefill ? i18n.t('Randomize and Refill') : i18n.t('Randomize') }}
      </button>
      <br />
      <br />
      <button
        class="btn btn-outline-secondary"
        @click.passive="configStore.randomizeColors(true)"
        @dblclick="configStore.randomizeColors(false)"
        style="width: 100%;"
      >
        {{ i18n.t('Randomize colors') }}
      </button>
      <br />
      <br />
      <br />
      <h4>{{ i18n.t('Snippets') }}</h4>
      <randomize-config-snippets />
    </template>
  </config-section>
</template>

<style scoped lang="scss">

@use "../../assets/config-editor";

.title-flag {
  margin-right: 5px;
}

.grid-wrapper {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
}

.grid-wrapper > div {
  flex: 1 1;
}
</style>
