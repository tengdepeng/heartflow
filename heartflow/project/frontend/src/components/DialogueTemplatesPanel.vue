<template>
  <section class="dtp" aria-label="对话模板">
    <div class="dtp-head">
      <span class="dtp-title">🗣️ 对话模板</span>
      <span class="dtp-sub">模板 · 推荐 · 使用</span>
    </div>

    <!-- 意图学习统计（回收自 mirror/ 陈旧副本：useIntentFeedbackLearning 学习进度） -->
    <div v-if="learningStats.totalFeedback > 0" class="dtp-learn">
      <span class="dtp-learn-item">已学习 {{ learningStats.totalFeedback }} 条反馈</span>
      <span class="dtp-learn-item">修正率 {{ Math.round(learningStats.correctionRate * 100) }}%</span>
      <span class="dtp-learn-item">覆盖 {{ learningStats.intentCount }} 类意图</span>
    </div>

    <!-- 推荐模板（基于时段/星期） -->
    <div v-if="recommended.length" class="dtp-block">
      <div class="dtp-block-title">此刻推荐</div>
      <div class="dtp-rec-list">
        <button
          v-for="t in recommended"
          :key="t.id"
          class="dtp-rec"
          @click="useTemplate(t.type)"
        >
          <span class="dtp-rec-icon">{{ t.icon }}</span>
          <span class="dtp-rec-name">{{ t.name }}</span>
          <span class="dtp-rec-arrow">→</span>
        </button>
      </div>
    </div>

    <!-- 模板列表（点击卡片展开详情，回收自 mirror/ 陈旧副本的 .dtp-detail） -->
    <div class="dtp-block">
      <div class="dtp-block-title">全部模板</div>
      <div v-if="templates.length" class="dtp-list">
        <div v-for="t in templates" :key="t.id" class="dtp-tpl">
          <div class="dtp-tpl-head" @click="openTemplate(t)">
            <span class="dtp-tpl-icon">{{ t.icon }}</span>
            <span class="dtp-tpl-name">{{ t.name }}</span>
            <span class="dtp-tpl-count">使用 {{ t.usageCount }} 次</span>
          </div>
          <p class="dtp-tpl-desc">{{ t.description }}</p>
          <div v-if="t.expectedIntents.length" class="dtp-tpl-intents">
            <span v-for="intent in t.expectedIntents" :key="intent" class="dtp-intent">
              {{ intentLabel(intent) }}
            </span>
          </div>
          <div class="dtp-tpl-actions">
            <button class="dtp-btn" @click.stop="useTemplate(t.type)">使用此模板</button>
          </div>
        </div>
      </div>
      <p v-else class="dtp-empty">暂无模板。</p>
    </div>

    <!-- 模板详情（点击卡片展开：展示提示词 + 意图 + ✓使用，回收自 mirror/ 影子版） -->
    <div v-if="active" class="dtp-detail">
      <div class="dtp-detail-head">
        <span class="dtp-detail-icon">{{ active.icon }}</span>
        <div class="dtp-detail-info">
          <span class="dtp-detail-name">{{ active.name }}</span>
          <span class="dtp-detail-desc">{{ active.description }}</span>
        </div>
        <button class="dtp-close" @click="active = null" title="收起">×</button>
      </div>
      <div class="dtp-prompts">
        <p v-for="(p, i) in active.prompts" :key="i" class="dtp-prompt">
          <span class="dtp-prompt-idx">{{ i + 1 }}</span>{{ p }}
        </p>
      </div>
      <div class="dtp-detail-foot">
        <span v-if="active.expectedIntents.length" class="dtp-intents">
          <span v-for="it in active.expectedIntents" :key="it" class="dtp-intent">{{ intentLabel(it) }}</span>
        </span>
        <button class="dtp-use" @click="useTemplate(active.type)">✓ 使用此模板</button>
      </div>
    </div>

    <!-- 热门模板 -->
    <div v-if="popular.length" class="dtp-block">
      <div class="dtp-block-title">热门模板</div>
      <div class="dtp-pop-list">
        <div v-for="(t, i) in popular" :key="t.id" class="dtp-pop">
          <span class="dtp-pop-rank">{{ i + 1 }}</span>
          <span class="dtp-pop-icon">{{ t.icon }}</span>
          <span class="dtp-pop-name">{{ t.name }}</span>
          <span class="dtp-pop-count">{{ t.usageCount }} 次</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDialogueTemplates, useIntentFeedbackLearning } from '../modules/mirror/dialogue-persistence'
import { INTENT_INFO } from '../modules/mirror/intents'
import type { DialogueTemplate, DialogueTemplateType } from '../modules/mirror/dialogue-persistence'

const { templates, getRecommendedTemplates, recordUsage, popularTemplates } = useDialogueTemplates()
const learn = useIntentFeedbackLearning()

