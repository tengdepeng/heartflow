<template>
  <section class="dcp-panel">
    <header class="dcp-head">
      <div class="dcp-kicker">家 · 陪伴</div>
      <h3 class="dcp-title">陪伴精灵</h3>
      <span v-if="companion.isAdopted.value" class="dcp-level">Lv.{{ companion.state.value.level }}</span>
    </header>

    <!-- 未领养：领养流程 -->
    <div v-if="!companion.isAdopted.value" class="dcp-adopt">
      <p class="dcp-guide">领养一只属于你的精灵，陪你走过每个房间。</p>
      <div class="dcp-forms">
        <button
          v-for="f in COMPANION_FORMS"
          :key="f.id"
          class="dcp-form"
          :class="{ active: selectedForm === f.id }"
          @click="selectedForm = f.id"
        >
          <span class="dcp-form-emoji">{{ f.emoji }}</span>
          <span class="dcp-form-name">{{ f.name }}</span>
        </button>
      </div>
      <div class="dcp-name-row">
        <input
          v-model="nameDraft"
          class="dcp-name-input"
          type="text"
          maxlength="12"
          placeholder="给精灵起个名字"
          @keyup.enter="doAdopt"
        />
        <button class="dcp-adopt-btn" :disabled="!nameDraft.trim()" @click="doAdopt">
          领养
        </button>
      </div>
    </div>

    <!-- 已领养：养成主界面 -->
    <div v-else class="dcp-main">
      <div class="dcp-pet">
        <span class="dcp-pet-emoji">{{ companion.formMeta.value.emoji }}</span>
        <div class="dcp-pet-info">
          <span class="dcp-pet-name">{{ companion.state.value.name }}</span>
          <span class="dcp-pet-sub">
            {{ companion.formMeta.value.name }} · 小窝 Lv.{{ companion.state.value.homeLevel }} · {{ companion.mood.value.emoji }}{{ companion.mood.value.label }}
          </span>
        </div>
      </div>

      <div class="dcp-stats">
        <div class="dcp-stat">
          <span class="dcp-stat-label">饱食</span>
          <div class="dcp-bar"><i :style="{ width: companion.state.value.satiety + '%' }" /></div>
        </div>
        <div class="dcp-stat">
          <span class="dcp-stat-label">亲密</span>
          <div class="dcp-bar"><i :style="{ width: companion.state.value.affection + '%' }" /></div>
        </div>
        <div class="dcp-stat">
          <span class="dcp-stat-label">精力</span>
          <div class="dcp-bar"><i :style="{ width: companion.state.value.energy + '%' }" /></div>
        </div>
      </div>

      <div class="dcp-progress">
        <span class="dcp-progress-label">升级进度</span>
        <div class="dcp-bar dcp-bar--xp"><i :style="{ width: (companion.progress.value.ratio * 100) + '%' }" /></div>
        <span class="dcp-progress-num">{{ companion.progress.value.current }}/{{ companion.progress.value.next }}</span>
      </div>

      <div class="dcp-actions">
        <button class="dcp-act" @click="onFeed">🍚 喂食</button>
        <button class="dcp-act" @click="onPlay">🤝 陪伴</button>
        <button class="dcp-act" @click="onRest">🌙 歇息</button>
        <button class="dcp-act dcp-act--release" @click="onRelease">放归</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDesktopCompanion, COMPANION_FORMS, type CompanionForm } from '../modules/desktop-companion'
import { useAdvisorStore } from '../stores/advisor'

const companion = useDesktopCompanion()

const nameDraft = ref('')
const selectedForm = ref<CompanionForm>('sprite')

function doAdopt() {
  if (companion.adopt(nameDraft.value, selectedForm.value)) {
    nameDraft.value = ''
  }
}

/**
 * 幕僚好感联动接口：照顾精灵会被幕僚「见证」（witnessAll 记录生活陪伴事件，
 * 同步 lastActiveAt）。陪伴精灵不依赖幕僚子系统，故窄兜底跳过不可用情形。
 */
function linkAdvisorWitness() {
  try {
    useAdvisorStore().witnessAll('companion_interact')
  } catch {
    /* 幕僚子系统不可用时静默跳过 */
  }
}

