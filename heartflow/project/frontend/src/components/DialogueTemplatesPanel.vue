<template>
  <section class="dtp" aria-label="对话模板">
    <div class="dtp-head">
      <span class="dtp-title">🗣️ 对话模板</span>
      <span class="dtp-sub">模板 · 推荐 · 使用</span>
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

    <!-- 模板列表 -->
    <div class="dtp-block">
      <div class="dtp-block-title">全部模板</div>
      <div v-if="templates.length" class="dtp-list">
        <div v-for="t in templates" :key="t.id" class="dtp-tpl">
          <div class="dtp-tpl-head">
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
          <div class="dtp-tpl-prompts">
            <p v-for="(p, i) in t.prompts" :key="i" class="dtp-prompt">{{ i + 1 }}. {{ p }}</p>
          </div>
          <div class="dtp-tpl-actions">
            <button class="dtp-btn" @click="useTemplate(t.type)">使用此模板</button>
          </div>
        </div>
      </div>
      <p v-else class="dtp-empty">暂无模板。</p>
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
import { computed } from 'vue'
import { useDialogueTemplates } from '../modules/mirror/dialogue-persistence'
import { INTENT_INFO } from '../modules/mirror/intents'
import type { DialogueTemplateType } from '../modules/mirror/dialogue-persistence'

const { templates, getRecommendedTemplates, recordUsage, popularTemplates } = useDialogueTemplates()

const recommended = computed(() => getRecommendedTemplates())
const popular = computed(() => popularTemplates.value)

function intentLabel(intent: string): string {
  return INTENT_INFO[intent as keyof typeof INTENT_INFO]?.label ?? intent
}

function useTemplate(type: DialogueTemplateType): void {
  recordUsage(type)
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
.dtp-tpl-prompts {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dtp-prompt {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  color: rgba(240, 242, 255, 0.72);
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
