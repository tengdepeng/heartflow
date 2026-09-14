<template>
  <section class="wlp-panel">
    <div class="wlp-header">
      <h4 class="wlp-title">✨ 心愿清单</h4>
      <p class="wlp-subtitle">习惯联动解锁 · 点亮所愿</p>
    </div>

    <!-- 统计概览 -->
    <div class="wlp-stats">
      <div class="wlp-stat">
        <span class="wlp-stat-num">{{ overview.total }}</span>
        <span class="wlp-stat-label">心愿总数</span>
      </div>
      <div class="wlp-stat">
        <span class="wlp-stat-num wlp-stat-unlocked">{{ overview.unlocked }}</span>
        <span class="wlp-stat-label">已点亮</span>
      </div>
      <div class="wlp-stat">
        <span class="wlp-stat-num">{{ overview.locked }}</span>
        <span class="wlp-stat-label">进行中</span>
      </div>
      <div class="wlp-stat">
        <span class="wlp-stat-num">{{ overview.overallPercent }}%</span>
        <span class="wlp-stat-label">整体进度</span>
      </div>
    </div>

    <!-- 新增心愿 -->
    <form class="wlp-add-form" @submit.prevent="handleAdd">
      <div class="wlp-add-row">
        <input v-model="newTitle" placeholder="心愿标题（如：去一次远方旅行）" class="wlp-input" />
        <input v-model="newIcon" placeholder="✨" class="wlp-input wlp-icon-input" />
        <button class="wlp-btn" :disabled="!newTitle.trim()">点亮心愿</button>
      </div>
      <div v-if="habits.length" class="wlp-habit-picker">
        <p class="wlp-picker-label">关联习惯（完成指定次数后点亮）：</p>
        <div v-for="h in habits" :key="h.id" class="wlp-habit-option">
          <label class="wlp-habit-check">
            <input type="checkbox" :value="h.id" v-model="selectedHabitIds" />
            <span>{{ h.text }}</span>
          </label>
          <input
            v-if="selectedHabitIds.includes(h.id)"
            v-model.number="requiredCounts[h.id]"
            type="number"
            min="1"
            placeholder="次数"
            class="wlp-count-input"
          />
        </div>
      </div>
      <p v-else class="wlp-picker-hint">先在「习惯追踪」里添加习惯，才能把心愿与习惯联动。</p>
    </form>

    <!-- 心愿列表 -->
    <div v-if="wishes.length" class="wlp-list">
      <div v-for="w in wishes" :key="w.id" class="wlp-wish" :class="{ 'is-unlocked': w.unlocked }">
        <template v-if="editingId !== w.id">
          <div class="wlp-wish-head">
            <span class="wlp-wish-icon">{{ w.icon }}</span>
            <span class="wlp-wish-title">{{ w.title }}</span>
            <span class="wlp-wish-status" :class="{ 'wlp-status-unlocked': w.unlocked }">
              {{ w.unlocked ? '✨ 已点亮' : progressOf(w).percent + '%' }}
            </span>
          </div>
          <div class="wlp-progress-bar">
            <div class="wlp-progress-fill" :style="{ width: progressOf(w).percent + '%' }"></div>
          </div>
          <div v-if="w.linkedHabitIds.length" class="wlp-habit-progress">
            <span v-for="hid in w.linkedHabitIds" :key="hid" class="wlp-habit-chip">
              {{ habitName(hid) }} {{ Math.min(counts[hid] ?? 0, w.requiredCounts[hid] ?? 1) }}/{{ w.requiredCounts[hid] ?? 1 }}
            </span>
          </div>
          <div v-if="nextHint(w)" class="wlp-next-hint">{{ nextHint(w) }}</div>
          <div v-if="w.unlocked && w.unlockedAt" class="wlp-unlocked-at">
            点亮于 {{ fmt(w.unlockedAt) }}
          </div>
          <div class="wlp-wish-actions">
            <button class="wlp-mini" @click="startEdit(w)">编辑</button>
            <button class="wlp-mini wlp-danger" @click="removeWish(w.id)">删除</button>
          </div>
        </template>

        <!-- 编辑表单 -->
        <form v-else class="wlp-edit-form" @submit.prevent="saveEdit">
          <input v-model="editTitle" placeholder="心愿标题" class="wlp-input" />
          <input v-model="editIcon" placeholder="✨" class="wlp-input wlp-icon-input" />
          <div class="wlp-habit-picker">
            <p class="wlp-picker-label">关联习惯：</p>
            <div v-for="h in habits" :key="h.id" class="wlp-habit-option">
              <label class="wlp-habit-check">
                <input type="checkbox" :value="h.id" v-model="editSelectedHabitIds" />
                <span>{{ h.text }}</span>
              </label>
              <input
                v-if="editSelectedHabitIds.includes(h.id)"
                v-model.number="editRequiredCounts[h.id]"
                type="number"
                min="1"
                placeholder="次数"
                class="wlp-count-input"
              />
            </div>
          </div>
          <div class="wlp-edit-actions">
            <button class="wlp-mini wlp-save" type="submit">保存</button>
            <button class="wlp-mini" type="button" @click="cancelEdit">取消</button>
          </div>
        </form>
      </div>
    </div>
    <p v-else class="wlp-empty">还没有心愿，写下第一个想点亮的心愿吧</p>

    <!-- 温和小结 -->
    <div v-if="insights.length" class="wlp-insights">
      <p v-for="(ins, i) in insights" :key="i" class="wlp-insight">{{ ins }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  useWishList,
  wishProgress,
  habitCompletionCounts,
  wishlistOverview,
  wishlistInsights,
} from '../modules/garden'
import { useGardenFlourish } from '../modules/garden'
import type { Wish } from '../modules/garden'

