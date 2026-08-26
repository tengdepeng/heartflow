<template>
  <section class="brp" aria-label="分支回放">
    <div class="brp-head">
      <span class="brp-title">🎬 分支回放</span>
      <span class="brp-sub">演化回放 · 决策点标记 · 速度控制</span>
    </div>

    <!-- 统计总览 -->
    <div class="brp-stats">
      <div class="brp-stat"><b>{{ stats.totalReplays }}</b><span>回放会话</span></div>
      <div class="brp-stat"><b>{{ stats.totalEvents }}</b><span>回放事件</span></div>
      <div class="brp-stat brp-stat--hot"><b>{{ stats.totalMarkers }}</b><span>决策标记</span></div>
    </div>

    <!-- 创建回放 -->
    <div class="brp-block">
      <span class="brp-block-label">新建回放</span>
      <div class="brp-create">
        <input v-model="createForm.name" class="brp-input" placeholder="回放名称，如：工作线演化" />
        <input v-model="createForm.description" class="brp-input" placeholder="回放描述（可选）" />
        <div v-if="branches.length" class="brp-scope">
          <span class="brp-scope-label">选择分支范围（不选则全部）</span>
          <div class="brp-scope-opts">
            <label v-for="b in branches" :key="b.id" class="brp-scope-opt">
              <input type="checkbox" :value="b.id" v-model="selectedBranchIds" />
              <span>{{ b.name }}</span>
              <i v-if="b.isActive">当前</i>
            </label>
          </div>
        </div>
        <button
          class="brp-btn brp-btn--primary brp-create-btn"
          :disabled="!createForm.name.trim() || branches.length === 0"
          @click="createReplay"
        >🎬 创建回放</button>
      </div>
    </div>

    <!-- 空态 -->
    <div v-if="!replays.length" class="brp-empty">
      <span>🌌</span>
      <p>还没有回放会话。先在上方「时间分支」区创建分支并留下检查点，再回来回放它们的故事。</p>
    </div>

    <!-- 回放列表 -->
    <div v-else class="brp-block">
      <span class="brp-block-label">回放会话</span>
      <div class="brp-list">
        <div
          v-for="r in replays"
          :key="r.id"
          class="brp-item"
          :class="{ active: r.id === currentReplayId }"
          @click="selectReplay(r.id)"
        >
          <span class="brp-item-icon">🎞️</span>
          <div class="brp-item-body">
            <strong class="brp-item-name">{{ r.name }}</strong>
            <span class="brp-item-meta">{{ r.totalEvents }} 个事件 · {{ r.markers.length }} 个标记</span>
          </div>
          <span class="brp-item-state" :class="stateClass(r.state)">{{ stateLabel(r.state) }}</span>
          <span class="brp-item-del" @click.stop="removeReplay(r.id)">✕</span>
        </div>
      </div>
    </div>

    <!-- 当前回放详情 -->
    <div v-if="currentReplay" class="brp-block brp-detail">
      <div class="brp-detail-head">
        <span class="brp-detail-name">{{ currentReplay.name }}</span>
        <span class="brp-item-state" :class="stateClass(currentReplay.state)">{{ stateLabel(currentReplay.state) }}</span>
      </div>

      <!-- 进度条 -->
      <div class="brp-progress">
        <div class="brp-progress-bar"><i :style="{ width: (progress * 100) + '%' }"></i></div>
        <span class="brp-progress-num">{{ Math.round(progress * 100) }}%</span>
      </div>

      <!-- 当前事件 -->
      <div v-if="currentEvent" class="brp-event" :class="{ decision: currentEvent.isDecisionPoint }">
        <span class="brp-event-icon">{{ eventIcon(currentEvent.type) }}</span>
        <div class="brp-event-body">
          <span class="brp-event-type">{{ eventLabel(currentEvent.type) }}</span>
          <strong class="brp-event-label">{{ currentEvent.label }}</strong>
          <p class="brp-event-desc">{{ currentEvent.description }}</p>
          <span class="brp-event-meta">{{ fmtTime(currentEvent.timestamp) }} · 事件 {{ currentReplay.currentEventIndex + 1 }} / {{ currentReplay.totalEvents }}</span>
        </div>
        <span v-if="currentEvent.isDecisionPoint" class="brp-event-badge">决策点</span>
      </div>
      <div v-else class="brp-event-empty">这个回放没有可回放的事件</div>

      <!-- 播放控制 -->
      <div class="brp-controls">
        <button
          v-if="currentReplay.state === 'playing'"
          class="brp-btn brp-play"
          @click="api.pauseReplay()"
        >⏸ 暂停</button>
        <button
          v-else-if="currentReplay.state === 'paused'"
          class="brp-btn brp-btn--primary brp-play"
          @click="api.resumeReplay()"
        >▶ 继续</button>
        <button
          v-else
          class="brp-btn brp-btn--primary brp-play"
          :disabled="currentReplay.totalEvents === 0"
          @click="api.startReplay(currentReplay.id)"
        >▶ 开始</button>
        <button
          v-if="currentReplay.state === 'playing' || currentReplay.state === 'paused'"
          class="brp-btn brp-stop"
          @click="api.stopReplay()"
        >⏹ 停止</button>
        <label class="brp-speed">
          <span>速度</span>
          <select :value="currentReplay.speed" @change="onSpeedChange">
            <option v-for="(label, key) in speedOptions" :key="key" :value="key">{{ label }}</option>
          </select>
        </label>
      </div>

      <!-- 事件导航 -->
      <div class="brp-nav">
        <button class="brp-btn brp-btn--sm brp-nav-start" @click="api.jumpToStart()">⏮ 开头</button>
        <button class="brp-btn brp-btn--sm brp-nav-prev" @click="api.previousEvent()">◀ 上一步</button>
        <button class="brp-btn brp-btn--sm brp-nav-next" @click="api.nextEvent()">下一步 ▶</button>
        <button class="brp-btn brp-btn--sm brp-nav-end" @click="api.jumpToEnd()">结尾 ⏭</button>
      </div>

      <!-- 事件时间线 -->
      <div v-if="currentReplay.events.length" class="brp-block">
        <span class="brp-block-label">事件时间线</span>
        <div class="brp-timeline">
          <div
            v-for="(ev, idx) in currentReplay.events"
            :key="ev.id"
            class="brp-tl-item"
            :class="{ current: idx === currentReplay.currentEventIndex, decision: ev.isDecisionPoint }"
            @click="api.jumpToEvent(idx)"
          >
            <span class="brp-tl-dot">{{ eventIcon(ev.type) }}</span>
            <span class="brp-tl-label">{{ ev.label }}</span>
            <span class="brp-tl-idx">{{ idx + 1 }}</span>
          </div>
        </div>
      </div>

      <!-- 决策点 -->
      <div v-if="decisionPoints.length" class="brp-block">
        <span class="brp-block-label">关键决策点 · {{ decisionPoints.length }}</span>
        <div class="brp-decision-list">
          <div v-for="d in decisionPoints" :key="d.id" class="brp-decision" @click="jumpToDecision(d)">
            <span class="brp-decision-dot">✦</span>
            <span class="brp-decision-text">{{ d.label }}</span>
          </div>
        </div>
      </div>

      <!-- 标记管理 -->
      <div class="brp-block">
        <span class="brp-block-label">决策标记 · {{ markers.length }}</span>
        <div class="brp-marker-add">
          <input
            v-model="markerLabel"
            class="brp-input"
            placeholder="标记名称，如：关键抉择"
            @keydown.enter.prevent="addMarker"
          />
          <button class="brp-btn brp-btn--sm brp-marker-add-btn" :disabled="!markerLabel.trim()" @click="addMarker">📌 标记此处</button>
        </div>
        <div v-if="markers.length" class="brp-marker-list">
          <div v-for="m in markers" :key="m.id" class="brp-marker" :style="{ borderColor: m.color + '55' }">
            <span class="brp-marker-dot" :style="{ background: m.color }"></span>
            <span class="brp-marker-label" @click="api.jumpToMarker(m.id)">{{ m.label }}</span>
            <span class="brp-marker-event">事件 {{ m.eventIndex + 1 }}</span>
            <span class="brp-marker-del" @click="api.removeMarker(m.id)">✕</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useBranchReplay, useParallelWorld, SPEED_LABELS } from '../modules/parallel-world'
