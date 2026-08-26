<template>
  <section class="sm-panel" aria-label="十二宫格">
    <div class="sm-panel-head">
      <span class="sm-panel-title">🔯 十二宫格</span>
      <span class="sm-panel-sub">点按自评 0~5 星</span>
    </div>

    <div class="sm-grid">
      <div v-for="h in houses" :key="h.id" class="sm-house" :class="{ rated: h.rating > 0 }">
        <span class="sm-house-icon">{{ h.icon }}</span>
        <span class="sm-house-label">{{ h.label }}</span>
        <span class="sm-house-desc">{{ h.description }}</span>
        <div class="sm-stars">
          <button
            v-for="n in 5"
            :key="n"
            class="sm-star"
            :class="{ on: n <= h.rating }"
            @click="rate(h.id, n)"
            :aria-label="`${h.label} ${n} 星`"
          >★</button>
        </div>
      </div>
    </div>

    <div class="sm-row">
      <span class="sm-chip">已评 {{ ratedCount }}/12</span>
      <span class="sm-chip">均值 {{ avg.toFixed(1) }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getSelfMirrorHousesStore } from '../modules/self-mirror'

const store = getSelfMirrorHousesStore()
const houses = computed(() => store.houses.value)
const ratedCount = computed(() => houses.value.filter(h => h.rating > 0).length)
const avg = computed(() => {
  const rated = houses.value.filter(h => h.rating > 0)
  if (!rated.length) return 0
  return rated.reduce((s, h) => s + h.rating, 0) / rated.length
})

function rate(id: string, n: number) {
  store.setRating(id, n)
}
</script>

<style scoped>
.sm-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(14, 16, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
}

.sm-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.sm-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}

.sm-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}

.sm-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.sm-house {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  text-align: center;
}

.sm-house.rated {
  border-color: rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.06);
}

.sm-house-icon {
  font-size: 18px;
}

.sm-house-label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(240, 242, 255, 0.9);
}

.sm-house-desc {
  font-size: 9px;
  line-height: 1.4;
  color: var(--text-low);
  min-height: 26px;
}

.sm-stars {
  display: flex;
  gap: 2px;
}

.sm-star {
  background: none;
  border: none;
  padding: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.15);
  cursor: pointer;
  transition: color 0.15s;
}

.sm-star.on {
  color: #f0c040;
}

.sm-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sm-chip {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-medium);
}

@media (max-width: 480px) {
  .sm-grid {
    grid-template-columns: 1fr;
  }
}
</style>
