<template>
  <section class="ph-panel">
    <header class="ph-head">
      <div class="ph-kicker">家 · 宠物屋</div>
      <h3 class="ph-title">孵蛋与宠物屋</h3>
      <span class="ph-house-lv">小窝 Lv.{{ hatch.state.value.houseLevel }}</span>
    </header>

    <!-- 孵化区 -->
    <div class="ph-hatch">
      <div class="ph-egg-stage" :style="{ '--ph-hue': hatch.formMeta.value.hue }">
        <div class="ph-egg" :class="[`ph-egg--${hatch.stage.value}`, { 'ph-egg--warm': warming }]">
          <span class="ph-egg-emoji">{{ hatch.formMeta.value.emoji }}</span>
        </div>
        <div class="ph-stage-info">
          <span class="ph-stage-name">{{ stageTitle }}</span>
          <span class="ph-stage-sub">{{ stageHint }}</span>
        </div>
      </div>

      <div class="ph-progress">
        <div class="ph-bar"><i :style="{ width: (hatch.progress.value * 100) + '%' }" /></div>
        <span class="ph-progress-num">{{ Math.round(hatch.progress.value * 100) }}%</span>
      </div>

      <!-- 取蛋 -->
      <div v-if="hatch.stage.value === 'idle'" class="ph-egg-picker">
        <button
          v-for="f in EGG_FORMS"
          :key="f.id"
          class="ph-egg-btn"
          :class="{ active: hatch.state.value.eggForm === f.id }"
          :style="{ '--ph-hue': f.hue }"
          @click="hatch.takeEgg(f.id)"
        >
          <span class="ph-egg-btn-emoji">{{ f.emoji }}</span>
          <span class="ph-egg-btn-name">{{ f.name }}</span>
          <span class="ph-egg-btn-time">{{ Math.round(f.hatchMs / 1000) }}s</span>
        </button>
        <button class="ph-act ph-act--warm ph-egg-start" @click="hatch.startIncubate()">
          🔥 开始温养
        </button>
      </div>

      <!-- 孵化中 -->
      <div v-else-if="hatch.stage.value === 'incubating'" class="ph-actions">
        <button class="ph-act ph-act--warm" @click="onWarm">🔥 温一温</button>
        <button class="ph-act" @click="hatch.stopIncubate()">✋ 收手</button>
      </div>

      <!-- 已孵化：待领养 -->
      <div v-else class="ph-hatched">
        <p class="ph-hatched-text">孵化完成！它正等着被你领养。</p>
        <button class="ph-act ph-act--claim" @click="onClaim">🏡 领养它</button>
      </div>
    </div>

    <!-- 宠物屋：材料 + 建造 -->
    <div class="ph-house">
      <div class="ph-sec-title">建材库存</div>
      <div class="ph-mats">
        <div v-for="m in MATERIAL_META" :key="m.key" class="ph-mat">
          <span class="ph-mat-emoji">{{ m.emoji }}</span>
          <span class="ph-mat-num">
            {{ hatch.state.value.materials[m.key] }}
            <em v-if="hatch.nextCost.value[m.key]">/ {{ hatch.nextCost.value[m.key] }}</em>
          </span>
        </div>
      </div>
      <div class="ph-actions">
        <button class="ph-act" :disabled="!hatch.canGatherToday()" @click="hatch.gatherMaterials()">
          🧺 {{ hatch.canGatherToday() ? '采集建材' : '今日已采集' }}
        </button>
        <button class="ph-act ph-act--build" :disabled="!hatch.canBuild()" @click="onBuild">
          🏗️ 建造升级
        </button>
      </div>
    </div>

    <!-- 升级奖励 -->
    <div v-if="nextReward" class="ph-reward">
      <div class="ph-sec-title">小窝 Lv.{{ hatch.state.value.houseLevel }} 奖励</div>
      <div class="ph-reward-row">
        <span class="ph-reward-emoji">{{ nextReward.emoji }}</span>
        <div class="ph-reward-info">
          <span class="ph-reward-name">{{ nextReward.name }}</span>
          <span class="ph-reward-desc">{{ nextReward.desc }}</span>
        </div>
        <button
          v-if="canClaim"
          class="ph-act ph-act--claim"
          @click="onClaimReward"
        >
          领取
        </button>
        <span v-else class="ph-reward-done">✓ 已领取</span>
      </div>
    </div>

    <p v-if="rewardToast" class="ph-toast">{{ rewardToast }}</p>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePetHatch, EGG_FORMS, MATERIAL_META, rewardForHouseLevel } from '../modules/pet-hatch'