import type { ReplayEvent, ReplayState, ReplaySpeed } from '../modules/parallel-world'

const parallelWorld = useParallelWorld()
const api = useBranchReplay()

const branches = parallelWorld.branches
const checkpoints = parallelWorld.checkpoints
const replays = api.replays
const currentReplay = api.currentReplay
const currentEvent = api.currentEvent
const currentReplayId = api.currentReplayId
const progress = api.replayProgress

const createForm = reactive({ name: '', description: '' })
const selectedBranchIds = ref<string[]>([])
const markerLabel = ref('')

const stats = computed(() => api.getReplayStats())
const markers = computed(() => api.getMarkers())
const decisionPoints = computed<ReplayEvent[]>(() => api.getDecisionPoints())

const speedOptions = SPEED_LABELS

const EVENT_META: Record<string, { icon: string; label: string }> = {
  'branch-created': { icon: '🌱', label: '分支创建' },
  'branch-switched': { icon: '🔀', label: '分支切换' },
  'checkpoint-created': { icon: '📍', label: '检查点' },
  'checkpoint-deleted': { icon: '🗑️', label: '检查点删除' },
  'branch-merged': { icon: '🔗', label: '分支合并' },
  'branch-deleted': { icon: '❌', label: '分支删除' },
  marker: { icon: '📌', label: '决策标记' },
}

