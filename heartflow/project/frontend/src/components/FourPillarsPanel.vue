<template>
  <section class="sm-panel" aria-label="四柱画像">
    <div class="sm-panel-head">
      <span class="sm-panel-title">🧭 四柱画像</span>
      <span class="sm-panel-sub">自我映射 · 非命理</span>
    </div>

    <!-- 出生信息 -->
    <div class="sm-block">
      <span class="sm-block-label">出生信息</span>
      <div class="sm-row">
        <input v-model.number="birth.year" type="number" class="sm-input sm-num" placeholder="年" />
        <input v-model.number="birth.month" type="number" min="1" max="12" class="sm-input sm-num" placeholder="月" />
        <input v-model.number="birth.day" type="number" min="1" max="31" class="sm-input sm-num" placeholder="日" />
        <input v-model.number="birth.hour" type="number" min="0" max="23" class="sm-input sm-num" placeholder="时" />
        <button class="sm-btn" @click="resetBirth">重置</button>
      </div>
      <div class="sm-row">
        <span class="sm-chip">生肖 {{ zodiac }}</span>
        <span class="sm-chip">星座 {{ constellation }}</span>
      </div>
    </div>

    <!-- 四柱 -->
    <div class="sm-pillars">
      <div v-for="p in profile.pillars" :key="p.label" class="sm-pillar" :style="{ borderColor: p.color + '44' }">
        <span class="sm-pillar-icon" :style="{ background: p.color + '22' }">{{ p.icon }}</span>
        <span class="sm-pillar-label" :style="{ color: p.color }">{{ p.label }}</span>
        <strong class="sm-pillar-keyword">{{ p.keyword }}</strong>
        <span class="sm-pillar-desc">{{ p.description }}</span>
      </div>
    </div>

    <!-- 总评 -->
    <div class="sm-block">
      <span class="sm-block-label">整体图景</span>
      <p class="sm-overall">{{ profile.overall }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { computeFourPillars, defaultBirthData, zodiacForYear, constellationFor } from '../modules/self-mirror'
import type { BirthData } from '../modules/self-mirror'

const birth = reactive<BirthData>(defaultBirthData())
const profile = computed(() => computeFourPillars(birth))
const zodiac = computed(() => zodiacForYear(birth.year))
const constellation = computed(() => constellationFor(birth))

function resetBirth() {
  const d = defaultBirthData()
  birth.year = d.year
  birth.month = d.month
  birth.day = d.day
  birth.hour = d.hour
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

.sm-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.sm-block-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-medium);
}

.sm-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sm-input {
  font-size: 11px;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(240, 242, 255, 0.9);
  outline: none;
}

.sm-input:focus {
  border-color: rgba(var(--accent-rgb), 0.5);
}

.sm-num {
  width: 64px;
}

.sm-btn {
  font-size: 11px;
  padding: 5px 12px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.35);
  background: rgba(var(--accent-rgb), 0.12);
  color: rgba(var(--accent-rgb), 0.9);
  cursor: pointer;
}

.sm-btn:hover {
  background: rgba(var(--accent-rgb), 0.22);
}

.sm-chip {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-medium);
}

.sm-pillars {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.sm-pillar {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.sm-pillar-icon {
  font-size: 18px;
  padding: 4px 8px;
  border-radius: 10px;
}

.sm-pillar-label {
  font-size: 10px;
  letter-spacing: 1px;
}

.sm-pillar-keyword {
  font-size: 14px;
  color: rgba(240, 242, 255, 0.92);
}

.sm-pillar-desc {
  font-size: 10px;
  line-height: 1.5;
  color: var(--text-low);
}

.sm-overall {
  margin: 0;
  font-size: 11px;
  line-height: 1.7;
  color: rgba(240, 242, 255, 0.8);
}

@media (max-width: 480px) {
  .sm-pillars {
    grid-template-columns: 1fr;
  }
}
</style>