const wishList = useWishList()
const flourish = useGardenFlourish()

wishList.load()

const habits = computed(() => flourish.habits.value)
const wishes = computed(() => wishList.wishes.value)
const counts = computed(() => habitCompletionCounts(habits.value))
const overview = computed(() => wishlistOverview(wishes.value, counts.value))
const insights = computed(() => wishlistInsights(wishes.value, counts.value))

function progressOf(w: Wish) {
  return wishProgress(w, counts.value)
}

function nextHint(w: Wish): string | null {
  if (w.unlocked) return null
  const nh = progressOf(w).nextHabit
  if (!nh) return null
  return `距点亮还差「${habitName(nh.habitId)}」${nh.required - nh.current} 次`
}

function habitName(id: string): string {
  return habits.value.find((h) => h.id === id)?.text ?? '未知习惯'
}

function fmt(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

// ---- 新增 ----
const newTitle = ref('')
const newIcon = ref('')
const selectedHabitIds = ref<string[]>([])
const requiredCounts = ref<Record<string, number>>({})

function handleAdd() {
  const title = newTitle.value.trim()
  if (!title) return
  const linkedHabitIds = [...selectedHabitIds.value]
  const req: Record<string, number> = {}
  for (const hid of linkedHabitIds) {
    const n = requiredCounts.value[hid]
    req[hid] = n && n > 0 ? Math.round(n) : 1
  }
  wishList.addWish({
    title,
    icon: newIcon.value.trim() || '✨',
    linkedHabitIds,
    requiredCounts: req,
  })
  // 立即按当前习惯完成度刷新解锁
  wishList.refreshUnlocks(counts.value)
  newTitle.value = ''
  newIcon.value = ''
  selectedHabitIds.value = []
  requiredCounts.value = {}
}

// ---- 编辑 ----
const editingId = ref<string | null>(null)
const editTitle = ref('')
const editIcon = ref('')
const editSelectedHabitIds = ref<string[]>([])
const editRequiredCounts = ref<Record<string, number>>({})

function startEdit(w: Wish) {
  editingId.value = w.id
  editTitle.value = w.title
  editIcon.value = w.icon
  editSelectedHabitIds.value = [...w.linkedHabitIds]
  editRequiredCounts.value = { ...w.requiredCounts }
}

function saveEdit() {
  if (!editingId.value) return
  const linkedHabitIds = [...editSelectedHabitIds.value]
  const req: Record<string, number> = {}
  for (const hid of linkedHabitIds) {
    const n = editRequiredCounts.value[hid]
    req[hid] = n && n > 0 ? Math.round(n) : 1
  }
  wishList.updateWish(editingId.value, {
    title: editTitle.value.trim() || '未命名心愿',
    icon: editIcon.value.trim() || '✨',
    linkedHabitIds,
    requiredCounts: req,
  })
  wishList.refreshUnlocks(counts.value)
  cancelEdit()
}

function cancelEdit() {
  editingId.value = null
}

function removeWish(id: string) {
  wishList.removeWish(id)
}
</script>

<style scoped>
.wlp-panel {
  margin-top: 18px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--bg-card-rgb), 0.45);
}