const STATE_LABELS: Record<ReplayState, string> = {
  idle: '待机',
  playing: '回放中',
  paused: '已暂停',
  completed: '已完成',
  stopped: '已停止',
}

onMounted(() => {
  parallelWorld.load()
  api.loadReplays()
})

function createReplay() {
  const name = createForm.name.trim()
  if (!name || branches.value.length === 0) return
  const branchIds = selectedBranchIds.value.length > 0 ? [...selectedBranchIds.value] : undefined
  const replay = api.createReplay(name, createForm.description.trim(), branches.value, checkpoints.value, branchIds)
  createForm.name = ''
  createForm.description = ''
  selectedBranchIds.value = []
  if (replay) api.currentReplayId.value = replay.id
}

function selectReplay(id: string) {
  if (currentReplayId.value === id) return
  api.stopReplay()
  api.currentReplayId.value = id
}

function removeReplay(id: string) {
  api.deleteReplay(id)
}

function onSpeedChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value as ReplaySpeed
  api.setSpeed(v)
}

function addMarker() {
  const label = markerLabel.value.trim()
  if (!label) return
  api.addMarker(label)
  markerLabel.value = ''
}

function jumpToDecision(d: ReplayEvent) {
  const replay = currentReplay.value
  if (!replay) return
  const idx = replay.events.indexOf(d)
  if (idx >= 0) api.jumpToEvent(idx)
}

function eventIcon(type: string) {
  return EVENT_META[type]?.icon ?? '•'
}

function eventLabel(type: string) {
  return EVENT_META[type]?.label ?? type
}

function stateLabel(s: ReplayState) {
  return STATE_LABELS[s] ?? s
}

function stateClass(s: ReplayState) {
  return 'brp-state--' + s
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.brp {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
}

.brp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.brp-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.brp-sub {
  font-size: 12px;
  opacity: 0.6;
}

.brp-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.brp-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
}

.brp-stat b {
  font-size: 18px;
  font-weight: 600;
}

.brp-stat span {
  font-size: 11px;
  opacity: 0.6;
}

.brp-stat--hot b {
  color: #e0a96d;
}

.brp-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.brp-block-label {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.75;
  letter-spacing: 0.04em;
}

.brp-create {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.brp-input {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  font-size: 13px;
  font-family: inherit;
  outline: none;
}

.brp-input::placeholder {
  opacity: 0.4;
}

.brp-input:focus {
  border-color: rgba(224, 169, 109, 0.4);
}

.brp-scope {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.brp-scope-label {
  font-size: 11px;
  opacity: 0.55;
}

.brp-scope-opts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.brp-scope-opt {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  font-size: 12px;
  cursor: pointer;
}

.brp-scope-opt i {
  font-style: normal;
  font-size: 10px;
  color: #e0a96d;
}

.brp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 22px 16px;
  text-align: center;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
}

.brp-empty span {
  font-size: 26px;
}

.brp-empty p {
  margin: 0;
  max-width: 340px;
  font-size: 13px;
  line-height: 1.7;
  opacity: 0.65;
}

.brp-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.brp-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid transparent;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.brp-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.brp-item.active {
  border-color: rgba(224, 169, 109, 0.35);
  background: rgba(224, 169, 109, 0.07);
}

.brp-item-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.brp-item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.brp-item-name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.brp-item-meta {
  font-size: 11px;
  opacity: 0.55;
}

.brp-item-state {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 6px;
  flex-shrink: 0;
  letter-spacing: 0.5px;
}

.brp-state--idle {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
}

.brp-state--playing {
  background: rgba(138, 154, 122, 0.18);
  color: #8a9a7a;
}

.brp-state--paused {
  background: rgba(224, 169, 109, 0.15);
  color: #e0a96d;
}

.brp-state--completed {
  background: rgba(138, 154, 122, 0.12);
  color: #8a9a7a;
}

.brp-state--stopped {
  background: rgba(196, 106, 90, 0.12);
  color: #c46a5a;
}

.brp-item-del {
  cursor: pointer;
  opacity: 0.4;
  font-size: 12px;
  flex-shrink: 0;
}

.brp-item-del:hover {
  opacity: 1;
}

.brp-detail {
  padding: 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.brp-detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.brp-detail-name {
  font-size: 14px;
  font-weight: 600;
}

.brp-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brp-progress-bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.07);
  overflow: hidden;
}

