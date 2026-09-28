<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance constitution-editor-page">
    <!-- 氛围背景 -->
    <div data-enter class="ce-atmosphere">
      <div class="atmos-glow"></div>
    </div>

    <RoomLayout title="宪法编辑器" subtitle="修改弹性宪法（第3-52条）· 默认开启 · 用户可关闭" data-enter>

    <!-- 序言 / 第1-2条（只读，锁定） -->
    <section data-enter class="ce-preamble-section">
      <div class="section-header">
        <div class="section-header-icon">&#9878;</div>
        <div>
          <h2 class="section-title">序言</h2>
          <span class="section-subtitle">内核级宪法 · 第1-2条 · 强制·不可关闭</span>
        </div>
      </div>
      <div class="locked-articles">
        <div
          v-for="article in lockedArticles"
          :key="article.id"
          class="locked-article-card"
        >
          <div class="locked-article-header">
            <span class="locked-article-number">第{{ article.id }}条</span>
            <span class="locked-badge">
              <span class="lock-icon">&#128274;</span>
              内核级锁定
            </span>
          </div>
          <h3 class="locked-article-title">{{ article.title }}</h3>
          <p class="locked-article-content">{{ article.description }}</p>
        </div>
      </div>
    </section>

    <!-- 弹性条款 · 第3-52条（可编辑） -->
    <section class="ce-editable-section">
      <div class="section-header">
        <div class="section-header-icon">&#9776;</div>
        <div>
          <h2 class="section-title">弹性条款</h2>
            <span class="section-subtitle">
              第3条 — 第52条 · 可编辑 · 可选·可关闭
            </span>
        </div>
        <div class="section-header-actions">
          <button
            class="stylus-btn stylus-btn-primary"
            :disabled="saving"
            @click="handleSave"
          >
            <span class="stylus-icon">{{ saving ? '&#8635;' : '&#10003;' }}</span>
            <span class="stylus-label">{{ saving ? '保存中...' : '保存修改' }}</span>
          </button>
        </div>
      </div>

      <!-- 空状态提示 -->
      <EmptyState v-if="editableArticles.length === 0" icon="✏️" title="暂无条款数据" hint="请先初始化宪法数据" :glow="false" cta-label="" />

      <!-- 可编辑条款列表 -->
      <div class="articles-list">
        <div
          v-for="article in editableArticles"
          :key="article.id"
          class="article-card"
        >
          <div class="article-header">
            <span class="article-number">第{{ article.id }}条</span>
            <label class="article-title-label" :for="`article-${article.id}`">
              {{ article.title }}
            </label>
            <span
              class="runtime-badge"
              :class="article.runtimeActive ? 'is-active' : 'is-declarative'"
              :title="article.runtimeActive ? '该条款的效果目标已被运行时真实消费' : '该条款当前为声明式，开关不改变运行时行为'"
            >
              {{ article.runtimeActive ? '生效中 · 接回运行时' : '声明式 · 不影响运行时' }}
            </span>
          </div>
          <textarea
            :id="`article-${article.id}`"
            class="article-textarea"
            :value="article.description"
            @input="handleArticleChange(article.id, $event)"
            rows="4"
            placeholder="输入条款内容..."
          ></textarea>
        </div>
      </div>

      <!-- 运行时生效图例 -->
      <p class="runtime-legend">
        <span class="legend-item">
          <span class="legend-dot legend-dot-active"></span>生效中 = 开关真实改变运行时
        </span>
        <span class="legend-item">
          <span class="legend-dot legend-dot-declarative"></span>声明式 = 宪法承诺，尚未接回运行时
        </span>
      </p>
    </section>

    <!-- 立法厅 · 用户条款（INCR-258 补挂载孤儿组件：条款增删改 · 修订工作流 · 冲突检测） -->
    <ClauseEditorPanel />

    <!-- 底部保存栏 -->
    <footer data-enter class="ce-footer">
      <button
        class="stylus-btn stylus-btn-save"
        :disabled="saving"
        @click="handleSave"
      >
        <span class="stylus-icon">{{ saving ? '&#8635;' : '&#10003;' }}</span>
        <span class="stylus-label">{{ saving ? '保存中...' : '保存全部修改' }}</span>
      </button>
    </footer>
  </RoomLayout>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { showToast } from '../modules/toast'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useConstitutionStore } from '../stores/constitution'
