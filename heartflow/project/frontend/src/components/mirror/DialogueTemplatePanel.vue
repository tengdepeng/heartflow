<template>
  <section class="dtp" aria-label="对话模板">
    <div class="dtp-head">
      <span class="dtp-title">🪞 对话模板</span>
      <span class="dtp-sub">晨昏签到 · 周回顾 · 专注准备 · 意图学习</span>
    </div>

    <!-- 意图学习统计 -->
    <div v-if="learningStats.totalFeedback > 0" class="dtp-learn">
      <span class="dtp-learn-item">已学习 {{ learningStats.totalFeedback }} 条反馈</span>
      <span class="dtp-learn-item">修正率 {{ Math.round(learningStats.correctionRate * 100) }}%</span>
      <span class="dtp-learn-item">覆盖 {{ learningStats.intentCount }} 类意图</span>
    </div>

    <!-- 推荐模板（按时段） -->
    <div v-if="recommended.length" class="dtp-block">
      <span class="dtp-block-label">此刻推荐</span>
      <div class="dtp-recs">
        <button v-for="t in recommended" :key="t.id" class="dtp-recs-item" @click="openTemplate(t)">
          <span class="dtp-recs-icon">{{ t.icon }}</span>
          <span class="dtp-recs-name">{{ t.name }}</span>
        </button>
      </div>
    </div>

    <!-- 模板列表 -->
    <div class="dtp-block">
      <span class="dtp-block-label">全部模板 · {{ templates.length }}</span>
      <div class="dtp-grid">
        <article v-for="t in templates" :key="t.id" class="dtp-card" @click="openTemplate(t)">
          <span class="dtp-card-icon">{{ t.icon }}</span>
          <div class="dtp-card-body">
            <span class="dtp-card-name">{{ t.name }}</span>
            <span class="dtp-card-desc">{{ t.description }}</span>
          </div>
          <span class="dtp-card-count" v-if="t.usageCount > 0">{{ t.usageCount }} 次</span>
        </article>
      </div>
    </div>

    <!-- 模板详情 -->
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
        <span class="dtp-intents" v-if="active.expectedIntents.length">
          <span v-for="it in active.expectedIntents" :key="it" class="dtp-intent">{{ intentLabel(it) }}</span>
        </span>
        <button class="dtp-use" @click="useTemplate">✓ 使用此模板</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDialogueTemplates, useIntentFeedbackLearning } from '../../modules/mirror'
import { INTENT_INFO } from '../../modules/mirror/intents'
import type { DialogueTemplate, DialogueTemplateType } from '../../modules/mirror/dialogue-persistence'

const api = useDialogueTemplates()
const learn = useIntentFeedbackLearning()

const templates = computed(() => api.popularTemplates.value)
const recommended = computed(() => api.getRecommendedTemplates())
const learningStats = computed(() => learn.learningStats.value)

const active = ref<DialogueTemplate | null>(null)

function openTemplate(t: DialogueTemplate) {
  active.value = t
}

function useTemplate() {
  if (!active.value) return
  api.recordUsage(active.value.type)
  active.value = null
}

function intentLabel(intent: DialogueTemplateType extends never ? never : keyof typeof INTENT_INFO): string {
  return INTENT_INFO[intent]?.label ?? intent
}
</script>

<style scoped>
.dtp {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}
.dtp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.dtp-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-high, #e8ecf6);
}
.dtp-sub {
  font-size: 10px;
  color: rgba(232, 236, 246, 0.4);
}
.dtp-learn {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.dtp-learn-item {
  font-size: 10px;
  color: rgba(196, 160, 184, 0.8);
  background: rgba(196, 160, 184, 0.1);
  border: 1px solid rgba(196, 160, 184, 0.16);
  padding: 3px 10px;
  border-radius: 999px;
}
.dtp-block {
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(14, 16, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.dtp-block-label {
  display: block;
  font-size: 11px;
  letter-spacing: 2px;
  color: rgba(232, 236, 246, 0.5);
  margin-bottom: 10px;
}
.dtp-recs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.dtp-recs-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(196, 160, 184, 0.22);
  background: rgba(196, 160, 184, 0.08);
  color: rgba(240, 242, 255, 0.85);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.dtp-recs-item:hover {
  background: rgba(196, 160, 184, 0.16);
  border-color: rgba(196, 160, 184, 0.4);
}
.dtp-recs-icon {
  font-size: 14px;
}
.dtp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}
.dtp-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: all 0.2s;
}
.dtp-card:hover {
  background: rgba(196, 160, 184, 0.08);
  border-color: rgba(196, 160, 184, 0.25);
}
.dtp-card-icon {
  font-size: 16px;
  flex-shrink: 0;
}
.dtp-card-body {
  flex: 1;
  min-width: 0;
}
.dtp-card-name {
  display: block;
  font-size: 12px;
  color: rgba(240, 242, 255, 0.9);
}
.dtp-card-desc {
  display: block;
  font-size: 10px;
  color: rgba(232, 236, 246, 0.4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dtp-card-count {
  font-size: 10px;
  color: rgba(196, 160, 184, 0.7);
  flex-shrink: 0;
}
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
  color: rgba(232, 236, 246, 0.5);
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
.dtp-intent {
  font-size: 10px;
  color: rgba(196, 160, 184, 0.75);
  background: rgba(196, 160, 184, 0.1);
  padding: 2px 8px;
  border-radius: 999px;
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
  transition: all 0.2s;
}
.dtp-use:hover {
  background: rgba(196, 160, 184, 0.22);
  border-color: rgba(196, 160, 184, 0.45);
}
</style>
