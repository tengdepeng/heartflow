<template>
  <section class="bap">
    <div class="bap-head">
      <span class="bap-title">🗃 收藏气象</span>
      <span class="bap-tag">{{ health.label }}</span>
    </div>

    <!-- 今日最值得打开 -->
    <div class="bap-suggest">
      <p class="bap-suggest-kicker">今日最值得重新打开</p>
      <div v-if="suggestion" class="bap-suggest-main">
        <span class="bap-suggest-icon">{{ iconFor(suggestion.bookmark) }}</span>
        <div class="bap-suggest-body">
          <span class="bap-suggest-title">{{ suggestion.bookmark.title || suggestion.bookmark.url }}</span>
          <span class="bap-suggest-reason">{{ suggestion.reason }}</span>
        </div>
        <button class="bap-open" @click="$emit('open', suggestion.bookmark)">打开 ↗</button>
      </div>
      <p v-else class="bap-suggest-empty">所有收藏都被好好对待过了——或架上还空着，收一条想要留住的东西。</p>
    </div>

    <!-- 健康三轴 -->
    <div class="bap-health">
      <div class="bap-health-row"><span>已读率</span><div class="bap-bar"><i :style="{ width: health.readRate + '%' }"></i></div><b>{{ health.readRate }}%</b></div>
      <div class="bap-health-row"><span>回访率</span><div class="bap-bar"><i :style="{ width: health.revisitRate + '%' }"></i></div><b>{{ health.revisitRate }}%</b></div>
      <div class="bap-health-row"><span>整理度</span><div class="bap-bar"><i :style="{ width: health.tidyRate + '%' }"></i></div><b>{{ health.tidyRate }}%</b></div>
    </div>

    <!-- 概览指标 -->
    <div class="bap-metrics">
      <div class="bap-metric"><b>{{ ov.unread }}</b><span>待读</span></div>
      <div class="bap-metric"><b>{{ ov.folderCount }}</b><span>分类</span></div>
      <div class="bap-metric"><b>{{ ov.tagCount }}</b><span>标签</span></div>
      <div class="bap-metric"><b>{{ readingHours }}</b><span>小时</span></div>
      <div class="bap-metric"><b>{{ ov.total }}</b><span>全部</span></div>
    </div>

    <!-- 内容类型分布 -->
    <div v-if="hasContent" class="bap-types">
      <div v-for="ct in typeRows" :key="ct.key" class="bap-type">
        <span class="bap-type-icon">{{ typeIcon[ct.key] }}</span>
        <span class="bap-type-label">{{ typeLabel[ct.key] }}</span>
        <span class="bap-type-bar"><i :style="{ width: ct.pct + '%' }"></i></span>
        <span class="bap-type-num">{{ ct.count }}</span>
      </div>
    </div>

    <!-- 温和洞察 -->
    <ul v-if="insights.length" class="bap-insights">
      <li v-for="(s, i) in insights" :key="i">{{ s }}</li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Bookmark } from '../modules/bookmarks'
import {
  collectionOverview,
  collectionRhythm,
  collectionHealth,
  revisitSuggestion,
  collectionInsights,
} from '../modules/bookmarks/bookmarks-analytics'

const props = defineProps<{ bookmarks: Bookmark[] }>()
defineEmits<{ (e: 'open', b: Bookmark): void }>()

const typeIcon: Record<string, string> = { article: '📄', video: '🎬', image: '🖼', audio: '🎧', other: '📎' }
const typeLabel: Record<string, string> = { article: '文章', video: '视频', image: '图片', audio: '音频', other: '其他' }
const typeOrder = ['article', 'video', 'image', 'audio', 'other']

const ov = ref(collectionOverview([]))
const rh = ref(collectionRhythm([], new Date()))
const health = ref(collectionHealth([], new Date()))
const suggestion = ref<ReturnType<typeof revisitSuggestion>>(null)
const insights = ref<string[]>([])