.brp-progress-bar i {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #8a9a7a, #e0a96d);
  transition: width 0.3s;
}

.brp-progress-num {
  font-size: 12px;
  font-weight: 600;
  color: #e0a96d;
  flex-shrink: 0;
}

.brp-event {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.brp-event.decision {
  border-color: rgba(224, 169, 109, 0.3);
  background: rgba(224, 169, 109, 0.05);
}

.brp-event-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 1px;
}

.brp-event-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brp-event-type {
  font-size: 10px;
  letter-spacing: 1px;
  opacity: 0.5;
}

.brp-event-label {
  font-size: 14px;
  font-weight: 600;
}

.brp-event-desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  opacity: 0.7;
}

.brp-event-meta {
  font-size: 11px;
  opacity: 0.45;
}

.brp-event-badge {
  flex-shrink: 0;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(224, 169, 109, 0.15);
  color: #e0a96d;
  letter-spacing: 1px;
}

.brp-event-empty {
  padding: 14px;
  text-align: center;
  font-size: 12px;
  opacity: 0.5;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}

.brp-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.brp-btn {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
}

.brp-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.brp-btn--primary {
  background: rgba(224, 169, 109, 0.18);
  border-color: rgba(224, 169, 109, 0.35);
}

.brp-btn--sm {
  padding: 5px 10px;
  font-size: 12px;
}

.brp-speed {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  font-size: 12px;
  opacity: 0.75;
}

.brp-speed select {
  padding: 5px 8px;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  font-size: 12px;
  font-family: inherit;
}

.brp-nav {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.brp-timeline {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.brp-tl-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid transparent;
}

.brp-tl-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.brp-tl-item.current {
  border-color: rgba(224, 169, 109, 0.3);
  background: rgba(224, 169, 109, 0.07);
}

.brp-tl-item.decision .brp-tl-dot {
  filter: drop-shadow(0 0 4px rgba(224, 169, 109, 0.5));
}

.brp-tl-dot {
  font-size: 13px;
  flex-shrink: 0;
}

.brp-tl-label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.brp-tl-idx {
  font-size: 10px;
  opacity: 0.4;
  flex-shrink: 0;
}

.brp-decision-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.brp-decision {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(224, 169, 109, 0.05);
  border: 1px solid rgba(224, 169, 109, 0.12);
  cursor: pointer;
  font-size: 12px;
}

.brp-decision:hover {
  background: rgba(224, 169, 109, 0.09);
}

.brp-decision-dot {
  color: #e0a96d;
  font-size: 11px;
  flex-shrink: 0;
}

.brp-decision-text {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.brp-marker-add {
  display: flex;
  gap: 8px;
}

.brp-marker-add .brp-input {
  flex: 1;
}

.brp-marker-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.brp-marker {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid transparent;
  font-size: 12px;
}

.brp-marker-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  border-radius: 50%;
}

.brp-marker-label {
  flex: 1;
  min-width: 0;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.brp-marker-label:hover {
  color: #e0a96d;
}

.brp-marker-event {
  font-size: 10px;
  opacity: 0.45;
  flex-shrink: 0;
}

.brp-marker-del {
  cursor: pointer;
  opacity: 0.4;
  font-size: 12px;
  flex-shrink: 0;
}

.brp-marker-del:hover {
  opacity: 1;
}
</style>
