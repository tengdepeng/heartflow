<script setup lang="ts">
// ============================================================
// 外链房 · 待建分区占位
// 不做假界面：明确标出「待建」并列出已确认的实现路径，
// 避免用空壳面板假装功能存在（宪法：不造假数据 / 不造空壳）。
// ============================================================
defineProps<{
  title: string
  summary: string
  plan: string[]
}>()
</script>

<template>
  <div class="pending">
    <div class="pending-head">
      <span class="pending-title">{{ title }}</span>
      <span class="pending-badge">待建</span>
    </div>
    <p class="pending-summary">{{ summary }}</p>
    <ul class="pending-list">
      <li v-for="(p, i) in plan" :key="i">{{ p }}</li>
    </ul>
  </div>
</template>

<style scoped>
.pending {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 20px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(255, 255, 255, 0.12);
  color: var(--text-primary, #e9e0d0);
}

.pending-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pending-title {
  font-size: 15px;
  font-weight: 500;
}
.pending-badge {
  font-size: 10px;
  letter-spacing: 1px;
  padding: 2px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  opacity: 0.65;
}

.pending-summary {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  opacity: 0.6;
}

.pending-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.pending-list li {
  font-size: 12px;
  line-height: 1.7;
  opacity: 0.5;
}
</style>
