<template>
  <section class="cvp">
    <div class="cvp-head">
      <div class="cvp-title-wrap">
        <span class="cvp-title">🗝️ 胶囊库档案</span>
        <span class="cvp-sub">封存、等待、开启，皆是时光的仪式</span>
      </div>
      <span v-if="vault.total" class="cvp-tag" :style="tagStyle">{{ tagLabel }}</span>
    </div>

    <!-- 空态引导 -->
    <div v-if="!vault.total" class="cvp-empty">
      <p class="cvp-empty-title">胶囊库未启</p>
      <p class="cvp-empty-desc">
        时光匣还空着。封存第一封胶囊，它会在这里显影成一段等待的刻度——封存、等待、开启，皆是时光的仪式。
      </p>
    </div>

    <template v-else>
      <!-- 状态分布 -->
      <div class="cvp-status">
        <div v-for="s in statusRows" :key="s.key" class="cvp-status-cell" :style="{ '--st': s.color }">
          <span class="cvp-status-icon">{{ s.icon }}</span>
          <b>{{ s.count }}</b>
          <span class="cvp-status-label">{{ s.label }}</span>
        </div>
      </div>

      <!-- 下一封 -->
      <div v-if="vault.nextToOpen" class="cvp-next">
        <div class="cvp-next-head">
          <span class="cvp-next-label">下一封</span>
          <span class="cvp-next-status" :style="{ color: nextMeta.color }">{{ nextMeta.icon }} {{ nextMeta.label }}</span>
        </div>
        <p class="cvp-next-title">{{ vault.nextToOpen.title }}</p>
        <p class="cvp-next-count">{{ countdownText(vault.nextToOpen, now) }}</p>
      </div>

      <!-- 逾末催启 -->
      <div v-if="vault.overdueList.length" class="cvp-block">
        <span class="cvp-block-title">逾末催启 · {{ vault.overdueList.length }}</span>
        <div v-for="c in vault.overdueList" :key="c.id" class="cvp-row">
          <span class="cvp-row-icon">⏰</span>
          <span class="cvp-row-title">{{ c.title }}</span>
          <span class="cvp-row-meta">{{ countdownText(c, now) }}</span>
        </div>
      </div>

      <!-- 即将开启 -->
      <div v-if="upcoming.length" class="cvp-block">
        <span class="cvp-block-title">即将开启 · {{ upcoming.length }}</span>
        <div v-for="c in upcoming" :key="c.id" class="cvp-row">
          <span class="cvp-row-icon">🗝️</span>
          <span class="cvp-row-title">{{ c.title }}</span>
          <span class="cvp-row-meta">{{ countdownText(c, now) }}</span>
        </div>
      </div>

      <!-- 最近开启回看 -->
      <div v-if="vault.recentlyOpened.length" class="cvp-block">
        <span class="cvp-block-title">最近开启回看 · {{ vault.recentlyOpened.length }}</span>
        <div v-for="c in vault.recentlyOpened" :key="c.id" class="cvp-row">
          <span class="cvp-row-icon">📖</span>
          <span class="cvp-row-title">{{ c.title }}</span>
          <span class="cvp-row-meta">{{ formatDate(c.openedAt) }}</span>
        </div>
      </div>

      <!-- 温和洞察 -->
      <ul v-if="insights.length" class="cvp-insights">
        <li v-for="(s, i) in insights" :key="i">{{ s }}</li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { TimeCapsule } from '../modules/capsule'
import {
  capsuleVault,
  capsuleStatus,
  countdownText,
  capsuleVaultInsights,
  CAPSULE_STATUS_META,
  CAPSULE_STATUS_ORDER,
  type CapsuleStatus,
  type CapsuleVault,
} from '../modules/capsule/capsule-vault'

const props = defineProps<{ capsules: TimeCapsule[] }>()

const STATUS_COLORS: Record<CapsuleStatus, string> = {
  sealed: 'hsl(272 46% 58%)',
  openable: 'hsl(40 46% 55%)',
  overdue: '#c46a5a',
  open: '#8a9a7a',
}