const recommended = computed(() => getRecommendedTemplates())
const popular = computed(() => popularTemplates.value)
const learningStats = computed(() => learn.learningStats.value)

const active = ref<DialogueTemplate | null>(null)

function intentLabel(intent: string): string {
  return INTENT_INFO[intent as keyof typeof INTENT_INFO]?.label ?? intent
}

function openTemplate(t: DialogueTemplate): void {
  active.value = t
}

function useTemplate(type: DialogueTemplateType): void {
  recordUsage(type)
  active.value = null
}
</script>

<style scoped>
.dtp {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 18px 20px;
  border-radius: 18px;
  background: rgba(14, 16, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
  width: 100%;
  max-width: 520px;
}

.dtp-head {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 10px;
}
.dtp-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}
.dtp-sub {
  font-size: 11px;
  letter-spacing: 1px;
  color: var(--text-low);
}

.dtp-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dtp-block-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--text-medium);
  text-align: center;
}

/* 推荐 */
.dtp-rec-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dtp-rec {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(196, 160, 184, 0.1);
  border: 1px solid rgba(196, 160, 184, 0.18);
  cursor: pointer;
  transition: background 0.2s ease;
}
.dtp-rec:hover {
  background: rgba(196, 160, 184, 0.18);
}
.dtp-rec-icon {
  font-size: 16px;
}
.dtp-rec-name {
  flex: 1;
  font-size: 12px;
  font-weight: 500;
  color: rgba(240, 242, 255, 0.85);
  text-align: left;
}
.dtp-rec-arrow {
  font-size: 12px;
  color: rgba(196, 160, 184, 0.7);
}

/* 模板列表 */
.dtp-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dtp-tpl {
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dtp-tpl-head {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.dtp-tpl-icon {
  font-size: 16px;
}
.dtp-tpl-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: rgba(240, 242, 255, 0.9);
}
.dtp-tpl-count {
  font-size: 10px;
  color: var(--text-low);
}
.dtp-tpl-desc {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-secondary);
}
.dtp-tpl-intents {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.dtp-intent {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  color: rgba(var(--accent-rgb), 0.75);
  background: rgba(var(--accent-rgb), 0.1);
}
/* 模板详情（回收自 mirror/ 影子版） */
.dtp-detail {
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(196, 160, 184, 0.06);
  border: 1px solid rgba(196, 160, 184, 0.18);
}
.dtp-detail-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.dtp-detail-icon {
  font-size: 22px;
}
.dtp-detail-info {
  flex: 1;
  min-width: 0;
}
.dtp-detail-name {
  display: block;
  font-size: 14px;
  color: rgba(240, 242, 255, 0.92);
}
.dtp-detail-desc {
  display: block;
  font-size: 11px;
  color: var(--text-medium);
}
.dtp-close {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: rgba(232, 236, 246, 0.6);
  font-size: 14px;
  cursor: pointer;
  flex-shrink: 0;
}
.dtp-close:hover {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.3);
}
.dtp-prompts {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
.dtp-prompt {
  margin: 0;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(240, 242, 255, 0.8);
}
.dtp-prompt-idx {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(196, 160, 184, 0.14);
  color: rgba(196, 160, 184, 0.9);
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dtp-detail-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.dtp-intents {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.dtp-use {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid rgba(196, 160, 184, 0.3);
  background: rgba(196, 160, 184, 0.14);
  color: rgba(240, 242, 255, 0.9);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s ease;
}
.dtp-use:hover {
  background: rgba(196, 160, 184, 0.22);
  border-color: rgba(196, 160, 184, 0.45);
}
.dtp-tpl-actions {
  display: flex;
  justify-content: flex-end;
}
.dtp-btn {
  font-size: 11px;
  padding: 6px 14px;
  border-radius: 10px;
  border: 1px solid rgba(196, 160, 184, 0.25);
  background: rgba(196, 160, 184, 0.12);
  color: rgba(240, 242, 255, 0.85);
  cursor: pointer;
  transition: background 0.2s ease;
}
.dtp-btn:hover {
  background: rgba(196, 160, 184, 0.22);
}
.dtp-empty {
  margin: 0;
  font-size: 11px;
  color: var(--text-low);
  text-align: center;
  line-height: 1.6;
}

/* 热门 */
.dtp-pop-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dtp-pop {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.dtp-pop-rank {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-low);
  width: 16px;
  text-align: center;
}
.dtp-pop-icon {
  font-size: 14px;
}
.dtp-pop-name {
  flex: 1;
  font-size: 12px;
  color: rgba(240, 242, 255, 0.82);
}
.dtp-pop-count {
  font-size: 10px;
  color: var(--text-low);
}
</style>