import { ruleHasRuntimeEffect } from '../engine/constitution-effects'
import ClauseEditorPanel from '../components/ClauseEditorPanel.vue'
import RoomLayout from '../components/RoomLayout.vue'
import EmptyState from '../components/EmptyState.vue'

const { entranceRef, entranceClass } = useViewEntrance()
const store = useConstitutionStore()
const { immutableRules, mutableRules } = storeToRefs(store)

// ============================================================
// 可编辑规则描述（本地副本，用于 textarea 双向绑定）
// ============================================================
// 以 articleNumber 为 key 存储编辑中的描述文本
const editedDescriptions = ref<Record<string, string>>({})

// 初始化编辑描述（从 mutableRules 加载）
function initEditDescriptions() {
  const map: Record<string, string> = {}
  for (const rule of mutableRules.value) {
    if (rule.articleNumber !== undefined) {
      map[String(rule.articleNumber)] = rule.description
    } else {
      map[rule.id] = rule.description
    }
  }
  editedDescriptions.value = map
}
initEditDescriptions()

// ============================================================
// 锁定的条款（不可变规则，只读）
// ============================================================
const lockedArticles = computed(() =>
  immutableRules.value.map((rule, idx) => ({
    id: idx + 1,
    title: rule.title,
    description: rule.description,
    icon: rule.icon,
  }))
)

// 可编辑的条款（按 articleNumber 排序）
const editableArticles = computed(() =>
  [...mutableRules.value]
    .sort((a, b) => (a.articleNumber ?? 999) - (b.articleNumber ?? 999))
    .map((rule) => ({
      id: rule.articleNumber ?? 0,
      ruleId: rule.id,
      title: rule.title,
      description: editedDescriptions.value[rule.articleNumber !== undefined ? String(rule.articleNumber) : rule.id] ?? rule.description,
      // 宪法之实：该条款是否接回运行时（效果目标被 complianceOverride / CSS 变量真实消费）。
      // false 表示「声明式」——开关当前不改变产品行为，避免用户误以为所有开关都生效。
      runtimeActive: ruleHasRuntimeEffect(rule.id),
    }))
)

// ============================================================
// 状态
// ============================================================
const saving = ref(false)

// ============================================================
// 事件处理
// ============================================================
function handleArticleChange(articleNumber: number, event: Event) {
  const target = event.target as HTMLTextAreaElement
  editedDescriptions.value[String(articleNumber)] = target.value
}

async function handleSave() {
  saving.value = true
  try {
    for (const rule of mutableRules.value) {
      const key = rule.articleNumber !== undefined ? String(rule.articleNumber) : rule.id
      const newDesc = editedDescriptions.value[key]
      if (newDesc !== undefined && newDesc !== rule.description) {
        store.updateRule(rule.id, { description: newDesc })
      }
    }
    showToast('宪法修改已保存', 'success')
  } catch {
    showToast('保存失败，请重试', 'error')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
/* ============================================================
   ConstitutionEditor — 暖色暗色主题
   ============================================================ */

.constitution-editor-page {
  max-width: 840px;
  margin: 0 auto;
  position: relative;
  min-height: 100%;
}

:deep(.room-layout) {
  position: relative;
  z-index: 1;
}

/* ---- 氛围背景 ---- */
.ce-atmosphere {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.atmos-glow {
  position: absolute;
  top: -20%;
  left: 15%;
  width: 70%;
  height: 60%;
  background: radial-gradient(
    ellipse at center,
    rgba(var(--accent-rgb), 0.06) 0%,
    transparent 65%
  );
  animation: breathe 6s ease-in-out infinite;
}


/* ---- 通用 section ---- */
.section-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
}

.section-header-icon {
  font-size: 20px;
  color: var(--accent);
  opacity: 0.5;
  margin-top: 2px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-heading-zh);
  letter-spacing: 1px;
}

.section-subtitle {
  font-size: 12px;
  color: var(--text-secondary);
  display: block;
  margin-top: 4px;
}

.section-header-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-left: auto;
}

/* ---- 锁定条款（第1-2条） ---- */
.ce-preamble-section {
  margin-bottom: 56px;
  position: relative;
  z-index: 1;
}

.locked-articles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.locked-article-card {
  position: relative;
  padding: 28px 24px 24px;
  border-radius: var(--radius-lg);
  background: linear-gradient(
    160deg,
    rgba(var(--bg-card-rgb), 0.5) 0%,
    rgba(26, 22, 18, 0.7) 100%
  );
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  overflow: hidden;
}

