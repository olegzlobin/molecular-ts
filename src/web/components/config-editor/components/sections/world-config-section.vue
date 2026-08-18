<script setup lang="ts">

import { computed, ref, toRefs, watch } from "vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { useConfigStore } from '@/web/store/config';
import { useSimulationStore } from "@/web/store/simulation";
import { usePhysicsStore } from '@/web/store/physics';
import ConfigSection from '@/web/components/config-editor/components/containers/config-section.vue';
import InputHeader from "@/web/components/base/input-header.vue";
import Tooltip from "@/web/components/base/tooltip.vue";
import { useRightBarStore } from '@/web/store/right-bar';
import { useI18nStore } from "@/web/store/i18n";

const physicsStore = usePhysicsStore();
const { physicModelName } = toRefs(physicsStore);

const configStore = useConfigStore();
const rightBarStore = useRightBarStore();
const i18n = useI18nStore();
const worldConfig = configStore.worldConfig;
const showConfig = configStore.showConfig;

const simulation = useSimulationStore();

const {
  clearAtoms,
  refillAtoms,
} = useSimulationStore();

const clear = () => {
  if (confirm(i18n.t('Are you sure?'))) {
    clearAtoms!();
  }
};

const refill = () => {
  if (confirm(i18n.t('Are you sure?'))) {
    refillAtoms!();
  }
};

const paused = ref(false);
const pausedTitle = computed(() => i18n.t(paused.value ? 'Resume' : 'Pause'));
const updatePaused = () => {
  paused.value = simulation.isPaused();
};
const togglePause = () => {
  simulation.togglePause();
  updatePaused();
};

watch(() => configStore.worldConfig.VIEW_MODE, updatePaused);

</script>

