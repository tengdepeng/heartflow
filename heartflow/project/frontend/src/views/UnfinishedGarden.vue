<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance unfinished">
    <!-- 装饰性头部 -->
    <div data-enter class="header-ornament">
      <span class="orn-line"></span>
      <span class="orn-diamond">✦</span>
      <span class="orn-line"></span>
    </div>
    <p class="kicker">它们没有结束，只是暂时在这里停一停</p>
    <h1 class="title">未完成花园</h1>
    <p class="uf-summary" data-enter>🌫 {{ lightDots.length }} 枚光点漂浮 · 共 {{ items.length }} 件未完成 · ✅ {{ completedItems.length }} 件已完成</p>

    <!-- 统计概览 -->
    <div data-enter class="stats-row">
      <div class="stat-card">
        <span class="stat-num">{{ dormantSeeds.length }}</span>
        <span class="stat-label">搁置种子</span>
      </div>
      <div class="stat-card">
        <span class="stat-num">{{ books.length }}</span>
        <span class="stat-label">未读完的书</span>
      </div>
      <div class="stat-card">
        <span class="stat-num">{{ drafts.length }}</span>
        <span class="stat-label">半截笔记</span>
      </div>
      <div class="stat-card accent">
        <span class="stat-num">{{ longestDormantDays }}<span class="stat-unit">天</span></span>
        <span class="stat-label">最久未完成</span>
      </div>
    </div>

    <!-- 自动浮现的光点（蓝图附录E 自动流转） -->
    <section data-enter><h3>🌫 自动浮现的光点</h3>
      <div v-if="lightDots.length" class="light-dots">
        <div v-for="dot in lightDots" :key="dot.id" class="light-dot" :class="'kind-' + dot.kind">
          <div class="dot-head">
            <span class="dot-source">{{ dot.source }}</span>
            <span class="dot-hint">{{ dot.hint }}</span>
          </div>
          <div class="dot-label">{{ dot.label }}</div>
          <div class="dot-actions">
            <button class="dot-adopt" @click="adoptDot(dot)">收为卡片</button>
            <button v-if="dot.kind === 'goal-dormant'" class="dot-act" @click="wakeGoalFromDot(dot)">唤醒</button>
            <button v-if="dot.kind === 'goal-sunken'" class="dot-act" @click="reviveDreamFromDot(dot)">复苏</button>
          </div>
        </div>
      </div>
      <p v-else class="empty-hint">暂时没有从留光阁或心锚漂来的光点</p>
    </section>

    <!-- 搁置的种子 -->
    <section data-enter><h3>🌰 搁置的种子</h3>
      <div v-if="dormantSeeds.length" class="item-list">
        <div v-for="s in dormantSeeds" :key="s.id" class="item-card">
          <span>{{ s.sprouted ? '🌿' : '🌰' }}</span>
          <span class="item-text">{{ s.text }}</span>
          <span class="item-dormant-badge">搁置{{ daysSince(s.dormantSince || s.at) }}天</span>
          <button class="item-revive" @click="confirmRevive(s)">重新激活</button>
          <button class="uf-del" @click="removeSeed(s.id)">×</button>
        </div>
      </div>
      <p v-else class="empty">这里暂时没有搁置的种子</p>
    </section>

    <!-- 开了头的书 -->
    <section data-enter><h3>📖 开了头的书</h3>
      <div class="add-row">
        <input v-model="bookText" placeholder="留下一本书的名字…" @keyup.enter="addBook" class="uf-input" />
        <button @click="addBook" class="uf-btn">+</button>
      </div>
      <div v-if="sortedBooks.length" class="item-list">
        <div v-for="b in sortedBooks" :key="b.id" class="item-card">
          <span>📖</span>
          <div class="item-info">
            <span class="item-text">{{ b.text }}</span>
            <span class="item-note clickable" @click.stop="editProgress(b)">进度：{{ b.progress || '开头' }}</span>
          </div>
          <span class="status-tag" :class="b.status || 'active'" @click="cycleBookStatus(b)">{{ statusLabel(b.status) }}</span>
          <button class="uf-del" @click="removeBook(b.id)">×</button>
        </div>
      </div>
      <p v-else class="empty">还没有开了头的书……</p>
    </section>

    <!-- 写了一半的笔记 -->
    <section data-enter><h3>✍️ 写了一半的笔记</h3>
      <div v-if="drafts.length" class="item-list">
        <div v-for="d in drafts" :key="d.id" class="item-card">
          <span>📝</span>
          <div class="item-info">
            <span v-if="editingDraftId !== d.id" class="item-text clickable" @click="startInlineEdit(d)">{{ d.text.slice(0, 50) || '还没有内容' }}</span>
            <input
              v-else
              v-model="draftEditText"
              class="inline-edit-input"
              @blur="finishInlineEdit(d)"
              @keyup.enter="finishInlineEdit(d)"
              @keyup.escape="cancelInlineEdit"
            />
            <span class="item-date">{{ fmt(d.at) }}</span>
          </div>
          <button class="status-toggle" :class="{ done: d.completed }" @click="toggleDraftComplete(d)" :title="d.completed ? '标记为未完成' : '标记为已完成'">
            {{ d.completed ? '✓' : '○' }}
          </button>
          <button class="uf-del" @click="removeDraft(d.id)">×</button>
        </div>
      </div>
      <div class="add-row">
        <input v-model="draftText" placeholder="留下一点片段…" @keyup.enter="addDraft" class="uf-input" />
        <button @click="addDraft" class="uf-btn">+</button>
      </div>
    </section>

    <!-- 完成清单 -->
    <section data-enter><h3>✅ 已完成</h3>
      <div v-if="completedItems.length" class="item-list">
        <div v-for="c in completedItems" :key="c.id" class="item-card completed-card">
          <span>{{ c.type === 'seed' ? '🌰' : c.type === 'book' ? '📖' : '📝' }}</span>
          <span class="item-text line-through">{{ c.text }}</span>
          <span class="item-date">{{ fmt(c.completedAt || c.at) }}</span>
          <button class="uf-del" @click="uncompleteItem(c.id)" title="移回未完成">↩</button>
        </div>
      </div>
      <p v-else class="empty">还没有完成的项目，继续加油</p>
    </section>

    <!-- 清理按钮 -->
    <div class="cleanup-row">
      <button class="uf-btn cleanup-btn" @click="confirmCleanup">清理搁置超过 30 天的种子</button>
    </div>

    <!-- 手动放入未完成花园（蓝图附录E：任意房间入口） -->
    <div class="place-row">
      <span class="place-label">放入未完成花园</span>
      <select v-model="placeType" class="uf-place-select">
        <option value="seed">种子</option>
        <option value="book">书</option>
        <option value="draft">笔记</option>
      </select>
      <input v-model="placeText" class="uf-place-input" placeholder="写下一件未完成的事…" @keyup.enter="placeItem" />
      <button class="uf-place-btn" @click="placeItem">放入</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useGoal } from '../modules/goal'
