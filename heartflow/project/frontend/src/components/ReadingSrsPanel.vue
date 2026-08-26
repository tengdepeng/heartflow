<template>
  <section class="srs-panel">
    <h4 class="srs-title">🧠 间隔重复 · 三选一回顾</h4>
    <p class="srs-hint">按艾宾浩斯曲线复习笔记年轮。遇到即回顾，不强制连续打卡。</p>

    <!-- 统计 -->
    <div class="srs-stats">
      <div class="srs-stat"><span class="srs-num">{{ stats.total }}</span><span class="srs-label">年轮</span></div>
      <div class="srs-stat"><span class="srs-num">{{ stats.dueForReview }}</span><span class="srs-label">待复习</span></div>
      <div class="srs-stat"><span class="srs-num">{{ stats.forgotten }}</span><span class="srs-label">已遗忘</span></div>
      <div class="srs-stat"><span class="srs-num">{{ stats.reunited }}</span><span class="srs-label">重逢</span></div>
      <div class="srs-stat"><span class="srs-num">{{ avgRingsText }}</span><span class="srs-label">均层</span></div>
    </div>

    <!-- 记忆光泽曲线 -->
    <div class="srs-curve" v-if="memoryCurve.length">
      <span class="srs-curve-label">记忆光泽曲线（按掌握度分布）</span>
      <div class="srs-curve-bars">
        <div v-for="pt in memoryCurve" :key="pt.level" class="srs-curve-col">
          <span class="srs-curve-bar" :style="{ height: barHeight(pt.count) }"></span>
          <span class="srs-curve-x">{{ pt.level }}</span>
        </div>
      </div>
    </div>

    <!-- 复习队列 -->
    <div class="srs-queue">
      <div v-for="item in reviewQueue" :key="item.noteId" class="srs-item">
        <div class="srs-item-main">
          <span class="srs-item-title">{{ item.title || '（无标题笔记）' }}</span>
          <span v-if="item.forgotten" class="srs-badge srs-badge-forget">已遗忘</span>
          <span class="srs-item-meta">
            层 {{ item.rings }} ·
            {{ item.daysUntil <= 0 ? '逾期 ' + -item.daysUntil + ' 天' : '还有 ' + item.daysUntil + ' 天' }}
          </span>
        </div>
        <div class="srs-item-actions">
          <button
            v-for="g in grades"
            :key="g"
            :class="['srs-grade-btn', 'g-' + g]"
            @click="onReview(item.noteId, g)"
          >{{ SRS_GRADE_LABELS[g] }}</button>
        </div>
      </div>
      <div v-if="reviewQueue.length === 0" class="srs-empty">暂无待复习的年轮。把笔记纳入复习即可开始。</div>
    </div>

    <!-- 纳入复习 -->
    <div class="srs-enroll">
      <input v-model="enrollId" class="srs-input" placeholder="输入笔记 ID 纳入复习" @keydown.enter.prevent="onEnroll" />
      <button class="srs-btn" @click="onEnroll">纳入复习</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  useReadingSrs,
  SRS_GRADE_LABELS,
  type SrsGrade,
} from '../modules/reading/srs'

const { reviewQueue, stats, memoryCurve, review, ensureRing } = useReadingSrs()

const grades: SrsGrade[] = ['know', 'fuzzy', 'forget']
const enrollId = ref('')

const avgRingsText = computed(() => stats.value.avgRings.toFixed(1))

function onReview(noteId: string, grade: SrsGrade) {
  review(noteId, grade)
}

function onEnroll() {
  const id = enrollId.value.trim()
  if (id) {
    ensureRing(id)
    enrollId.value = ''
  }
}

function barHeight(count: number): string {
  const max = Math.max(1, ...memoryCurve.value.map(p => p.count))
  return `${(count / max) * 100}%`
}
</script>

<style scoped>
.srs-panel {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px dashed rgba(255, 255, 255, 0.12);
}
.srs-hint {
  margin: 4px 0 12px;
  font-size: 12px;
  opacity: 0.62;
  line-height: 1.5;
}
.srs-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.srs-stat {
  flex: 1;
  min-width: 64px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.srs-num {
  font-size: 18px;
  font-weight: 700;
  color: #6b9fc4;
}
.srs-label {
  font-size: 11px;
  opacity: 0.6;
}
.srs-curve {
  margin-bottom: 16px;
}
.srs-curve-label {
  font-size: 12px;
  opacity: 0.6;
}
.srs-curve-bars {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 70px;
  margin-top: 6px;
}
.srs-curve-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
  gap: 4px;
}
.srs-curve-bar {
  width: 70%;
  min-height: 3px;
  border-radius: 4px 4px 0 0;
  background: linear-gradient(180deg, #5ab8a0, #6b9fc4);
}
.srs-curve-x {
  font-size: 10px;
  opacity: 0.5;
}
.srs-queue {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}
.srs-item {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.srs-item-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.srs-item-title {
  font-size: 14px;
  font-weight: 600;
}
.srs-badge {
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 999px;
}
.srs-badge-forget {
  background: rgba(239, 68, 68, 0.18);
  color: #ff9a9a;
}
.srs-item-meta {
  font-size: 11px;
  opacity: 0.6;
}
.srs-item-actions {
  display: flex;
  gap: 6px;
}
.srs-grade-btn {
  padding: 5px 12px;
  border-radius: 8px;
  border: none;
  font-size: 12px;
  cursor: pointer;
  color: #fff;
}
.srs-grade-btn.g-know { background: rgba(90, 184, 160, 0.28); }
.srs-grade-btn.g-fuzzy { background: rgba(245, 158, 11, 0.28); }
.srs-grade-btn.g-forget { background: rgba(239, 68, 68, 0.28); }
.srs-grade-btn:hover { filter: brightness(1.2); }
.srs-empty {
  font-size: 13px;
  opacity: 0.55;
  padding: 14px;
  text-align: center;
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: 12px;
}
.srs-enroll {
  display: flex;
  gap: 8px;
}
.srs-input {
  flex: 1;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  font-size: 13px;
}
.srs-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  background: rgba(107, 159, 196, 0.2);
  color: #cfe0ff;
  font-size: 13px;
  cursor: pointer;
}
.srs-btn:hover { background: rgba(107, 159, 196, 0.32); }
</style>
