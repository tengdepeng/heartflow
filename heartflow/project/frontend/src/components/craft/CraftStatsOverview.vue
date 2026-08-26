<template>
    <section data-enter class="craft-section">
      <h2 class="section-label">
        <span class="section-label-icon">📊</span>
        统计概览
      </h2>
      <div class="stats-overview">
        <div class="stat-card">
          <span class="stat-value">{{ store.stats.totalWorks }}</span>
          <span class="stat-label">总作品</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ store.stats.totalCompleted }}</span>
          <span class="stat-label">已完成</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ store.stats.averageEvolution }}%</span>
          <span class="stat-label">平均进化</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ store.stats.byStatus.refining }}</span>
          <span class="stat-label">打磨中</span>
        </div>
      </div>
    </section>
</template>

<script setup lang="ts">
import { useCraftUi } from '../../modules/craft/useCraftUi'
const ui = useCraftUi()
const { store } = ui
</script>

<style scoped src="./craft-shared.css"></style>