import {
  collectLightDots,
  placeInUnfinishedGarden,
  adoptLightDot,
  useUnfinished,
  type LightDot,
  type UItemType,
  type UItem,
} from '../modules/unfinished'

const { entranceRef, entranceClass } = useViewEntrance()

// 蓝图附录E：留光阁休眠/沉梦目标 + 逐日心锚反复推迟锚点 → 半透明光点
const goal = useGoal()
const lightDots = computed<LightDot[]>(() => collectLightDots())

// ---- 未完成花园数据层（事项 + 种子） ----
const uf = useUnfinished()
const { items, seeds } = uf
onMounted(uf.load)

// ============== 计算属性 ==============

const dormantSeeds = computed(() =>
  items.value.filter(i => i.type === 'seed' && !i.completed)
)

const books = computed(() =>
  items.value.filter(i => i.type === 'book' && !i.completed)
)

const drafts = computed(() =>
  items.value.filter(i => i.type === 'draft' && !i.completed)
)

const completedItems = computed(() =>
  items.value
    .filter(i => i.completed)
    .sort((a, b) => {
      const da = a.completedAt || a.at
      const db = b.completedAt || b.at
      return db.localeCompare(da)
    })
)

const sortedBooks = computed(() =>
  [...books.value].sort((a, b) => {
    const ua = a.updatedAt || a.at
    const ub = b.updatedAt || b.at
    return ub.localeCompare(ua)
  })
)