import { useDesktopCompanion } from '../modules/desktop-companion'

const hatch = usePetHatch()
const companion = useDesktopCompanion()

const warming = ref(false)
const rewardToast = ref('')
let warmTimer: number | null = null

const stageTitle = computed(() => {
  if (hatch.stage.value === 'incubating') return `${hatch.formMeta.value.name} · 温养中`
  if (hatch.stage.value === 'hatched') return `${hatch.formMeta.value.name} · 已破壳`
  return `${hatch.formMeta.value.name} · 待温养`
})

const stageHint = computed(() => {
  if (hatch.stage.value === 'incubating') return '点「温一温」加快破壳，也可收手改日再续'
  if (hatch.stage.value === 'hatched') return '领养后即可用陪伴精灵面板照料它'
  return '先取一枚蛋，再开始温养'
})

/** 当前等级对应的升级奖励（已领过的显示已领取） */
const nextReward = computed(() => rewardForHouseLevel(hatch.state.value.houseLevel))
const canClaim = computed(() => hatch.canClaimReward(hatch.state.value.houseLevel))

function onWarm() {
  warming.value = true
  hatch.warmOnce()
  window.setTimeout(() => (warming.value = false), 320)
}

/** 孵化产物 → 交给 INCR-488 领养（不重造领养逻辑） */
function onClaim() {
  const meta = hatch.claimHatched()
  if (!meta) return
  const name = window.prompt('给它起个名字', meta.name)
  if (name === null) return
  const finalName = name.trim() || meta.name
  companion.adopt(finalName, meta.companionForm)
}

function onBuild() {
  if (hatch.buildHouse()) {
    rewardToast.value = '小窝扩建完成，去下方领取奖励吧'
    window.setTimeout(() => (rewardToast.value = ''), 2600)
  }
}

function onClaimReward() {
  const r = hatch.claimReward(hatch.state.value.houseLevel)
  if (r) {
    rewardToast.value = `获得「${r.name}」${r.emoji}`
    window.setTimeout(() => (rewardToast.value = ''), 2600)
  }
}

onMounted(() => {
  // 每秒推进孵化：到点自动破壳（也可点「温一温」加速）
  warmTimer = window.setInterval(() => hatch.settle(), 1000)
})
onUnmounted(() => {
  if (warmTimer !== null) window.clearInterval(warmTimer)
})
</script>

<style scoped>
.ph-panel {
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

.ph-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ph-kicker {
  font-size: 11px;
  letter-spacing: 2px;
  color: rgba(232, 224, 216, 0.42);
}
.ph-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: rgba(240, 233, 224, 0.92);
}
.ph-house-lv {
  margin-left: auto;
  font-size: 11px;
  color: rgba(232, 224, 216, 0.5);
}

