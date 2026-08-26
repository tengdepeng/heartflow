<template>
    <section class="craft-section">
      <h2 class="section-label">
        <span class="section-label-icon">⏳</span>
        进化时间线
      </h2>
      <p class="section-desc">作品从胚料到成品的演化历程，每一步打磨都刻下印记。</p>
      <div class="evolution-timeline" v-if="timelineEntries.length > 0">
        <div
          v-for="(entry, idx) in timelineEntries"
          :key="entry.id"
          class="et-entry"
          :class="{ 'et-entry--last': idx === timelineEntries.length - 1 }"
        >
          <div class="et-marker">
            <div class="et-marker-dot" :class="`et-marker-dot--${entry.milestoneClass}`"></div>
            <div v-if="idx < timelineEntries.length - 1" class="et-marker-line"></div>
          </div>
          <div class="et-content">
            <div class="et-header">
              <span class="et-icon">{{ entry.icon }}</span>
              <span class="et-name">{{ entry.name }}</span>
              <span class="et-date">{{ entry.date }}</span>
            </div>
            <div class="et-evolution-row">
              <div class="et-evolution-track">
                <div class="et-evolution-fill" :style="{ width: entry.evolution + '%', '--evo-color': entry.color }"></div>
              </div>
              <span class="et-evolution-value" :style="{ color: entry.color }">{{ entry.evolution }}%</span>
            </div>
            <div v-if="entry.history.length > 0" class="et-history">
              <span
                v-for="(h, hi) in entry.history"
                :key="hi"
                class="et-history-dot"
                :class="{ 'et-history-dot--milestone': h.milestone }"
                :style="{ '--h-color': entry.color }"
                :title="h.date + (h.milestone ? ' · ' + h.milestone : '') + ' — ' + h.evolution + '%'"
              ></span>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="et-empty">
        <span class="et-empty-icon">📜</span>
        <span class="et-empty-text">暂无进化记录</span>
      </div>
    </section>
</template>

<script setup lang="ts">
import { useCraftUi } from '../../modules/craft/useCraftUi'
const ui = useCraftUi()
const { timelineEntries } = ui
</script>

<style scoped src="./craft-shared.css"></style>