const longestDormantDays = computed(() => {
  if (items.value.length === 0) return 0
  const now = Date.now()
  let max = 0
  for (const item of items.value) {
    const date = new Date(item.dormantSince || item.at).getTime()
    const days = Math.floor((now - date) / (1000 * 60 * 60 * 24))
    if (days > max) max = days
  }
  return max
})

// ============== 工具函数 ==============

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

function fmt(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// ============== 自动光点 & 手动放入 ==============

/** 手动"放入未完成花园"（蓝图附录E：任意房间可写入） */
const placeText = ref('')
const placeType = ref<UItemType>('seed')

function placeItem() {
  const t = placeText.value.trim()
  if (!t) return
  placeInUnfinishedGarden(t, placeType.value)
  uf.load()
  placeText.value = ''
}

/** 将一条自动光点收编为正式卡片 */
function adoptDot(dot: LightDot) {
  adoptLightDot(dot)
  uf.load()
}

/** 唤醒休眠目标（让其离开光点列表，回到留光阁活跃态） */
function wakeGoalFromDot(dot: LightDot) {
  if (dot.relatedId) goal.toggleDormant(dot.relatedId)
}

/** 从旧梦潭复苏目标 */
function reviveDreamFromDot(dot: LightDot) {
  if (dot.relatedId) goal.reviveFromPool(dot.relatedId)
}

// ============== 种子操作 ==============

function confirmRevive(s: UItem) {
  if (confirm(`重新激活「${s.text}」？它将回到成长庭院。`)) {
    reviveSeed(s)
  }
}

function reviveSeed(s: UItem) {
  uf.loadSeeds()
  seeds.value.unshift({
    id: `s${Date.now()}`,
    text: s.text,
    sprouted: s.sprouted || false,
    at: new Date().toISOString()
  })
  uf.saveSeeds()
  items.value = items.value.filter(i => i.id !== s.id)
  uf.save()
}

function removeSeed(id: string) {
  items.value = items.value.filter(i => i.id !== id)
  uf.save()
}

// ============== 书籍操作 ==============

const bookText = ref('')

function addBook() {
  const t = bookText.value.trim()
  if (!t) return
  const now = new Date().toISOString()
  items.value.unshift({
    id: `uf${Date.now()}`,
    type: 'book',
    text: t,
    progress: '开头',
    status: 'active',
    at: now,
    updatedAt: now
  })
  uf.save()
  bookText.value = ''
}

function removeBook(id: string) {
  items.value = items.value.filter(i => i.id !== id)
  uf.save()
}

function editProgress(b: UItem) {
  const n = prompt('更新阅读进度（例如：第3章、45%）：', b.progress || '开头')
  if (n !== null) {
    b.progress = n
    b.updatedAt = new Date().toISOString()
    uf.save()
  }
}

function cycleBookStatus(b: UItem) {
  const order: Array<'active' | 'paused' | 'abandoned'> = ['active', 'paused', 'abandoned']
  const idx = order.indexOf(b.status || 'active')
  b.status = order[(idx + 1) % order.length]
  b.updatedAt = new Date().toISOString()
  uf.save()
}

function statusLabel(s?: string): string {
  if (s === 'paused') return '暂停'
  if (s === 'abandoned') return '放弃'
  return '在读'
}

// ============== 笔记操作 ==============

const draftText = ref('')
const editingDraftId = ref<string | null>(null)
const draftEditText = ref('')
const draftEditBackup = ref('')

function addDraft() {
  const t = draftText.value.trim()
  if (!t) return
  const now = new Date().toISOString()
  items.value.unshift({
    id: `uf${Date.now()}`,
    type: 'draft',
    text: t,
    at: now,
    updatedAt: now
  })
  uf.save()
  draftText.value = ''
}

function removeDraft(id: string) {
  items.value = items.value.filter(i => i.id !== id)
  uf.save()
}

function startInlineEdit(d: UItem) {
  editingDraftId.value = d.id
  draftEditText.value = d.text
  draftEditBackup.value = d.text
  nextTick(() => {
    const el = document.querySelector('.inline-edit-input') as HTMLInputElement | null
    if (el) { el.focus(); el.select() }
  })
}

function finishInlineEdit(d: UItem) {
  if (editingDraftId.value !== d.id) return
  const trimmed = draftEditText.value.trim()
  d.text = trimmed || draftEditBackup.value
  d.updatedAt = new Date().toISOString()
  editingDraftId.value = null
  uf.save()
}

function cancelInlineEdit() {
  editingDraftId.value = null
}

function toggleDraftComplete(d: UItem) {
  d.completed = !d.completed
  if (d.completed) {
    d.completedAt = new Date().toISOString()
  } else {
    d.completedAt = undefined
  }
  uf.save()
}

// ============== 完成清单操作 ==============

function uncompleteItem(id: string) {
  const item = items.value.find(i => i.id === id)
  if (item) {
    item.completed = false
    item.completedAt = undefined
    uf.save()
  }
}

// ============== 清理操作 ==============

function confirmCleanup() {
  const targets = items.value.filter(
    i => i.type === 'seed' && !i.completed && daysSince(i.dormantSince || i.at) > 30
  )
  if (targets.length === 0) {
    alert('没有需要清理的搁置种子')
    return
  }
  const names = targets.map(t => `「${t.text}」`).join('、')
  if (confirm(`确定要删除以下 ${targets.length} 个搁置超过 30 天的种子吗？此操作不可撤销。\n${names}`)) {
    const targetIds = new Set(targets.map(t => t.id))
    items.value = items.value.filter(i => !targetIds.has(i.id))
    uf.save()
  }
}
</script>

<style scoped>
/* ========== 深夜食堂 · 暖琥珀主题 ========== */

:root {
  --amber-accent: var(--accent);
  --amber-text: var(--text-high);
  --amber-text-secondary: var(--text-secondary);
  --amber-text-muted: var(--text-secondary);
  --amber-border: rgba(var(--accent-rgb), 0.12);
  --amber-card-bg: var(--bg-card);
  --amber-card-hover: rgba(55, 48, 40, 0.7);
  --amber-glow: rgba(var(--accent-rgb), 0.06);
}

.unfinished {
  position: relative;
  z-index: 1;
  max-width: 500px;
  margin: 0 auto;
  padding: 48px 32px 80px;
  min-height: 100%;
  overflow-y: auto;
  background: transparent;
  color: var(--amber-text);
}

/* 左右环境光晕 */
.unfinished::before,
.unfinished::after {
  content: '';
  position: fixed;
  top: 0;
  width: 320px;
  height: 100dvh;
  pointer-events: none;
  z-index: -1;
}
.unfinished::before {
  left: 0;
  background: radial-gradient(ellipse 320px 100% at 0% 50%, rgba(var(--accent-rgb), 0.07) 0%, transparent 70%);
}
.unfinished::after {
  right: 0;
  background: radial-gradient(ellipse 320px 100% at 100% 50%, rgba(var(--accent-rgb), 0.05) 0%, transparent 70%);
}

/* ========== 装饰性头部 ========== */

.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 14px;
}
.orn-line {
  display: block;
  width: 50px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.2), transparent);
}
.orn-diamond {
  font-size: 8px;
  color: var(--accent);
  opacity: 0.35;
}

