<template>
  <section class="cdp" data-test="command-decompose" aria-label="跨域任务拆解">
    <header class="cdp-head">
      <div class="cdp-head-titles">
        <span class="cdp-title">🧩 跨域任务拆解</span>
        <span class="cdp-sub">一句跨领域调令 · 分头收集 · 汇总结论</span>
      </div>
      <span class="cdp-badge">真实统计</span>
    </header>

    <!-- 输入 -->
    <div class="cdp-card" data-test="cdp-input-card">
      <div class="cdp-input-row">
        <input
          v-model="query"
          class="cdp-input"
          data-test="cdp-query"
          placeholder="如：帮我查一下最近几天的专注时长和情绪状态，顺便看看笔记和账本"
          @keyup.enter="doDecompose"
        />
        <button class="cdp-btn cdp-btn--primary" data-test="cdp-run" :disabled="!canDecompose" @click="doDecompose">拆解</button>
        <button class="cdp-btn" data-test="cdp-sample" type="button" @click="applySample">示例</button>
      </div>

      <!-- 实时领域识别预览 -->
      <div v-if="query.trim()" class="cdp-preview" data-test="cdp-preview">
        <div class="cdp-preview-head">
          <span class="cdp-preview-label">识别到领域</span>
          <span class="cdp-cross" :class="isCross ? 'yes' : 'no'" data-test="cdp-cross">
            {{ isCross ? '✓ 跨领域，可拆解' : '单领域 / 动作型，维持原样' }}
          </span>
        </div>
        <div v-if="domains.length" class="cdp-chips">
          <span v-for="d in domains" :key="d" class="cdp-chip" :data-test="`cdp-chip-${d}`">{{ domainIcon(d) }} {{ domainRoom(d) }}</span>
        </div>
        <p v-else class="cdp-preview-empty">没有命中领域，试试加入如「专注」「情绪」「账本」等关键词。</p>
      </div>
    </div>

    <!-- 拆解结果 -->
    <div v-if="subtasks.length" class="cdp-card" data-test="cdp-results">
      <div class="cdp-results-head">
        <span class="cdp-block-title">分头收集</span>
        <button v-if="runningCount" class="cdp-btn" data-test="cdp-collect-all" type="button" @click="collectAll">全部收集</button>
        <span v-else-if="allDone" class="cdp-all-done">✓ 全部完成</span>
      </div>
      <ul class="cdp-sub-list">
        <li v-for="t in subtasks" :key="t.id" class="cdp-sub" :class="{ done: t.status === 'done' }" :data-test="`cdp-sub-${t.domain}`">
          <span class="cdp-sub-dot" :class="{ light: t.status === 'done' }"></span>
          <div class="cdp-sub-main">
            <div class="cdp-sub-head">
              <strong>{{ domainIcon(t.domain) }} {{ domainRoom(t.domain) }}</strong>
              <span class="cdp-sub-status">{{ t.status === 'done' ? '已查得' : '待收集' }}</span>
            </div>
            <p v-if="t.result" class="cdp-sub-result" data-test="cdp-sub-result">{{ t.result }}</p>
            <button v-if="t.status !== 'done'" class="cdp-link" :data-test="`cdp-collect-${t.domain}`" type="button" @click="collect(t.id)">收集该领域</button>
          </div>
        </li>
      </ul>
      <div v-if="allDone && summary" class="cdp-summary" data-test="cdp-summary">
        <span class="cdp-summary-label">汇总</span>
        <p class="cdp-summary-text">{{ summary }}</p>
      </div>
    </div>

    <EmptyState v-else icon="" title="下达一句跨领域调令，管家会分派字段分别查询真实记录再汇总。" :glow="false" cta-label="" data-test="cdp-empty" />
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  isCrossDomainQuery,
  detectDomains,
  decomposeCommand,
  runSubTask,
  summarizeSubTasks,
  DOMAIN_ROOM_LABEL,
} from '../modules/advisor/task-decompose'
import type { CommandSubTask } from '../modules/advisor/task-decompose'
import type { DomainKey } from '../modules/association/types'
import EmptyState from './EmptyState.vue'

const query = ref('')
const subtasks = ref<CommandSubTask[]>([])

const canDecompose = computed(() => query.value.trim().length > 0)
const domains = computed(() => detectDomains(query.value))
const isCross = computed(() => isCrossDomainQuery(query.value))

const runningCount = computed(() => subtasks.value.filter(t => t.status !== 'done').length)
const allDone = computed(() => subtasks.value.length > 0 && runningCount.value === 0)
const summary = computed<string>(() => (allDone.value ? summarizeSubTasks(subtasks.value) : ''))

const DOMAIN_ICON: Record<string, string> = {
  session: '🧘', note: '📝', emotion: '🌸', ledger: '🧾',
  anchor: '⚓', goal: '🎯', relation: '🤝', crystal: '💎',
  carrier: '🧭', advisor: '🧙',
}
function domainIcon(d: DomainKey): string {
  return DOMAIN_ICON[d] ?? '📌'
}
function domainRoom(d: DomainKey): string {
  return DOMAIN_ROOM_LABEL[d] ?? '未知房间'
}