.locked-article-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(180, 160, 140, 0.4),
    transparent
  );
  opacity: 0.3;
}

.locked-article-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.locked-article-number {
  font-size: 11px;
  color: var(--accent);
  opacity: 0.5;
  letter-spacing: 2px;
  font-family: var(--font-heading-zh);
}

.locked-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  padding: 3px 10px;
  border-radius: 4px;
  background: rgba(180, 160, 140, 0.08);
  color: var(--text-secondary);
  letter-spacing: 1px;
  opacity: 0.6;
}

.lock-icon {
  font-size: 10px;
}

.locked-article-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 8px;
  font-family: var(--font-heading-zh);
}

.locked-article-content {
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
  opacity: 0.7;
}

/* ---- 可编辑条款 ---- */
.ce-editable-section {
  margin-bottom: 48px;
  position: relative;
  z-index: 1;
}

.articles-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.article-card {
  padding: 20px 24px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.3);
  border: 1px solid var(--border-color);
  transition: all var(--transition);
}

.article-card:hover {
  background: rgba(55, 48, 40, 0.4);
  border-color: rgba(var(--accent-rgb), 0.15);
}

.article-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.article-number {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  white-space: nowrap;
  font-family: var(--font-heading-zh);
  min-width: 65px;
}

.article-title-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  cursor: default;
}

/* ---- 运行时生效徽标 ---- */
.runtime-badge {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 10px;
  line-height: 1;
  padding: 4px 10px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  white-space: nowrap;
  border: 1px solid transparent;
  align-self: center;
}

.runtime-badge.is-active {
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.12);
  border-color: rgba(var(--accent-rgb), 0.25);
}

.runtime-badge.is-declarative {
  color: var(--text-secondary);
  background: rgba(var(--bg-card-rgb), 0.4);
  border-color: var(--border-color);
  opacity: 0.8;
}

/* ---- 图例 ---- */
.runtime-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin: -8px 0 24px;
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.legend-dot-active {
  background: var(--accent);
  box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.15);
}

.legend-dot-declarative {
  background: var(--border-color);
  box-shadow: 0 0 0 3px rgba(var(--bg-card-rgb), 0.4);
}

.article-textarea {
  font-family: inherit;
  font-size: 14px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-primary);
  outline: none;
  resize: vertical;
  min-height: 80px;
  line-height: 1.7;
  transition: border-color var(--transition);
  box-sizing: border-box;
}

.article-textarea:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.06);
}

.article-textarea::placeholder {
  color: var(--text-secondary);
  opacity: 0.5;
}

/* ---- 按钮样式 ---- */
.stylus-btn {
  font-size: 13px;
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  cursor: pointer;
  transition: all var(--transition);
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  color: var(--text-secondary);
}

.stylus-btn:hover {
  background: rgba(var(--bg-card-rgb), 0.5);
  color: var(--text-primary);
  border-color: rgba(var(--accent-rgb), 0.2);
}

.stylus-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stylus-btn-primary {
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.2);
}

.stylus-btn-primary:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.2);
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.35);
}

.stylus-icon {
  font-size: 16px;
  font-weight: 300;
}

/* ---- 底部保存栏 ---- */
.ce-footer {
  display: flex;
  justify-content: center;
  padding: 32px 0 0;
  position: relative;
  z-index: 1;
}

.stylus-btn-save {
  font-size: 15px;
  padding: 14px 48px;
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  border-radius: 12px;
  cursor: pointer;
  transition: all var(--transition);
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
}

.stylus-btn-save:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.2);
  border-color: rgba(var(--accent-rgb), 0.4);
  box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.08);
}

.stylus-btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ---- 动画 ---- */
@keyframes breathe {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

/* ---- 响应式 ---- */

@media (max-width: 640px) {
  .locked-articles {
    grid-template-columns: 1fr;
  }

  .section-header {
    flex-direction: column;
    gap: 12px;
  }

  .section-header-actions {
    margin-left: 0;
  }
}

@media (max-width: 480px) {
  .locked-articles {
    grid-template-columns: 1fr;
  }
}

/* ---- 入场动画 ---- */
.view-entrance .enter-from {
  opacity: 0;
  transform: translateY(16px);
}

.view-entrance .enter-to {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.5s ease-out, transform 0.5s ease-out;
}
</style>