.ph-hatch,
.ph-house {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ph-egg-stage {
  display: flex;
  align-items: center;
  gap: 14px;
}
.ph-egg {
  width: 64px;
  height: 76px;
  flex: none;
  border-radius: 50% 50% 46% 46% / 62% 62% 38% 38%;
  background: radial-gradient(circle at 34% 28%, rgba(255, 255, 255, 0.34), transparent 58%),
    linear-gradient(160deg, var(--ph-hue, #e8823c), rgba(120, 100, 80, 0.55));
  border: 1px solid rgba(255, 255, 255, 0.16);
  display: grid;
  place-items: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.ph-egg-emoji {
  font-size: 26px;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.35));
}
.ph-egg--incubating {
  animation: ph-wiggle 2.4s ease-in-out infinite;
}
.ph-egg--warm {
  transform: scale(1.09);
  box-shadow: 0 0 20px color-mix(in srgb, var(--ph-hue, #e8823c) 55%, transparent);
}
.ph-egg--hatched {
  animation: ph-hatch-pop 0.55s ease-out;
  box-shadow: 0 0 26px color-mix(in srgb, var(--ph-hue, #e8823c) 45%, transparent);
}
@keyframes ph-wiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-3.5deg); }
  75% { transform: rotate(3.5deg); }
}
@keyframes ph-hatch-pop {
  0% { transform: scale(0.82); }
  60% { transform: scale(1.14); }
  100% { transform: scale(1); }
}

.ph-stage-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.ph-stage-name {
  font-size: 13px;
  color: rgba(240, 233, 224, 0.9);
}
.ph-stage-sub {
  font-size: 11px;
  color: rgba(232, 224, 216, 0.48);
}

.ph-bar {
  flex: 1;
  height: 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.ph-bar i {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #c9a227, #e8c766);
  transition: width 0.4s ease;
}
.ph-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ph-progress-num {
  font-size: 11px;
  color: rgba(232, 224, 216, 0.5);
  min-width: 30px;
  text-align: right;
}

.ph-egg-picker {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.ph-egg-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 9px 4px;
  border-radius: 12px;
  border: 1px solid rgba(180, 160, 130, 0.18);
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}
.ph-egg-btn:hover {
  transform: translateY(-1px);
}
.ph-egg-btn.active {
  border-color: color-mix(in srgb, var(--ph-hue, #e8823c) 60%, transparent);
  background: color-mix(in srgb, var(--ph-hue, #e8823c) 12%, transparent);
}
.ph-egg-btn-emoji { font-size: 19px; }
.ph-egg-btn-name { font-size: 12px; color: rgba(240, 233, 224, 0.88); }
.ph-egg-btn-time { font-size: 10px; color: rgba(232, 224, 216, 0.42); }
.ph-egg-start {
  grid-column: 1 / -1;
  justify-self: center;
}

.ph-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.ph-act {
  padding: 7px 13px;
  border-radius: 999px;
  border: 1px solid rgba(180, 160, 130, 0.22);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(240, 233, 224, 0.86);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.15s ease, opacity 0.2s ease;
}
.ph-act:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.09);
  transform: translateY(-1px);
}
.ph-act:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.ph-act--warm {
  border-color: rgba(232, 138, 60, 0.4);
}
.ph-act--build {
  border-color: rgba(122, 176, 110, 0.42);
}
.ph-act--claim {
  border-color: rgba(201, 162, 39, 0.5);
  background: rgba(201, 162, 39, 0.14);
}

.ph-hatched {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.ph-hatched-text {
  margin: 0;
  font-size: 12px;
  color: rgba(240, 233, 224, 0.82);
}

.ph-sec-title {
  font-size: 11px;
  letter-spacing: 1.4px;
  color: rgba(232, 224, 216, 0.42);
}
.ph-mats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.ph-mat {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 4px;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(180, 160, 130, 0.14);
}
.ph-mat-emoji { font-size: 15px; }
.ph-mat-num {
  font-size: 12px;
  color: rgba(240, 233, 224, 0.88);
}
.ph-mat-num em {
  font-style: normal;
  font-size: 10px;
  color: rgba(232, 224, 216, 0.42);
}

.ph-reward {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(201, 162, 39, 0.07);
  border: 1px solid rgba(201, 162, 39, 0.2);
}
.ph-reward-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ph-reward-emoji { font-size: 22px; }
.ph-reward-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}
.ph-reward-name {
  font-size: 13px;
  color: rgba(240, 233, 224, 0.9);
}
.ph-reward-desc {
  font-size: 11px;
  color: rgba(232, 224, 216, 0.5);
}
.ph-reward-done {
  font-size: 11px;
  color: rgba(122, 176, 110, 0.8);
}

.ph-toast {
  margin: 0;
  font-size: 12px;
  color: rgba(201, 162, 39, 0.85);
  text-align: center;
}
</style>
