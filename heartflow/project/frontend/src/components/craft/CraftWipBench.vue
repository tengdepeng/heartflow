<template>
    <section class="craft-section">
      <h2 class="section-label">
        <span class="section-label-icon">🔧</span>
        半成品工作台
      </h2>
      <p class="section-desc">进化程度低于 50% 的作品，正在打磨中。</p>
      <div class="wip-bench" v-if="wipWorks.length > 0">
        <div
          v-for="work in wipWorks"
          :key="work.id"
          class="wip-card"
          :style="{ '--work-accent': work.color }"
        >
          <div class="wip-card-header">
            <span class="wip-icon">{{ work.icon }}</span>
            <span class="wip-status" :class="work.status">{{ STATUS_LABEL[work.status] }}</span>
          </div>
          <h4 class="wip-name">{{ work.name }}</h4>
          <p class="wip-desc">{{ work.description }}</p>
          <div class="wip-evolution">
            <div class="wip-evolution-track">
              <div class="wip-evolution-fill" :style="{ width: work.evolution + '%' }"></div>
            </div>
            <span class="wip-evolution-label">{{ work.evolution }}%</span>
          </div>
        </div>
      </div>
      <EmptyState
        v-else
        :glow="false"
        icon="🔧"
        title="没有正在打磨的半成品"
        cta-label=""
      />
    </section>
</template>

<script setup lang="ts">
import { useCraftUi } from '../../modules/craft/useCraftUi'
import { STATUS_LABEL } from '../../modules/craft/types'
import EmptyState from '../EmptyState.vue'
const ui = useCraftUi()
const { wipWorks } = ui
</script>

<style scoped src="./craft-shared.css"></style>