function onFeed() {
  if (companion.feed()) linkAdvisorWitness()
}
function onPlay() {
  if (companion.play()) linkAdvisorWitness()
}
function onRest() {
  companion.rest()
}
function onRelease() {
  companion.clearAll()
}

onMounted(() => companion.tickDaily())
</script>

<style scoped>
.dcp-panel {
  position: relative;
  z-index: 1;
  padding: 20px 22px;
  border-radius: 18px;
  background: rgba(255, 252, 245, 0.06);
  border: 1px solid rgba(180, 160, 130, 0.16);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dcp-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dcp-kicker {
  font-size: 11px;
  letter-spacing: 2px;
  color: rgba(232, 224, 216, 0.42);
}
.dcp-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
  font-family: var(--font-heading-zh);
}
.dcp-level {
  margin-left: auto;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(212, 165, 116, 0.16);
  color: var(--accent, #d4a574);
  font-variant-numeric: tabular-nums;
}

.dcp-guide {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
}

.dcp-forms {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}
.dcp-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  border-radius: 14px;
  border: 1px solid rgba(180, 160, 130, 0.2);
  background: rgba(255, 252, 245, 0.04);
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  cursor: pointer;
  font-family: inherit;
  transition: all 0.25s ease;
}
.dcp-form.active {
  border-color: var(--accent, #d4a574);
  background: rgba(212, 165, 116, 0.12);
  color: var(--accent, #d4a574);
  transform: translateY(-1px);
}
.dcp-form-emoji {
  font-size: 26px;
  line-height: 1;
}
.dcp-form-name {
  font-size: 12px;
}

.dcp-name-row {
  display: flex;
  gap: 10px;
}
.dcp-name-input {
  flex: 1;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(180, 160, 130, 0.22);
  background: rgba(13, 11, 9, 0.4);
  color: var(--text-primary, #e8e0d8);
  font-size: 13px;
  font-family: inherit;
}
.dcp-name-input::placeholder {
  color: rgba(232, 224, 216, 0.34);
}
.dcp-adopt-btn {
  padding: 10px 20px;
  border-radius: 12px;
  border: 1px solid var(--accent, #d4a574);
  background: rgba(212, 165, 116, 0.16);
  color: var(--accent, #d4a574);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s ease;
}
.dcp-adopt-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.dcp-pet {
  display: flex;
  align-items: center;
  gap: 14px;
}
.dcp-pet-emoji {
  font-size: 44px;
  line-height: 1;
  filter: drop-shadow(0 4px 12px rgba(212, 165, 116, 0.3));
}
.dcp-pet-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dcp-pet-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}
.dcp-pet-sub {
  font-size: 12px;
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
}

.dcp-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dcp-stat {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dcp-stat-label {
  width: 28px;
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.dcp-bar {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background: rgba(180, 160, 130, 0.14);
  overflow: hidden;
}
.dcp-bar > i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(212, 165, 116, 0.7), var(--accent, #d4a574));
  transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.dcp-bar--xp > i {
  background: linear-gradient(90deg, rgba(143, 154, 122, 0.7), #8a9a7a);
}

.dcp-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dcp-progress-label {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.dcp-progress-num {
  font-size: 11px;
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
  font-variant-numeric: tabular-nums;
}

.dcp-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.dcp-act {
  flex: 1;
  min-width: 64px;
  padding: 10px 8px;
  border-radius: 12px;
  border: 1px solid rgba(180, 160, 130, 0.2);
  background: rgba(255, 252, 245, 0.05);
  color: var(--text-secondary, rgba(232, 224, 216, 0.6));
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s ease;
}
.dcp-act:hover {
  border-color: rgba(212, 165, 116, 0.4);
  color: var(--text-primary, #e8e0d8);
  transform: translateY(-1px);
}
.dcp-act--release {
  flex: 0 0 auto;
  color: rgba(232, 224, 216, 0.4);
}
.dcp-act--release:hover {
  border-color: rgba(200, 120, 120, 0.4);
  color: #d98c7a;
}
</style>