function refresh() {
  const now = new Date()
  ov.value = collectionOverview(props.bookmarks)
  rh.value = collectionRhythm(props.bookmarks, now)
  health.value = collectionHealth(props.bookmarks, now)
  suggestion.value = revisitSuggestion(props.bookmarks, now)
  insights.value = collectionInsights(props.bookmarks, now, 3)
}

watch(
  () => props.bookmarks,
  () => refresh(),
  { deep: true }
)

const readingHours = computed(() => {
  const m = ov.value.totalReadingMinutes
  return Math.round((m / 60) * 10) / 10
})

const hasContent = computed(() => typeOrder.some((k) => (ov.value.byContentType[k] || 0) > 0))

const activeCount = computed(() => Math.max(1, ov.value.active))

const typeRows = computed(() =>
  typeOrder.map((key) => ({
    key,
    count: ov.value.byContentType[key] || 0,
    pct: Math.round(((ov.value.byContentType[key] || 0) / activeCount.value) * 100),
  }))
)

function iconFor(b: Bookmark): string {
  if (b.preview_image) return '🗂'
  if (b.favicon && b.favicon !== '📎') return b.favicon
  const ct = b.content_type && typeIcon[b.content_type] ? b.content_type : 'other'
  return typeIcon[ct] || '📎'
}

refresh()
</script>

<style scoped>
.bap {
  margin-bottom: 20px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg-card);
  position: relative;
  z-index: 1;
}
.bap-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.bap-title { font-size: 13px; font-weight: 600; color: var(--text-high); letter-spacing: 1px; }
.bap-tag { font-size: 10px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.1); color: var(--accent); }
.bap-suggest {
  padding: 12px; border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.05);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  margin-bottom: 12px;
}
.bap-suggest-kicker { font-size: 11px; color: var(--text-secondary); margin: 0 0 8px; letter-spacing: 0.5px; }
.bap-suggest-main { display: flex; align-items: center; gap: 10px; }
.bap-suggest-icon { font-size: 20px; }
.bap-suggest-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.bap-suggest-title { font-size: 13px; color: var(--text-high); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bap-suggest-reason { font-size: 11px; color: var(--text-secondary); }
.bap-open { flex-shrink: 0; padding: 5px 12px; border-radius: 8px; border: 1px solid rgba(var(--accent-rgb), 0.25); background: rgba(var(--accent-rgb), 0.1); color: var(--accent); font-size: 11px; cursor: pointer; transition: all .2s; }
.bap-open:hover { background: rgba(var(--accent-rgb), 0.18); }
.bap-suggest-empty { font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin: 0; }

.bap-health { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.bap-health-row { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--text-secondary); }
.bap-health-row span { width: 42px; }
.bap-bar { flex: 1; height: 6px; border-radius: 3px; background: rgba(var(--accent-rgb), 0.08); overflow: hidden; }
.bap-bar i { display: block; height: 100%; border-radius: 3px; background: rgba(var(--accent-rgb), 0.4); transition: width .4s; }
.bap-health-row b { width: 34px; text-align: right; font-weight: 500; color: var(--text-high); }

.bap-metrics { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 12px; }
.bap-metric { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 0; border-radius: 8px; background: rgba(var(--accent-rgb), 0.04); }
.bap-metric b { font-size: 15px; font-weight: 600; color: var(--accent); }
.bap-metric span { font-size: 9px; color: var(--text-secondary); }

.bap-types { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.bap-type { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--text-secondary); }
.bap-type-icon { width: 18px; text-align: center; }
.bap-type-label { width: 34px; }
.bap-type-bar { flex: 1; height: 5px; border-radius: 3px; background: rgba(var(--accent-rgb), 0.08); overflow: hidden; }
.bap-type-bar i { display: block; height: 100%; border-radius: 3px; background: rgba(var(--accent-rgb), 0.35); transition: width .4s; }
.bap-type-num { width: 18px; text-align: right; color: var(--text-high); }

.bap-insights { list-style: none; margin: 0; padding: 12px 0 0; border-top: 1px dashed rgba(var(--accent-rgb), 0.16); display: flex; flex-direction: column; gap: 5px; }
.bap-insights li { font-size: 11px; color: var(--text-secondary); line-height: 1.6; }
</style>