.kicker {
  text-align: center;
  font-size: 12px;
  color: var(--amber-text-muted);
  letter-spacing: 3px;
  margin-bottom: 8px;
}

.title {
  text-align: center;
  font-size: 24px;
  font-weight: 500;
  font-family: var(--font-heading-zh);
  letter-spacing: 4px;
  color: var(--amber-text);
  margin-bottom: 24px;
}

.uf-summary {
  text-align: center;
  font-size: 12px;
  color: var(--amber-text-muted);
  margin: -16px 0 24px;
  letter-spacing: 0.5px;
}

/* ========== 统计概览 ========== */

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 28px;
}
.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 12px 4px;
  border-radius: 10px;
  background: var(--amber-card-bg);
  border: 1px solid var(--amber-border);
}
.stat-card.accent {
  border-color: rgba(var(--accent-rgb), 0.25);
  background: rgba(var(--bg-card-rgb), 0.75);
}
.stat-num {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: var(--amber-text);
}
.stat-card.accent .stat-num { color: var(--amber-accent); }
.stat-unit { font-size: 12px; font-weight: 400; opacity: 0.5; margin-left: 1px; }
.stat-label { font-size: 10px; color: var(--amber-text-secondary); white-space: nowrap; }

/* ========== 通用 section ========== */

