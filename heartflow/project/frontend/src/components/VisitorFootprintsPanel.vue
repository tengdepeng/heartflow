<template>
  <section class="vfp" aria-label="访客足迹">
    <div class="vfp-head">
      <span class="vfp-title">🐾 访客足迹</span>
      <span class="vfp-sub">访客 · 足迹 · 问候</span>
    </div>

    <!-- 访客统计 -->
    <div v-if="stats" class="vfp-stats">
      <div class="vfp-stat">
        <span class="vfp-stat-value">{{ stats.totalVisitors }}</span>
        <span class="vfp-stat-label">访客</span>
      </div>
      <div class="vfp-stat">
        <span class="vfp-stat-value">{{ stats.totalFootprints }}</span>
        <span class="vfp-stat-label">足迹</span>
      </div>
      <div class="vfp-stat">
        <span class="vfp-stat-value">{{ stats.unrepliedCount }}</span>
        <span class="vfp-stat-label">未回复</span>
      </div>
      <div class="vfp-stat">
        <span class="vfp-stat-value">{{ Object.keys(stats.byType).length }}</span>
        <span class="vfp-stat-label">印记类型</span>
      </div>
    </div>

    <!-- 新增访客 -->
    <div class="vfp-add">
      <div class="vfp-add-row">
        <input
          v-model="visitorName"
          class="vfp-input"
          placeholder="访客昵称（如：清风、旅人…）"
          maxlength="12"
        />
      </div>
      <div class="vfp-add-row">
        <button
          v-for="t in FOOTPRINT_TYPES"
          :key="t.key"
          class="vfp-chip"
          :class="{ on: footprintType === t.key }"
          @click="footprintType = t.key"
        >{{ t.label }}</button>
      </div>
      <div class="vfp-add-row">
        <input
          v-model="footprintMessage"
          class="vfp-input"
          placeholder="留下印记内容（可选）"
          maxlength="40"
        />
      </div>
      <button class="vfp-btn vfp-btn--primary" :disabled="!visitorName.trim()" @click="addVisit">添加访客足迹</button>
    </div>

    <!-- 足迹列表 -->
    <div v-if="list.length" class="vfp-list">
      <div v-for="f in list" :key="f.id" class="vfp-item" :class="{ replied: f.replied }">
        <div class="vfp-item-head">
          <span class="vfp-item-name">{{ f.visitorName }}</span>
          <span class="vfp-tag">{{ TYPE_LABELS[f.footprintType] }}</span>
          <span class="vfp-item-time">{{ shortTime(f.visitedAt) }}</span>
        </div>
        <p v-if="f.message" class="vfp-item-msg">“{{ f.message }}”</p>
        <p v-if="f.targetFlower" class="vfp-item-flower">🌷 驻足于 {{ f.targetFlower }}</p>
        <p v-if="f.reply" class="vfp-item-reply">💬 回：{{ f.reply }}</p>
        <div v-else class="vfp-reply">
          <input
            v-model="replyInputs[f.id]"
            class="vfp-input"
            :placeholder="`给 ${f.visitorName} 回一句…`"
            maxlength="30"
          />
          <button
            class="vfp-btn"
            :disabled="!hasReply(f.id)"
            @click="reply(f.id)"
          >回复</button>
        </div>
      </div>
    </div>
    <p v-else class="vfp-empty">暂无访客足迹。</p>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useVisitorFootprints } from '../modules/emotion/flower-season'
import type { VisitorFootprint } from '../modules/emotion/flower-season'

const {
  footprints,
  addFootprint,
  replyToFootprint,
  getVisitorStats,
} = useVisitorFootprints()

const visitorName = ref('')
const footprintMessage = ref('')
const footprintType = ref<VisitorFootprint['footprintType']>('like')
const replyInputs = reactive<Record<string, string>>({})

const FOOTPRINT_TYPES: { key: VisitorFootprint['footprintType']; label: string }[] = [
  { key: 'like', label: '👍 点赞' },
  { key: 'water', label: '💧 浇水' },
  { key: 'comment', label: '💬 留言' },
  { key: 'gift', label: '🎁 礼物' },
  { key: 'admire', label: '✨ 欣赏' },
]

const TYPE_LABELS: Record<VisitorFootprint['footprintType'], string> = {
  like: '👍 点赞',
  water: '💧 浇水',
  comment: '💬 留言',
  gift: '🎁 礼物',
  admire: '✨ 欣赏',
}

const stats = computed(() => getVisitorStats())
const list = computed<VisitorFootprint[]>(() => [...footprints.value].reverse())

function addVisit() {
  const name = visitorName.value.trim()
  if (!name) return
  addFootprint(
    `visitor-${Date.now()}`,
    name,
    footprintType.value,
    footprintMessage.value.trim() || undefined,
  )
  visitorName.value = ''
  footprintMessage.value = ''
}

function reply(id: string) {
  const text = replyInputs[id]?.trim()
  if (!text) return
  replyToFootprint(id, text)
  delete replyInputs[id]
}

function hasReply(id: string): boolean {
  return !!(replyInputs[id] && replyInputs[id].trim())
}

function shortTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.vfp {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  background: var(--bg-panel, #1a1612);
}
.vfp-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.vfp-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}
.vfp-sub {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.vfp-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.vfp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
}
.vfp-stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #f0c040;
}
.vfp-stat-label {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.vfp-add {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(138, 154, 122, 0.06);
  border: 1px solid rgba(138, 154, 122, 0.16);
}
.vfp-add-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.vfp-input {
  flex: 1;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary, #e8e0d8);
  font-size: 12px;
  outline: none;
}
.vfp-input::placeholder {
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.vfp-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 10px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;

  min-height: 26px;
}
.vfp-chip.on {
  border-color: #f0c040;
  color: #f0c040;
  background: rgba(240, 192, 64, 0.08);
}
.vfp-btn {
  padding: 6px 14px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.vfp-btn:hover:not(:disabled) {
  border-color: #f0c040;
  color: #f0c040;
}
.vfp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.vfp-btn--primary {
  border-color: #f0c040;
  color: #f0c040;
}
.vfp-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.vfp-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.07));
}
.vfp-item.replied {
  opacity: 0.75;
}
.vfp-item-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.vfp-item-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}
.vfp-tag {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  color: #f0c040;
  background: rgba(240, 192, 64, 0.08);
  border: 1px solid rgba(240, 192, 64, 0.2);
}
.vfp-item-time {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.vfp-item-msg,
.vfp-item-flower,
.vfp-item-reply {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.vfp-reply {
  display: flex;
  gap: 6px;
  align-items: center;
}
.vfp-empty {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
</style>