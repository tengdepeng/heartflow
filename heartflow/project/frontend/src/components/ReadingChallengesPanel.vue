<template>
  <section class="rcp-panel" aria-label="阅读挑战">
    <div class="rcp-head">
      <span class="rcp-title">🏆 阅读挑战</span>
      <span class="rcp-sub">挑战目标 · 进度追踪 · 达成奖励</span>
    </div>

    <!-- 挑战统计 -->
    <div class="rcp-block">
      <h3 class="rcp-block-title">挑战统计</h3>
      <div class="rcp-grid">
        <div class="rcp-cell">
          <b>{{ stats.total }}</b><span>总挑战</span>
        </div>
        <div class="rcp-cell">
          <b>{{ stats.active }}</b><span>进行中</span>
        </div>
        <div class="rcp-cell">
          <b>{{ stats.completed }}</b><span>已达成</span>
        </div>
      </div>
    </div>

    <!-- 新建挑战 -->
    <div class="rcp-block">
      <h3 class="rcp-block-title">新建挑战</h3>
      <div class="rcp-form">
        <input v-model="form.name" type="text" class="rcp-input" placeholder="挑战名称" aria-label="挑战名称" />
        <div class="rcp-type-picker" aria-label="挑战类型">
          <button
            v-for="(meta, t) in CHALLENGE_TYPE_META"
            :key="t"
            type="button"
            class="rcp-type-btn"
            :class="{ 'rcp-type-btn--on': form.type === t }"
            @click="form.type = t"
          >{{ meta.icon }} {{ meta.label }}</button>
        </div>
        <div class="rcp-form-row">
          <label class="rcp-label">目标
            <input v-model.number="form.target" type="number" min="1" class="rcp-num" aria-label="目标数量" />
          </label>
          <label class="rcp-label">截止
            <input v-model="form.endDate" type="date" class="rcp-input rcp-input--date" aria-label="截止日期" />
          </label>
        </div>
        <input v-model="form.description" type="text" class="rcp-input" placeholder="挑战描述" aria-label="挑战描述" />
        <div class="rcp-form-row">
          <input v-model="form.reward" type="text" class="rcp-input" placeholder="奖励描述（可选）" aria-label="奖励描述" />
          <input v-model="form.tags" type="text" class="rcp-input" placeholder="标签，逗号分隔（可选）" aria-label="标签" />
        </div>
        <button class="rcp-save" :disabled="!canAdd" @click="onAdd">创建挑战</button>
      </div>
    </div>

    <!-- 挑战列表 -->
    <div class="rcp-block">
      <h3 class="rcp-block-title">挑战列表</h3>
      <template v-if="challenges.length">
        <div v-for="c in challenges" :key="c.id" class="rcp-challenge" :class="{ 'rcp-challenge--done': c.completed }">
          <div class="rcp-challenge-head">
            <span class="rcp-challenge-icon">{{ metaOf(c.type).icon }}</span>
            <span class="rcp-challenge-name">{{ c.name }}</span>
            <span v-if="c.completed" class="rcp-challenge-status">✓ 已达成</span>
            <span v-else class="rcp-challenge-pct">{{ pct(c) }}%</span>
          </div>
          <p v-if="c.description" class="rcp-challenge-desc">{{ c.description }}</p>
          <div class="rcp-bar">
            <i :style="{ width: pct(c) + '%' }"></i>
          </div>
          <div class="rcp-challenge-meta">
            <span>{{ c.progress }}/{{ c.target }}</span>
            <span>{{ metaOf(c.type).label }}</span>
            <span v-if="c.tags.length">{{ tagsText(c.tags) }}</span>
            <span v-if="c.completedAt">完成于 {{ dateLabel(c.completedAt) }}</span>
          </div>
          <div v-if="c.reward" class="rcp-challenge-reward">🎁 {{ c.reward }}</div>
          <div v-if="!c.completed" class="rcp-challenge-actions">
            <button type="button" class="rcp-inc" @click="onIncrement(c.id)">✓ 增进度 +1</button>
            <button type="button" class="rcp-finish" @click="onFinish(c.id)">完成</button>
          </div>
          <button type="button" class="rcp-del" aria-label="删除挑战" @click="onRemove(c.id)">✕</button>
        </div>
      </template>
      <p v-else class="rcp-empty">暂无挑战，在下方创建第一个阅读挑战。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import {
  useReadingChallenges,
  CHALLENGE_TYPE_META,
} from '../modules/reading/challenges'
import type { ReadingChallenge, ChallengeType } from '../modules/reading/challenges'

const challengesStore = useReadingChallenges()
const challenges = computed(() => challengesStore.challenges.value)

const stats = computed(() => {
  const list = challenges.value
  return {
    total: list.length,
    active: list.filter((c) => !c.completed).length,
    completed: list.filter((c) => c.completed).length,
  }
})

function metaOf(type: ChallengeType) {
  return CHALLENGE_TYPE_META[type] ?? { label: type, icon: '🎯', desc: '' }
}

function pct(c: ReadingChallenge): number {
  if (c.target <= 0) return 0
  return Math.min(100, Math.round((c.progress / c.target) * 100))
}

function tagsText(tags: string[]): string {
  return tags.join(' · ')
}