section { margin-bottom: 28px; }
section h3 { font-size: 14px; color: var(--amber-text-secondary); margin-bottom: 10px; }

/* ========== 列表与卡片 ========== */

.item-list { display: flex; flex-direction: column; gap: 6px; }
.item-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--amber-card-bg);
  border: 1px solid var(--amber-border);
  cursor: default;
  transition: all 0.25s;
}
.item-card:hover {
  background: var(--amber-card-hover);
  border-color: rgba(var(--accent-rgb), 0.2);
}
.item-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.item-text { font-size: 13px; color: var(--amber-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-text.clickable { cursor: pointer; }
.item-text.clickable:hover { color: var(--amber-accent); }
.item-note { font-size: 11px; color: var(--amber-text-muted); }
.item-note.clickable { cursor: pointer; }
.item-note.clickable:hover { color: var(--amber-accent); opacity: 0.9; }
.item-date { font-size: 11px; color: var(--amber-text-muted); margin-left: auto; white-space: nowrap; }

/* ========== 搁置种子 ========== */

.item-dormant-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--amber-accent);
  white-space: nowrap;
  opacity: 0.7;
}
.item-revive {
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.06);
  color: var(--amber-accent);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.item-revive:hover { background: rgba(var(--accent-rgb), 0.15); }

/* ========== 书籍状态标签 ========== */

.status-tag {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  user-select: none;
}
.status-tag.active {
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--amber-accent);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
}
.status-tag.paused {
  background: rgba(232, 184, 96, 0.08);
  color: #e8b860;
  border: 1px solid rgba(232, 184, 96, 0.15);
}
.status-tag.abandoned {
  background: rgba(255, 120, 90, 0.08);
  color: #ff785a;
  border: 1px solid rgba(255, 120, 90, 0.15);
}

/* ========== 内联编辑 ========== */

.inline-edit-input {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid var(--amber-accent);
  border-radius: 6px;
  background: rgba(var(--bg-card-rgb), 0.8);
  color: var(--amber-text);
  font-size: 13px;
  font-family: inherit;
  outline: none;
}
.inline-edit-input:focus {
  border-color: var(--amber-accent);
  box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.12);
}

/* ========== 笔记完成切换 ========== */

.status-toggle {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid var(--amber-border);
  background: transparent;
  color: var(--amber-text-muted);
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}
.status-toggle:hover { border-color: var(--amber-accent); color: var(--amber-accent); }
.status-toggle.done {
  background: rgba(var(--accent-rgb), 0.1);
  border-color: rgba(var(--accent-rgb), 0.3);
  color: var(--amber-accent);
}

/* ========== 已完成清单 ========== */

.completed-card { opacity: 0.45; }
.completed-card:hover { opacity: 0.7; }
.line-through { text-decoration: line-through; }

/* ========== 删除按钮 ========== */

.uf-del {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--amber-text-muted);
  cursor: pointer;
  opacity: 0;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}
.item-card:hover .uf-del { opacity: 1; }
.uf-del:hover { color: #ff785a; }

/* ========== 输入控件 ========== */

.add-row { display: flex; gap: 6px; margin-bottom: 10px; }
.uf-input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid var(--amber-border);
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.5);
  color: var(--amber-text);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}
.uf-input:focus {
  border-color: rgba(var(--accent-rgb), 0.3);
  box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.06);
}
.uf-input::placeholder {
  color: var(--amber-text-muted);
}
.uf-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--amber-accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.uf-btn:hover {
  background: rgba(var(--accent-rgb), 0.18);
  border-color: rgba(var(--accent-rgb), 0.35);
}

/* ========== 清理按钮 ========== */

