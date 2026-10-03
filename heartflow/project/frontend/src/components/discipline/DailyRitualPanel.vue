<template>
  <div class="drp">
    <!-- 仪式模板库 -->
    <section class="drp-block">
      <div class="drp-block-head">
        <span class="drp-block-title">🕯️ 仪式模板库</span>
        <span class="drp-block-sub">从预设一键添加，建立属于你的每日节奏</span>
      </div>

      <div
        v-for="group in timeGroups"
        :key="'tpl-' + group.key"
        class="drp-time-group"
      >
        <div class="drp-time-label">
          <span class="drp-time-icon">{{ group.icon }}</span>
          <span>{{ group.label }}</span>
        </div>
        <div class="drp-tpl-grid">
          <div
            v-for="tpl in templatesByTime(group.key)"
            :key="tpl.title"
            class="drp-tpl-card"
          >
            <div class="drp-tpl-head">
              <span class="drp-tpl-icon">{{ tpl.icon }}</span>
              <div class="drp-tpl-meta">
                <span class="drp-tpl-name">{{ tpl.title }}</span>
                <span class="drp-tpl-desc">{{ tpl.description }}</span>
              </div>
            </div>
            <div class="drp-tpl-foot">
              <span class="drp-tpl-dur">⏱ {{ tpl.estimatedDuration }} 分钟 · {{ tpl.steps.length }} 步</span>
              <button class="drp-add-btn" type="button" @click="addFromTemplate(tpl)">
                ＋ 添加
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 我的每日仪式 -->
    <section class="drp-block">
      <div class="drp-block-head">
        <span class="drp-block-title">✨ 我的每日仪式</span>
        <span class="drp-block-sub">
          共 {{ rituals.length }} 个仪式 · 今日已点亮 {{ completedTodayCount }} 个
        </span>
      </div>

      <div
        v-for="group in timeGroups"
        :key="'mine-' + group.key"
        class="drp-time-group"
      >
        <div class="drp-time-label">
          <span class="drp-time-icon">{{ group.icon }}</span>
          <span>{{ group.label }}</span>
        </div>

        <div v-if="ritualsByTime(group.key).length === 0" class="drp-empty">
          还没有{{ group.label }}仪式，从上方模板添加吧
        </div>

        <div class="drp-ritual-grid">
          <div
            v-for="ritual in ritualsByTime(group.key)"
            :key="ritual.id"
            :class="['drp-ritual-card', { 'done-today': isDoneToday(ritual) }]"
          >
            <div class="drp-ritual-head">
              <span class="drp-ritual-icon">{{ ritual.icon }}</span>
              <div class="drp-ritual-meta">
                <span class="drp-ritual-name">{{ ritual.title }}</span>
                <span class="drp-ritual-desc">{{ ritual.description }}</span>
              </div>
              <span v-if="isDoneToday(ritual)" class="drp-done-badge">✓ 今日</span>
            </div>

            <ul class="drp-steps">
              <li v-for="(step, i) in ritual.steps" :key="i">{{ step }}</li>
            </ul>

            <div class="drp-ritual-foot">
              <span class="drp-ritual-count">
                🔁 累计 {{ ritual.completionCount }} 次
                <span v-if="ritual.lastCompleted" class="drp-last">
                  · 上次 {{ formatDate(ritual.lastCompleted) }}
                </span>
              </span>
              <button
                :class="['drp-done-btn', { done: isDoneToday(ritual) }]"
                type="button"
                :disabled="isDoneToday(ritual)"
                @click="complete(ritual)"
              >
                {{ isDoneToday(ritual) ? '今日已完成' : '完成一次' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDisciplineBridge } from '../../modules/discipline/workshop-bridge'
import type { DailyRitual } from '../../modules/discipline/types'
import type { RitualTemplate } from '../../modules/discipline/preset-library'

const bridge = useDisciplineBridge()

const rituals = bridge.rituals

const timeGroups = [
  { key: 'morning' as const, label: '晨间', icon: '🌅' },
  { key: 'afternoon' as const, label: '午间', icon: '☀️' },
  { key: 'evening' as const, label: '晚间', icon: '🌙' },
  { key: 'anytime' as const, label: '随时', icon: '🕯️' },
]

const today = new Date().toISOString().split('T')[0]

function templatesByTime(time: DailyRitual['triggerTime']): RitualTemplate[] {
  return bridge.RITUAL_TEMPLATES.filter(t => t.triggerTime === time)
}

function ritualsByTime(time: DailyRitual['triggerTime']): DailyRitual[] {
  return rituals.value.filter(r => r.triggerTime === time)
}

function isDoneToday(ritual: DailyRitual): boolean {
  return !!ritual.lastCompleted && ritual.lastCompleted === today
}

const completedTodayCount = computed(
  () => rituals.value.filter(r => isDoneToday(r)).length,
)

function addFromTemplate(tpl: RitualTemplate) {
  bridge.createRitualFromTemplate(tpl)
}

function complete(ritual: DailyRitual) {
  if (isDoneToday(ritual)) return
  bridge.completeRitual(ritual.id)
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style scoped>
/* ============================================================
   每日仪式面板 - 暖琥珀视觉语言（复用 .pfp-* 同系令牌）
   ============================================================ */
.drp { display: flex; flex-direction: column; gap: 1.75rem; }

.drp-block {
  padding: 1.25rem 1.4rem;
  border-radius: 14px;
  background: var(--bg-surface, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--border, #334155);
  --accent: #d4a574;
  --accent-rgb: 212, 165, 116;
}

.drp-block-head {
  display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap;
  margin-bottom: 1rem;
}
.drp-block-title { font-size: 1.05rem; font-weight: 600; color: var(--text-primary, #e8e0d8); }
.drp-block-sub { font-size: 0.78rem; color: var(--text-muted, rgba(232, 224, 216, 0.44)); }

.drp-time-group { margin-top: 1rem; }
.drp-time-label {
  display: flex; align-items: center; gap: 0.4rem;
  font-size: 0.9rem; font-weight: 600; color: var(--accent, #d4a574);
  margin-bottom: 0.6rem;
}
.drp-time-icon { font-size: 1.05rem; }

.drp-tpl-grid {
  display: grid; gap: 0.75rem;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}
.drp-tpl-card {
  padding: 0.85rem 0.95rem; border-radius: 10px;
  background: rgba(var(--accent-rgb, 212, 165, 116), 0.06);
  border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.18);
}
.drp-tpl-head { display: flex; gap: 0.6rem; margin-bottom: 0.6rem; }
.drp-tpl-icon { font-size: 1.4rem; flex: 0 0 auto; }
.drp-tpl-meta { display: flex; flex-direction: column; min-width: 0; }
.drp-tpl-name { font-size: 0.92rem; font-weight: 600; color: var(--text-primary, #e8e0d8); }
.drp-tpl-desc { font-size: 0.74rem; color: var(--text-muted, rgba(232, 224, 216, 0.44)); margin-top: 0.1rem; }
.drp-tpl-foot { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.drp-tpl-dur { font-size: 0.72rem; color: var(--text-secondary, #9a9088); }

.drp-add-btn {
  padding: 0.35rem 0.85rem; border-radius: 8px; cursor: pointer;
  border: 1px solid var(--accent, #d4a574); background: transparent;
  color: var(--accent, #d4a574); font-size: 0.8rem; font-weight: 600;
  transition: all 0.2s; white-space: nowrap;
}
.drp-add-btn:hover { background: rgba(var(--accent-rgb, 212, 165, 116), 0.16); }

.drp-empty {
  font-size: 0.8rem; color: var(--text-muted, rgba(232, 224, 216, 0.44));
  padding: 0.6rem 0.2rem;
}

.drp-ritual-grid {
  display: grid; gap: 0.85rem;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}
.drp-ritual-card {
  padding: 0.95rem; border-radius: 12px;
  background: var(--bg-surface, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--border, #334155);
  transition: all 0.25s;
}
.drp-ritual-card.done-today {
  border-color: rgba(16, 185, 129, 0.35);
  background: rgba(16, 185, 129, 0.07);
}
.drp-ritual-head { display: flex; align-items: flex-start; gap: 0.6rem; margin-bottom: 0.6rem; }
.drp-ritual-icon { font-size: 1.5rem; flex: 0 0 auto; }
.drp-ritual-meta { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.drp-ritual-name { font-size: 0.95rem; font-weight: 600; color: var(--text-primary, #e8e0d8); }
.drp-ritual-desc { font-size: 0.74rem; color: var(--text-muted, rgba(232, 224, 216, 0.44)); margin-top: 0.1rem; }
.drp-done-badge {
  flex: 0 0 auto; font-size: 0.68rem; padding: 0.15rem 0.5rem; border-radius: 999px;
  background: rgba(16, 185, 129, 0.18); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.4);
}

.drp-steps {
  list-style: none; margin: 0 0 0.7rem; padding: 0;
  display: flex; flex-direction: column; gap: 0.25rem;
}
.drp-steps li {
  font-size: 0.76rem; color: var(--text-secondary, #9a9088);
  padding-left: 0.9rem; position: relative; line-height: 1.4;
}
.drp-steps li::before {
  content: '·'; position: absolute; left: 0.3rem; color: var(--accent, #d4a574);
}

.drp-ritual-foot { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }
.drp-ritual-count { font-size: 0.74rem; color: var(--text-muted, rgba(232, 224, 216, 0.44)); }
.drp-last { color: var(--text-secondary, #9a9088); }

.drp-done-btn {
  padding: 0.4rem 0.9rem; border-radius: 8px; cursor: pointer;
  border: 1px solid var(--accent, #d4a574); background: transparent;
  color: var(--accent, #d4a574); font-size: 0.82rem; font-weight: 600;
  transition: all 0.2s; white-space: nowrap;
}
.drp-done-btn:hover:not(:disabled) { background: rgba(var(--accent-rgb, 212, 165, 116), 0.16); }
.drp-done-btn.done {
  background: rgba(16, 185, 129, 0.16); border-color: #10b981; color: #10b981;
  cursor: default;
}
.drp-done-btn:disabled { cursor: not-allowed; }

@media (max-width: 640px) {
  .drp-tpl-grid, .drp-ritual-grid { grid-template-columns: 1fr; }
}
</style>
