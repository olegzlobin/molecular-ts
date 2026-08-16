<script setup lang="ts">

import { useConfigStore } from '@/web/store/config';
import { useSimulationStore } from "@/web/store/simulation";
import { clearInactiveParams, createDefaultTypesConfig } from "@/lib/config/atom-types";
import ConfigSection from '@/web/components/config-editor/components/containers/config-section.vue';
import ConfigMatrix from '@/web/components/inputs/config-matrix.vue';
import ConfigList from '@/web/components/inputs/config-list.vue';
import InputHeader from "@/web/components/base/input-header.vue";
import ConfigTensor from "@/web/components/inputs/config-tensor.vue";
import TransformationConfig from "@/web/components/config-editor/components/widgets/transformation-config.vue";
import DecayConfig from "@/web/components/config-editor/components/widgets/decay-config.vue";
import { useRightBarStore } from '@/web/store/right-bar';
import ConfigActions from "@/web/components/inputs/config-actions.vue";

const configStore = useConfigStore();
const rightBarStore = useRightBarStore();
const typesConfig = configStore.typesConfig;
const typesSymmetricConfig = configStore.typesSymmetricConfig;

const {
  clearAtoms,
  refillAtoms,
} = useSimulationStore();

const clean = () => {
  clearInactiveParams(typesConfig);
}

const setDefaultTypesConfig = () => {
  if (!confirm('Are you sure?')) {
    return;
  }

  const defaultConfig = createDefaultTypesConfig();

  if (defaultConfig.COLORS.length !== typesConfig.COLORS.length) {
    defaultConfig.COLORS = typesConfig.COLORS;
  }

  if (defaultConfig.FREQUENCIES.length !== typesConfig.FREQUENCIES.length) {
    clearAtoms!(true);
    configStore.setDefaultTypesConfig();
    refillAtoms!(true);
  } else {
    configStore.setDefaultTypesConfig();
  }
};

const refill = () => {
  if (confirm('Are you sure?')) {
    refillAtoms!();
  }
};

</script>