.cleanup-row { text-align: center; margin-top: 12px; padding-top: 20px; border-top: 1px solid var(--amber-border); }
.cleanup-btn {
  border-color: rgba(255, 120, 90, 0.2) !important;
  background: rgba(255, 120, 90, 0.04) !important;
  color: rgba(255, 120, 90, 0.6) !important;
  font-size: 12px !important;
}
.cleanup-btn:hover { background: rgba(255, 120, 90, 0.1) !important; color: #ff785a !important; }

/* ========== 空状态 ========== */

.empty { font-size: 13px; color: var(--amber-text-muted); padding: 8px 0; }

/* ========== 自动光点（纸隐喻 · 半透明） ========== */

.light-dots { display: flex; flex-direction: column; gap: 8px; }
.light-dot {
  position: relative;
  padding: 12px 14px;
  border-radius: 10px;
  /* 泛黄旧纸：低透明度，随缘浮现 */
  background: linear-gradient(135deg, rgba(232, 211, 162, 0.14), rgba(180, 160, 120, 0.08));
  border: 1px solid rgba(232, 211, 162, 0.18);
  box-shadow: inset 0 0 18px rgba(232, 211, 162, 0.06);
  opacity: 0.62;
  transform: rotate(-0.4deg);
  transition: all 0.3s;
}
.light-dot:nth-child(even) { transform: rotate(0.5deg); }
.light-dot:hover {
  opacity: 0.92;
  border-color: rgba(232, 211, 162, 0.4);
  transform: rotate(0deg);
}
/* 来源色：休眠=琥珀，沉梦=靛蓝，漂移=灰青 */
.kind-goal-dormant { border-left: 3px solid rgba(232, 184, 96, 0.5); }
.kind-goal-sunken { border-left: 3px solid rgba(120, 150, 200, 0.5); }
.kind-anchor-drift { border-left: 3px solid rgba(150, 170, 170, 0.5); }

.dot-head { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
.dot-source { font-size: 10px; color: var(--amber-text-muted); letter-spacing: 0.5px; }
.dot-hint { font-size: 10px; color: rgba(232, 211, 162, 0.7); white-space: nowrap; }
.dot-label { font-size: 13px; color: var(--amber-text); margin-bottom: 8px; }
.dot-actions { display: flex; gap: 6px; }
.dot-adopt,
.dot-act {
  padding: 3px 9px;
  border-radius: 6px;
  border: 1px solid rgba(232, 211, 162, 0.22);
  background: rgba(232, 211, 162, 0.06);
  color: var(--amber-text-secondary);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.dot-adopt:hover { background: rgba(232, 211, 162, 0.18); color: var(--amber-accent); }
.dot-act:hover { background: rgba(var(--accent-rgb), 0.18); color: var(--amber-accent); border-color: rgba(var(--accent-rgb), 0.35); }

.empty-hint { font-size: 12px; color: var(--amber-text-muted); padding: 12px 0; opacity: 0.7; font-style: italic; }

/* ========== 手动放入表单 ========== */

.place-row {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 16px;
  padding: 14px;
  border-radius: 10px;
  background: var(--amber-card-bg);
  border: 1px dashed rgba(var(--accent-rgb), 0.25);
}
.place-label { font-size: 12px; color: var(--amber-text-secondary); white-space: nowrap; }
.uf-place-select {
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid var(--amber-border);
  background: rgba(var(--bg-card-rgb), 0.5);
  color: var(--amber-text);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  cursor: pointer;
}
.uf-place-input {
  flex: 1;
  padding: 7px 10px;
  border: 1px solid var(--amber-border);
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.5);
  color: var(--amber-text);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  min-width: 0;
  transition: border-color 0.2s;
}
.uf-place-input:focus {
  border-color: rgba(var(--accent-rgb), 0.3);
  box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.06);
}
.uf-place-input::placeholder { color: var(--amber-text-muted); }
.uf-place-btn {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--amber-accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.uf-place-btn:hover { background: rgba(var(--accent-rgb), 0.18); border-color: rgba(var(--accent-rgb), 0.35); }

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (max-width: 860px) {
  .unfinished { padding: 32px 20px 64px; }
  .stats-row { grid-template-columns: repeat(2, 1fr); gap: 6px; }
  .stat-card { padding: 10px 4px; }
}

@media (max-width: 640px) {
  .unfinished { padding: 24px 14px 56px; }
  .stats-row { grid-template-columns: 1fr; gap: 6px; }
  .stat-card { flex-direction: row; justify-content: space-between; padding: 10px 14px; }
  .stat-card .stat-num { font-size: 16px; }
  .stat-card .stat-label { font-size: 11px; }
}
</style>