.wlp-header {
  margin-bottom: 10px;
}

.wlp-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--accent);
  letter-spacing: 1px;
}

.wlp-subtitle {
  margin: 2px 0 0;
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.45);
}

.wlp-stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.wlp-stat {
  flex: 1;
  min-width: 70px;
  padding: 8px 6px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.05);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  text-align: center;
}

.wlp-stat-num {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: rgba(var(--text-primary-rgb), 0.85);
}

.wlp-stat-unlocked {
  color: var(--accent);
}

.wlp-stat-label {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.45);
}

.wlp-add-form {
  margin-bottom: 12px;
}

.wlp-add-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.wlp-input {
  flex: 1;
  min-width: 120px;
  padding: 7px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.16);
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.6);
  color: rgba(var(--text-primary-rgb), 0.85);
  font-size: 13px;
  font-family: inherit;
}

.wlp-input:focus {
  outline: none;
  border-color: rgba(var(--accent-rgb), 0.35);
}

.wlp-icon-input {
  flex: 0 0 56px;
  min-width: 56px;
  text-align: center;
}

.wlp-btn {
  padding: 7px 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.14);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.wlp-btn:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.2);
}

.wlp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.wlp-habit-picker {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px dashed rgba(var(--accent-rgb), 0.14);
}

.wlp-picker-label {
  margin: 0 0 6px;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.5);
}

.wlp-picker-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.4);
}

.wlp-habit-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
}

.wlp-habit-check {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(var(--text-primary-rgb), 0.75);
  cursor: pointer;
}

.wlp-count-input {
  width: 64px;
  padding: 3px 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.16);
  border-radius: 6px;
  background: rgba(var(--bg-card-rgb), 0.6);
  color: rgba(var(--text-primary-rgb), 0.85);
  font-size: 12px;
  font-family: inherit;
}

.wlp-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.wlp-wish {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--bg-card-rgb), 0.35);
}

.wlp-wish.is-unlocked {
  border-color: rgba(var(--accent-rgb), 0.28);
  background: rgba(var(--accent-rgb), 0.06);
}

.wlp-wish-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.wlp-wish-icon {
  font-size: 16px;
}

.wlp-wish-title {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.85);
}

.wlp-wish-status {
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.5);
}

.wlp-status-unlocked {
  color: var(--accent);
}

.wlp-progress-bar {
  height: 4px;
  border-radius: 2px;
  background: rgba(var(--accent-rgb), 0.1);
  overflow: hidden;
  margin-bottom: 6px;
}

.wlp-progress-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.5), var(--accent));
  transition: width 0.3s;
}

.wlp-habit-progress {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.wlp-habit-chip {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.08);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.6);
}

.wlp-next-hint {
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.5);
  margin-bottom: 6px;
}

.wlp-unlocked-at {
  font-size: 12px;
  color: var(--accent);
  margin-bottom: 6px;
}

.wlp-wish-actions {
  display: flex;
  gap: 8px;
}

.wlp-mini {
  padding: 4px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.14);
  border-radius: 6px;
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.6);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.wlp-mini:hover {
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.3);
}

.wlp-danger:hover {
  color: #c46a5a;
  border-color: rgba(196, 106, 90, 0.4);
}

.wlp-save {
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.3);
}

.wlp-edit-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.wlp-edit-actions {
  display: flex;
  gap: 8px;
}

.wlp-empty {
  margin: 10px 0 0;
  font-size: 13px;
  color: rgba(var(--text-primary-rgb), 0.4);
}

.wlp-insights {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.05);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.wlp-insight {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(var(--text-primary-rgb), 0.55);
}

@media (max-width: 480px) {
  .wlp-add-row {
    flex-direction: column;
  }
  .wlp-icon-input {
    flex: 1;
    min-width: 100%;
  }
}
</style>