<template>
  <config-section>
    <template #body>
      <div class="btn-group" role="group">
        <button class="btn btn-outline-secondary" @click="rightBarStore.toggle(rightBarStore.modes.RANDOMIZE)">Randomize</button>
        <button class="btn btn-outline-secondary" @click="rightBarStore.toggle(rightBarStore.modes.EDIT_TYPES)">Edit</button>
        <button class="btn btn-outline-secondary" @click="setDefaultTypesConfig">Default</button>
        <button class="btn btn-outline-secondary" @click="refill">Refill</button>
        <button class="btn btn-outline-secondary" @click="rightBarStore.toggle(rightBarStore.modes.GENETIC)">Genetic</button>
        <button class="btn btn-outline-secondary" @click="configStore.appendType">Add type</button>
      </div>
      <div>
        <input-header
          name="Names / Colors / Actions"
          tooltip="Edit type names and colors. Use ⋯ under a type to clone or remove it."
          position="center"
        />
        <config-actions :colors="typesConfig.COLORS" :names="typesConfig.NAMES" />
      </div>
      <div>
        <input-header
          name="Initial Frequencies"
          tooltip="Ratio of the number of particles that will be generated on refill."
          position="center"
        />
        <config-list
          :values="typesConfig.FREQUENCIES"
          :colors="typesConfig.COLORS"
          :step="0.1"
        />
      </div>
      <div>
        <input-header
          name="Radius"
          tooltip="Radius of each type of particles."
          position="center"
        />
        <config-list :values="typesConfig.RADIUS" :colors="typesConfig.COLORS" :step="0.1" />
      </div>
      <div>
        <input-header
          name="Mass"
          tooltip="Inertial mass of each type. Used for force→acceleration (a = F / m). Legacy configs default to Radius³."
          position="center"
        />
        <config-list :values="typesConfig.MASS" :colors="typesConfig.COLORS" :step="0.1" :min="0" />
      </div>
      <div>
        <input-header
          name="Gravity"
          tooltip="Gravity coefficient matrix for unlinked particles shows whether a particle of one type will attract or
                   repel a particle of another type in the case when they are not linked to each other, and with what force."
          position="center"
        />
        <config-matrix
          :values="typesConfig.GRAVITY"
          :colors="typesConfig.COLORS"
          :step="0.1"
          v-model:symmetric="typesSymmetricConfig.GRAVITY_MATRIX_SYMMETRIC"
        />
      </div>
      <div>
        <input-header
          name="Link Bias"
          tooltip="Constant radial force along a bond. Positive attracts, negative repels. Shifts effective bond length against the spring."
          position="center"
        />
        <config-matrix
          :values="typesConfig.LINK_BIAS"
          :colors="typesConfig.COLORS"
          :step="0.01"
          v-model:symmetric="typesSymmetricConfig.LINK_BIAS_MATRIX_SYMMETRIC"
        />
      </div>
      <div>
        <input-header
          name="Links"
          tooltip="Maximum total bond order (valence) for this type. Used valence is the sum of orders of all bonds on the atom."
          position="center"
        />
        <config-list
          :values="typesConfig.LINKS"
          :colors="typesConfig.COLORS"
          :step="1"
          :min="0"
        />
      </div>
      <div>
        <input-header
          name="Type Link Weights"
          tooltip="Nominal bond order for each type pair (prefer integers 1, 2, …). Actual order is min(weight, free valence on both sides). Max partners of that type is derived as floor(Links / weight). Link preference = Bond Preference × order."
          position="center"
        />
        <config-matrix
          :values="typesConfig.TYPE_LINK_WEIGHTS"
          :colors="typesConfig.COLORS"
          :step="1"
          v-model:symmetric="typesSymmetricConfig.LINK_TYPE_WEIGHT_MATRIX_SYMMETRIC"
        />
      </div>
      <div>
        <input-header
          name="Bond Preference"
          tooltip="Preference per unit of bond order. Effective link preference is this value × order. When valence is full, a new bond can replace the weakest existing bond if it has a strictly higher preference."
          position="center"
        />
        <config-matrix
          :values="typesConfig.BOND_PREFERENCE"
          :colors="typesConfig.COLORS"
          :step="0.1"
          v-model:symmetric="typesSymmetricConfig.BOND_PREFERENCE_MATRIX_SYMMETRIC"
        />
      </div>
      <div>
        <input-header
          name="Link Length"
          tooltip="Preferred link length multiplier for this type. For a bond A–B the length is the average of both types."
          position="center"
        />
        <config-list :values="typesConfig.LINK_LENGTH" :colors="typesConfig.COLORS" :step="0.1" :min="0" />
      </div>
      <div>
        <input-header
          name="Link Stiffness"
          tooltip="Link stiffness multiplier for this type. For a bond A–B the stiffness is the average of both types."
          position="center"
        />
        <config-list :values="typesConfig.LINK_STIFFNESS" :colors="typesConfig.COLORS" :step="0.1" :min="0" />
      </div>
      <details class="advanced-settings">
        <summary>Advanced settings</summary>
        <div class="advanced-block">
          <input-header
            name="Bond Preference Factor"
            tooltip="Tabs choose the agent type. The matrix multiplies Bond Preference of A–B while that agent is bonded to A or B. Values >1 catalyze, <1 inhibit, 0 blocks the swap path. Default 1 = no effect."
            position="center"
          />
          <config-tensor
            :values="typesConfig.BOND_PREFERENCE_FACTOR"
            :colors="typesConfig.COLORS"
            :step="0.1"
            :min="0"
            tab-label="Agent (bonded catalyst / inhibitor)"
            matrix-hint="While the selected agent is bonded to A or B, multiply preference of bond A ⟷ B."
            v-model:symmetric="typesSymmetricConfig.BOND_PREFERENCE_FACTOR_MATRIX_SYMMETRIC"
          />
        </div>
        <div class="advanced-block">
          <input-header
            name="Link Strength Factor"
            tooltip="Tabs choose the agent type. Multiplies link stiffness and break radius of A–B while that agent is bonded to A or B. Values <1 weaken (easier to break), >1 strengthen. Default 1 = no effect."
            position="center"
          />
          <config-tensor
            :values="typesConfig.LINK_STRENGTH_FACTOR"
            :colors="typesConfig.COLORS"
            :step="0.1"
            :min="0"
            tab-label="Agent (bonded strength modifier)"
            matrix-hint="While the selected agent is bonded to A or B, multiply strength of bond A ⟷ B."
            v-model:symmetric="typesSymmetricConfig.LINK_STRENGTH_FACTOR_MATRIX_SYMMETRIC"
          />
        </div>
      </details>
      <div style="margin-top: 30px;">
        <input-header
          name="Transformations on link creation"
          tooltip="Experimental feature. A ↻ B ➔ C means that when A connects to B, A changes type to C. A + B ➔ C merges A and B into C on contact (radii overlap)."
        />
        <div style="margin-top: 10px;"></div>
        <transformation-config :colors="typesConfig.COLORS" :names="typesConfig.NAMES" v-model="typesConfig.TRANSFORMATION" />
      </div>
      <div style="margin-top: 30px;">
        <input-header
          name="Decay"
          tooltip="A ⏳ T ➔ B — particle A becomes B with half-life T (ticks). A ⏳ T ➔ B + C — splits into B and C. A ⏳ T ➔ ∅ + ∅ — particle disappears. Use ∅ as C for type change only. ⛓ types stabilize A: it does not decay while linked to at least one of them."
        />
        <div style="margin-top: 10px;"></div>
        <decay-config :colors="typesConfig.COLORS" :names="typesConfig.NAMES" v-model="typesConfig.DECAYS" />
      </div>
    </template>
  </config-section>
</template>

<style scoped lang="scss">

@use "../../assets/config-editor";

.advanced-settings {
  margin-top: 16px;
  padding: 8px 0;
}

.advanced-settings > summary {
  cursor: pointer;
  margin-bottom: 12px;
  opacity: 0.85;
}

.advanced-block + .advanced-block {
  margin-top: 20px;
}

</style>