<template>
  <config-section>
    <template #body>
      <div class="btn-group" role="group">
        <button class="btn btn-outline-secondary" @click="togglePause">
          {{ pausedTitle }}
        </button>
        <button class="btn btn-outline-secondary" @click="clear">
          {{ i18n.t('Clear') }}
        </button>
        <button class="btn btn-outline-secondary" @click="refill">
          {{ i18n.t('Refill') }}
        </button>
        <button class="btn btn-outline-secondary" @click="rightBarStore.toggle(rightBarStore.modes.SUMMARY)">
          {{ i18n.t('Summary') }}
        </button>
      </div>
      <div>
        <input-header name="Physic Model" />
        <label
          v-for="(title, value) in physicsStore.physicModelNameMap"
          :key="value"
          class="physic-model-option"
        >
          <input type="radio" name="physic-model" v-model="physicModelName" :value="value">
          {{ i18n.t(title) }}
          <tooltip :width="460" position="left" style="margin-left: 4px;">
            <template #content>
              <div class="physic-formulas">
                <div class="eq-intro">{{ i18n.t(physicsStore.physicModelTooltipMap[value]) }}</div>
                <div class="eq-block">
                  <div class="eq-label">{{ i18n.t('Link') }}</div>
                  <div class="eq">
                    <var>a</var> =
                    <span class="frac">
                      <span><var>k</var> · <var>ε</var> · (<var>r</var> − <var>L</var>)</span>
                      <span><var>m</var></span>
                    </span>
                  </div>
                  <dl class="eq-vars">
                    <div><dt><var>a</var></dt><dd>{{ i18n.t('acceleration (added to velocity)') }}</dd></div>
                    <div><dt><var>k</var></dt><dd>{{ i18n.t('Link Force Multiplier') }}</dd></div>
                    <div><dt><var>ε</var></dt><dd>{{ i18n.t('Link Stiffness') }}</dd></div>
                    <div><dt><var>r</var></dt><dd>{{ i18n.t('distance between the pair') }}</dd></div>
                    <div><dt><var>L</var></dt><dd>{{ i18n.t('rest length') }}</dd></div>
                    <div><dt><var>m</var></dt><dd>{{ i18n.t('type Mass (legacy Radius³)') }}</dd></div>
                  </dl>
                  <div class="eq">
                    <var>L</var> =
                    <span class="frac">
                      <span>(<var>R</var><sub>i</sub> + <var>R</var><sub>j</sub>) · (<var>ℓ</var><sub>i</sub> + <var>ℓ</var><sub>j</sub>)</span>
                      <span>2</span>
                    </span>
                  </div>
                  <dl class="eq-vars">
                    <div><dt><var>R</var></dt><dd>{{ i18n.t('type Radius') }}</dd></div>
                    <div><dt><var>ℓ</var></dt><dd>{{ i18n.t('Link Length') }}</dd></div>
                    <div><dt><var>i</var>, <var>j</var></dt><dd>{{ i18n.t('the two particle types') }}</dd></div>
                  </dl>
                  <div class="eq">
                    <var>ε</var> =
                    <span class="frac">
                      <span><var>s</var><sub>i</sub> + <var>s</var><sub>j</sub></span>
                      <span>2</span>
                    </span>
                  </div>
                  <dl class="eq-vars">
                    <div><dt><var>s</var></dt><dd>{{ i18n.t('Link Stiffness') }}</dd></div>
                  </dl>
                </div>
                <div class="eq-block">
                  <div class="eq-label">
                    {{ i18n.t('Bounce') }}
                    (<var>r</var> &lt; <var>R</var><sub>i</sub>+<var>R</var><sub>j</sub>)
                  </div>
                  <div class="eq">
                    <var>a</var> =
                    <span class="frac">
                      <span>−<var>k</var><sub>b</sub> · (<var>R</var><sub>i</sub>+<var>R</var><sub>j</sub> − <var>r</var>)</span>
                      <span><var>m</var></span>
                    </span>
                  </div>
                  <dl class="eq-vars">
                    <div><dt><var>k</var><sub>b</sub></dt><dd>{{ i18n.t('Bounce Force Multiplier') }}</dd></div>
                    <div><dt><var>R</var></dt><dd>{{ i18n.t('type Radius') }}</dd></div>
                    <div><dt><var>r</var></dt><dd>{{ i18n.t('distance between the pair') }}</dd></div>
                    <div><dt><var>m</var></dt><dd>{{ i18n.t('type Mass (legacy Radius³)') }}</dd></div>
                  </dl>
                </div>
                <div class="eq-block">
                  <div class="eq-label">{{ i18n.t('Gravity') }}</div>
                  <div class="eq">
                    <var>a</var> =
                    <span class="frac">
                      <span><var>G</var> · <var>g</var></span>
                      <span><var>r</var>² · <var>m</var></span>
                    </span>
                  </div>
                  <dl class="eq-vars">
                    <div><dt><var>G</var></dt><dd>{{ i18n.t('Gravity Multiplier') }}</dd></div>
                    <div><dt><var>g</var></dt><dd>{{ i18n.t('Gravity of the unlinked pair') }}</dd></div>
                    <div><dt><var>r</var></dt><dd>{{ i18n.t('distance between the pair') }}</dd></div>
                    <div><dt><var>m</var></dt><dd>{{ i18n.t('type Mass (legacy Radius³)') }}</dd></div>
                  </dl>
                </div>
                <div class="eq-block">
                  <div class="eq-label">{{ i18n.t('Link Bias') }}</div>
                  <div class="eq">
                    <var>a</var> =
                    <span class="frac">
                      <span><var>G</var> · <var>b</var></span>
                      <span><var>m</var></span>
                    </span>
                  </div>
                  <dl class="eq-vars">
                    <div><dt><var>G</var></dt><dd>{{ i18n.t('Gravity Multiplier') }}</dd></div>
                    <div><dt><var>b</var></dt><dd>{{ i18n.t('Link Bias of the bonded pair') }}</dd></div>
                    <div><dt><var>m</var></dt><dd>{{ i18n.t('type Mass (legacy Radius³)') }}</dd></div>
                  </dl>
                </div>
                <div class="eq-block">
                  <div class="eq-label">{{ i18n.t('Bounds') }}</div>
                  <div class="eq">
                    <var>a</var> = <var>k</var><sub>w</sub> · <var>Δ</var>
                  </div>
                  <dl class="eq-vars">
                    <div><dt><var>k</var><sub>w</sub></dt><dd>{{ i18n.t('Bounds Force Multiplier') }}</dd></div>
                    <div><dt><var>Δ</var></dt><dd>{{ i18n.t('overlap past the bound') }}</dd></div>
                  </dl>
                </div>
              </div>
            </template>
            <font-awesome-icon icon="fa-regular fa-circle-question" style="color: #bbb" />
          </tooltip>
        </label>
      </div>
      <div>
        <input-header
          name="Max Interaction Radius"
          tooltip="Maximum radius at which unlinked particles can interact."
        />
        <input type="number" v-model="worldConfig.MAX_INTERACTION_RADIUS" min="0" />
      </div>
      <div>
        <input-header
          name="Max Link Radius"
          tooltip="Maximum link length (scaled by Link Length of the bonded types)."
        />
        <input type="number" v-model="worldConfig.MAX_LINK_RADIUS" min="0" />
      </div>
      <div>
        <input-header
          name="Max Force Value"
          tooltip="Maximum force value of each individual interaction."
        />
        <input type="number" v-model="worldConfig.MAX_FORCE" step="0.1" />
      </div>
      <div>
        <input-header
          name="Gravity Multiplier"
          tooltip="Parameter by which the force of gravity is multiplied."
        />
        <input type="number" v-model="worldConfig.GRAVITY_FORCE_MULTIPLIER" />
      </div>
      <div>
        <input-header
          name="World Gravity"
          tooltip="Constant downward acceleration (positive Y). 0 disables it. Scaled by Speed."
        />
        <input type="number" v-model="worldConfig.WORLD_GRAVITY" step="0.0001" />
      </div>
      <div>
        <input-header
          name="Link Force Multiplier"
          tooltip="Parameter by which the link elastic force is multiplied."
        />
        <input type="number" v-model="worldConfig.LINK_FORCE_MULTIPLIER" step="0.0001" min="0" />
      </div>
      <div>
        <input-header
          name="Bounce Force Multiplier"
          tooltip="Parameter by which the collision rebound force is multiplied."
        />
        <input type="number" v-model="worldConfig.BOUNCE_FORCE_MULTIPLIER" step="0.01" />
      </div>
      <div>
        <input-header
          name="Bounds Force Multiplier"
          tooltip="Parameter by which the force of repulsion from the boundaries of space is multiplied."
        />
        <input type="number" v-model="worldConfig.BOUNDS_FORCE_MULTIPLIER" step="0.01" />
      </div>
      <div>
        <input-header
          name="Inertial Multiplier"
          tooltip="Parameter by which the particle speed is multiplied after each iteration."
        />
        <input type="number" v-model="worldConfig.INERTIAL_MULTIPLIER" step="0.01" />
      </div>
      <div>
        <input-header
          name="Speed Parameter"
          tooltip="The speed parameter by which all simulation forces are multiplied."
        />
        <input type="number" v-model="worldConfig.SPEED" min="1" />
      </div>
      <div>
        <input-header
          name="Playback Speed"
          tooltip="Number of simulation iterations per rendering step."
        />
        <input type="number" v-model="worldConfig.PLAYBACK_SPEED" min="1" />
      </div>
      <div>
        <input-header
          name="Temperature Multiplier"
          tooltip="Parameter responsible for the temperature of the environment."
        />
        <input type="number" v-model="worldConfig.TEMPERATURE_MULTIPLIER" step="0.1" />
      </div>
      <div>
        <input-header
          name="Decay Split Velocity"
          tooltip="Relative velocity of fragments when a particle decays into two."
        />
        <input type="number" v-model="worldConfig.DECAY_SPLITS_VELOCITY" step="0.1" min="0" />
      </div>
      <div>
        <div style="text-align: center;">
          <input-header
            name="Bounds"
            tooltip="Boundaries of the maximum position of particles in space."
          />
        </div>
        <table class="bounds-table">
          <tbody>
            <tr>
              <td></td>
              <td>x</td>
              <td>y</td>
              <td v-if="worldConfig.VIEW_MODE === '3d'">z</td>
            </tr>
            <tr>
              <td>{{ i18n.t('min') }}</td>
              <td
                v-for="(_, index) in worldConfig.CONFIG_2D.BOUNDS.MIN_POSITION"
                v-if="worldConfig.VIEW_MODE === '2d'"
              >
                <input
                  :key="index"
                  type="number"
                  v-model="worldConfig.CONFIG_2D.BOUNDS.MIN_POSITION[index]"
                  step="50"
                />
              </td>
              <td
                v-for="(_, index) in worldConfig.CONFIG_3D.BOUNDS.MIN_POSITION"
                v-if="worldConfig.VIEW_MODE === '3d'"
              >
                <input
                  :key="index"
                  type="number"
                  v-model="worldConfig.CONFIG_3D.BOUNDS.MIN_POSITION[index]"
                  step="50"
                />
              </td>
            </tr>
            <tr>
              <td>{{ i18n.t('max') }}</td>
              <td
                v-for="(_, index) in worldConfig.CONFIG_2D.BOUNDS.MAX_POSITION"
                v-if="worldConfig.VIEW_MODE === '2d'"
              >
                <input
                  :key="index"
                  type="number"
                  v-model="worldConfig.CONFIG_2D.BOUNDS.MAX_POSITION[index]"
                  step="50"
                />
              </td>
              <td
                v-for="(_, index) in worldConfig.CONFIG_3D.BOUNDS.MAX_POSITION"
                v-if="worldConfig.VIEW_MODE === '3d'"
              >
                <input
                  :key="index"
                  type="number"
                  v-model="worldConfig.CONFIG_3D.BOUNDS.MAX_POSITION[index]"
                  step="50"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
        <div v-show="configStore.worldConfig.VIEW_MODE == '2d'">
          <div>
            <label>
              <input type="checkbox" v-model="showConfig.showAtoms" />
              {{ i18n.t('Show atoms') }}
            </label>
          </div>
          <div>
            <label>
              <input type="checkbox" v-model="showConfig.showLinks" />
              {{ i18n.t('Show links') }}
            </label>
          </div>
          <div>
            <label>
              <input type="checkbox" v-model="showConfig.showBounds" />
              {{ i18n.t('Show bounds') }}
            </label>
          </div>
        </div>
    </template>
  </config-section>