const SAMPLE = '帮我统计一下最近的专注时长、情绪状态和笔记数量，再看看这周账本收支'
function applySample(): void {
  query.value = SAMPLE
}
function doDecompose(): void {
  if (!canDecompose.value) return
  const tasks = decomposeCommand(query.value)
  subtasks.value = tasks
}
function collect(id: string): void {
  const t = subtasks.value.find(x => x.id === id)
  if (!t || t.status === 'done') return
  const result = runSubTask(t)
  t.status = 'done'
  t.result = result
}
function collectAll(): void {
  subtasks.value.forEach(t => {
    if (t.status !== 'done') collect(t.id)
  })
}
</script>

<style scoped>
.cdp {
  border-radius: 16px;
  padding: 18px 20px 20px;
  background: linear-gradient(180deg, rgba(138, 154, 122, 0.09), rgba(138, 154, 122, 0.03));
  border: 1px solid rgba(138, 154, 122, 0.28);
}
.cdp-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.cdp-head-titles { display: flex; flex-direction: column; }
.cdp-title { font-size: 1.05rem; font-weight: 700; color: var(--text, #2b2b35); }
.cdp-sub { font-size: 0.78rem; color: var(--text-dim, rgba(232, 224, 216, 0.48)); margin-top: 2px; }
.cdp-badge { font-size: 0.7rem; font-weight: 600; padding: 3px 10px; border-radius: 999px; background: rgba(138, 154, 122, 0.2); color: #8a9a7a; }

.cdp-card { margin-top: 12px; padding: 14px; border-radius: 12px; background: rgba(255, 255, 255, 0.55); border: 1px solid rgba(138, 154, 122, 0.25); }
.cdp-input-row { display: flex; gap: 8px; flex-wrap: wrap; }
.cdp-input { flex: 1; min-width: 200px; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(138, 154, 122, 0.35); background: #fff; font-size: 0.84rem; color: var(--text, #2b2b35); }
.cdp-btn { padding: 8px 14px; border: 1px solid rgba(138, 154, 122, 0.4); border-radius: 8px; background: rgba(138, 154, 122, 0.14); color: var(--text, #2b2b35); font-size: 0.82rem; cursor: pointer; white-space: nowrap; }
.cdp-btn--primary { background: #8a9a7a; color: #fff; }
.cdp-btn:disabled { opacity: 0.4; cursor: default; }

.cdp-preview { margin-top: 12px; }
.cdp-preview-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.cdp-preview-label { font-size: 0.76rem; font-weight: 600; color: var(--text-dim, rgba(232, 224, 216, 0.48)); }
.cdp-cross { font-size: 0.72rem; font-weight: 600; padding: 2px 8px; border-radius: 999px; }
.cdp-cross.yes { background: rgba(138, 154, 122, 0.18); color: #5f7a52; }
.cdp-cross.no { background: rgba(155, 155, 175, 0.16); color: #8a8a9a; }
.cdp-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.cdp-chip { font-size: 0.76rem; padding: 4px 10px; border-radius: 999px; background: rgba(138, 154, 122, 0.14); color: #5f7a52; }
.cdp-preview-empty { font-size: 0.76rem; color: var(--text-dim, rgba(232, 224, 216, 0.48)); margin-top: 8px; }

.cdp-results-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.cdp-block-title { font-size: 0.88rem; font-weight: 700; color: var(--text, #2b2b35); }
.cdp-all-done { font-size: 0.76rem; font-weight: 600; color: #5f7a52; }
.cdp-sub-list { list-style: none; padding: 0; margin: 0; }
.cdp-sub { display: flex; gap: 10px; padding: 8px 6px; border-bottom: 1px dashed rgba(138, 154, 122, 0.2); }
.cdp-sub:last-child { border-bottom: none; }
.cdp-sub-dot { flex: 0 0 auto; width: 8px; height: 8px; margin-top: 6px; border-radius: 50%; background: rgba(138, 154, 122, 0.3); }
.cdp-sub-dot.light { background: #8a9a7a; box-shadow: 0 0 8px 1px rgba(138, 154, 122, 0.5); }
.cdp-sub-main { flex: 1; min-width: 0; }
.cdp-sub-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.cdp-sub-head strong { font-size: 0.84rem; color: var(--text, #2b2b35); }
.cdp-sub-status { font-size: 0.7rem; color: var(--text-dim, rgba(232, 224, 216, 0.48)); }
.cdp-sub-result { font-size: 0.8rem; color: #5f7a52; margin: 4px 0 0; line-height: 1.5; }
.cdp-link { background: none; border: none; padding: 0; margin-top: 4px; color: #5f7a52; font-size: 0.76rem; cursor: pointer; text-decoration: underline; }

.cdp-summary { margin-top: 10px; padding: 10px 12px; border-radius: 10px; background: rgba(138, 154, 122, 0.12); border: 1px solid rgba(138, 154, 122, 0.3); }
.cdp-summary-label { font-size: 0.72rem; font-weight: 700; color: #5f7a52; letter-spacing: 1px; }
.cdp-summary-text { font-size: 0.84rem; color: var(--text, #2b2b35); margin: 4px 0 0; line-height: 1.6; }
</style>