const now = ref(new Date())
const vault = ref<CapsuleVault>(capsuleVault([], now.value))
const insights = ref<string[]>([])

function refresh() {
  now.value = new Date()
  vault.value = capsuleVault(props.capsules, now.value)
  insights.value = capsuleVaultInsights(vault.value, now.value)
}

watch(() => props.capsules, () => refresh(), { deep: true })

const statusRows = computed(() =>
  CAPSULE_STATUS_ORDER.map((key) => ({
    key,
    ...CAPSULE_STATUS_META[key],
    count: vault.value[key],
    color: STATUS_COLORS[key],
  })),
)

const nextMeta = computed(() => {
  const s = vault.value.nextToOpen ? capsuleStatus(vault.value.nextToOpen, now.value) : 'sealed'
  return { ...CAPSULE_STATUS_META[s], color: STATUS_COLORS[s] }
})

const tagLabel = computed(() => nextMeta.value.label)
const tagStyle = computed(() => ({
  background: `${nextMeta.value.color}22`,
  color: nextMeta.value.color,
}))

const upcoming = computed(() =>
  vault.value.imminent.filter((c) => capsuleStatus(c, now.value) !== 'overdue'),
)

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

refresh()
</script>

<style scoped>
.cvp {
  margin: 8px auto 0;
  max-width: 640px;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(15, 13, 20, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.cvp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.cvp-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.cvp-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.cvp-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.cvp-tag { font-size: 11px; padding: 2px 10px; border-radius: 12px; white-space: nowrap; }

.cvp-empty { padding: 10px 0 4px; }
.cvp-empty-title { font-size: 13px; color: rgba(226, 220, 240, 0.7); margin: 0 0 6px; }
.cvp-empty-desc { font-size: 12px; line-height: 1.7; color: rgba(226, 220, 240, 0.45); margin: 0; }

.cvp-status { display: flex; gap: 8px; margin-bottom: 14px; }
.cvp-status-cell {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 8px 4px; border-radius: 10px; background: var(--bg-card, rgba(255,255,255,0.03));
}
.cvp-status-icon { font-size: 13px; }
.cvp-status-cell b { font-size: 15px; font-weight: 500; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.cvp-status-label { font-size: 10px; color: rgba(226, 220, 240, 0.4); }
.cvp-status-cell b { color: var(--st); }

.cvp-next {
  padding: 12px 14px; border-radius: 10px; margin-bottom: 12px;
  background: rgba(124, 108, 240, 0.07); border: 1px solid rgba(124, 108, 240, 0.2);
}
.cvp-next-head { display: flex; align-items: center; justify-content: space-between; }
.cvp-next-label { font-size: 11px; color: rgba(226, 220, 240, 0.45); }
.cvp-next-status { font-size: 11px; }
.cvp-next-title { font-size: 14px; font-weight: 500; color: rgba(255, 255, 255, 0.9); margin: 8px 0 2px; }
.cvp-next-count { font-size: 12px; color: rgba(226, 220, 240, 0.55); margin: 0; }

.cvp-block { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.cvp-block-title { font-size: 11px; color: rgba(226, 220, 240, 0.5); margin-bottom: 2px; }
.cvp-row {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px; border-radius: 8px; background: var(--bg-card, rgba(255,255,255,0.03));
}
.cvp-row-icon { width: 18px; text-align: center; font-size: 12px; }
.cvp-row-title { flex: 1; font-size: 12px; color: rgba(226, 220, 240, 0.75); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cvp-row-meta { font-size: 11px; color: rgba(226, 220, 240, 0.45); flex-shrink: 0; }

.cvp-insights { list-style: none; margin: 0; padding: 12px 0 0; border-top: 1px dashed rgba(var(--accent-rgb), 0.14); display: flex; flex-direction: column; gap: 8px; }
.cvp-insights li { font-size: 12px; line-height: 1.65; color: rgba(226, 220, 240, 0.6); }
.cvp-insights li::before { content: '· '; color: rgba(var(--accent-rgb), 0.5); }
</style>