</template>

<style scoped lang="scss">

@use "../../assets/config-editor";

.bounds-table {
  width: 100%;

  input {
    width: 100% !important;
  }
}

.physic-model-option {
  display: inline-flex;
  align-items: center;
  margin-right: 12px;
  font-weight: bold;
  color: #ddd;
  cursor: pointer;
  padding: 4px 0;
}

.physic-formulas {
  display: grid;
  gap: 6px;
}

.eq-intro {
  color: #bbb;
  font-size: 12px;
  font-weight: normal;
  line-height: 1.4;
}

.eq-block {
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 8px 10px;
}

.eq-label {
  margin-bottom: 4px;
  color: #888;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.eq {
  color: #e8e8e8;
  font-family: "Cambria Math", "STIX Two Math", "Times New Roman", serif;
  font-size: 15px;
  line-height: 1.7;
}

.eq var,
.eq-label var {
  font-style: italic;
}

.frac {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin: 0 2px;
  vertical-align: middle;
}

.frac > span:first-child {
  padding: 0 6px 1px;
  border-bottom: 1px solid #aaa;
  line-height: 1.25;
}

.frac > span:last-child {
  padding: 1px 6px 0;
  line-height: 1.25;
}

.eq-vars {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px 10px;
  margin: 2px 0 8px;
  color: #aaa;
  font-size: 11px;
  font-weight: normal;
  text-transform: none;
  letter-spacing: 0;
}

.eq-vars:last-child {
  margin-bottom: 0;
}

.eq-vars > div {
  display: grid;
  grid-template-columns: 2.6em 1fr;
  gap: 6px;
  align-items: baseline;
}

.eq-vars dt,
.eq-vars dd {
  margin: 0;
}

.eq-vars dt {
  font-family: "Cambria Math", "STIX Two Math", "Times New Roman", serif;
}

.eq-vars var {
  font-style: italic;
}

</style>