function dateLabel(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// ---- 新建挑战 ----
const form = reactive({
  name: '',
  type: 'custom' as ChallengeType,
  target: 1,
  endDate: '',
  description: '',
  reward: '',
  tags: '',
})

const canAdd = computed(() => form.name.trim() !== '' && form.target > 0 && form.endDate !== '')

function onAdd(): void {
  if (!canAdd.value) return
  challengesStore.createChallenge(
    form.name.trim(),
    form.type,
    form.target,
    form.endDate,
    form.description.trim(),
    form.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
    form.reward.trim() || undefined,
  )
  form.name = ''
  form.type = 'custom'
  form.target = 1
  form.endDate = ''
  form.description = ''
  form.reward = ''
  form.tags = ''
}

function onIncrement(id: string): void {
  challengesStore.incrementProgress(id, 1)
}

function onFinish(id: string): void {
  const c = challenges.value.find((x) => x.id === id)
  if (c) challengesStore.updateProgress(id, c.target)
}

function onRemove(id: string): void {
  challengesStore.deleteChallenge(id)
}
</script>

<style scoped>
.rcp-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 14px;
  background: linear-gradient(160deg, rgba(6, 182, 212, 0.07), rgba(138, 154, 122, 0.04));
  border: 1px solid rgba(6, 182, 212, 0.16);
}

.rcp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.rcp-title {
  font-size: 15px;
  font-weight: 600;
  color: #e8e0d4;
}

.rcp-sub {
  font-size: 12px;
  color: #a89e90;
}

.rcp-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rcp-block-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #d8ccb8;
}

.rcp-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.rcp-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 6px;
  border-radius: 10px;
  background: rgba(6, 182, 212, 0.07);
  text-align: center;
}

.rcp-cell b {
  font-size: 16px;
  color: #7dd3fc;
}

.rcp-cell span {
  font-size: 11px;
  color: #a89e90;
}

.rcp-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rcp-input {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(6, 182, 212, 0.25);
  background: rgba(6, 182, 212, 0.08);
  color: #e8e0d4;
  font-size: 12px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.rcp-input--date {
  flex: 1;
  min-width: 120px;
}

.rcp-type-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.rcp-type-btn {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(6, 182, 212, 0.25);
  background: rgba(6, 182, 212, 0.08);
  color: #a89e90;
  cursor: pointer;
}

.rcp-type-btn--on {
  border-color: rgba(125, 211, 252, 0.5);
  background: rgba(125, 211, 252, 0.16);
  color: #7dd3fc;
}

.rcp-form-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.rcp-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #a89e90;
  flex: 1;
}

.rcp-num {
  width: 60px;
  padding: 3px 6px;
  border-radius: 6px;
  border: 1px solid rgba(6, 182, 212, 0.25);
  background: rgba(6, 182, 212, 0.08);
  color: #e8e0d4;
  font-size: 12px;
  outline: none;
}

.rcp-save {
  align-self: flex-start;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(125, 211, 252, 0.4);
  background: rgba(125, 211, 252, 0.16);
  color: #7dd3fc;
  font-size: 12px;
  cursor: pointer;
}

.rcp-save:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.rcp-challenge {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(6, 182, 212, 0.06);
}

.rcp-challenge--done {
  background: rgba(138, 154, 122, 0.08);
  border: 1px solid rgba(138, 154, 122, 0.25);
}

.rcp-challenge-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rcp-challenge-icon {
  font-size: 14px;
}

.rcp-challenge-name {
  font-size: 13px;
  font-weight: 600;
  color: #e8e0d4;
}

.rcp-challenge-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(138, 154, 122, 0.35);
  background: rgba(138, 154, 122, 0.12);
  color: #8a9a7a;
  margin-left: auto;
}

.rcp-challenge-pct {
  font-size: 11px;
  color: #7dd3fc;
  margin-left: auto;
}

.rcp-challenge-desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: #a89e90;
}

.rcp-bar {
  height: 5px;
  border-radius: 999px;
  background: rgba(6, 182, 212, 0.12);
  overflow: hidden;
}

.rcp-bar i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(125, 211, 252, 0.5), #7dd3fc);
}

.rcp-challenge-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 11px;
  color: #a89e90;
}

.rcp-challenge-reward {
  font-size: 11px;
  color: #8a9a7a;
}

.rcp-challenge-actions {
  display: flex;
  gap: 8px;
  margin-top: 2px;
}

.rcp-inc {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 3px 10px;
  border-radius: 8px;
  border: 1px solid rgba(125, 211, 252, 0.3);
  background: rgba(125, 211, 252, 0.1);
  color: #7dd3fc;
  font-size: 11px;
  cursor: pointer;

  min-height: 26px;
}

.rcp-finish {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 3px 10px;
  border-radius: 8px;
  border: 1px solid rgba(138, 154, 122, 0.3);
  background: rgba(138, 154, 122, 0.1);
  color: #8a9a7a;
  font-size: 11px;
  cursor: pointer;

  min-height: 26px;
}

.rcp-del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid rgba(196, 106, 90, 0.3);
  background: rgba(196, 106, 90, 0.1);
  color: #c46a5a;
  font-size: 11px;
  cursor: pointer;

  min-height: 24px;
  min-width: 24px;
}

.rcp-empty {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: #a89e90;
}
</style>