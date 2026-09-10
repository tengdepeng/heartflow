<template>
  <section data-enter class="gsm">
    <!-- 标题 -->
    <header class="gsm-head">
      <div class="gsm-head-titles">
        <h3 class="gsm-title">目标 · 成长状态机</h3>
        <p class="gsm-sub">目标的一生——种子 · 发芽 · 生长 · 开花，随时可以休眠与复苏</p>
      </div>
    </header>

    <!-- ① 生命周期导览 -->
    <div class="gsm-map" aria-label="目标生长状态机导览">
      <div class="gsm-lane">
        <template v-for="(stage, i) in MAIN_PATH" :key="stage.status">
          <div class="gsm-stage" :class="{ 'gsm-stage--active': stage.status === activeStatus }">
            <span class="gsm-stage-dot" aria-hidden="true"></span>
            <span class="gsm-stage-label">{{ stage.label }}</span>
          </div>
          <div v-if="i < MAIN_PATH.length - 1" class="gsm-edge">
            <span class="gsm-edge-label">{{ edgeLabel(stage.status, MAIN_PATH[i + 1].status) }}</span>
            <span class="gsm-edge-arrow">→</span>
          </div>
        </template>
      </div>
      <div class="gsm-side">
        <span class="gsm-side-line"></span>
        <span class="gsm-side-label">⚠ 任意阶段可「休眠」，亦可随时「唤醒」从头再来</span>
      </div>
      <div class="gsm-footnote">开花后的目标沉入旧梦潭归档，可复苏重启。</div>
    </div>

    <!-- ② 目标状态检视 -->
    <div class="gsm-inspect" v-if="inspectable.length">
      <div class="gsm-pick">
        <span class="gsm-pick-label">选择目标检视：</span>
        <div class="gsm-pick-list">
          <button
            v-for="g in inspectable"
            :key="g.id"
            class="gsm-pick-btn"
            :class="{ 'gsm-pick-btn--active': g.id === selectedId }"
            :style="g.id === selectedId ? { borderColor: DOMAIN_COLORS[g.domain], background: DOMAIN_COLORS[g.domain] + '1a' } : {}"
            @click="select(g.id)"
          >
            <span class="gsm-pick-dot" :style="{ background: DOMAIN_COLORS[g.domain] }"></span>
            <span class="gsm-pick-text">{{ g.title }}</span>
            <span class="gsm-pick-status">{{ STATUS_LABELS[g.status] }}</span>
          </button>
        </div>
      </div>

      <template v-if="selectedGoal">
        <div class="gsm-detail">
          <div class="gsm-detail-head">
            <span class="gsm-detail-stage" :style="{ borderColor: DOMAIN_COLORS[selectedGoal.domain], color: DOMAIN_COLORS[selectedGoal.domain] }">
              {{ STATUS_LABELS[selectedGoal.status] }}
            </span>
            <span class="gsm-detail-domain">{{ DOMAIN_LABELS[selectedGoal.domain] }} · {{ selectedGoal.anchorDone }}/{{ selectedGoal.anchorCount }} 锚点</span>
            <span
              class="gsm-detail-lum"
              :style="currentHealth ? { background: `rgba(255,255,255,${currentHealth.luminance})` } : { background: 'rgba(255,255,255,0.4)' }"
              title="光点亮度（自适应提示：反复拖延会变暗）"
            ></span>
          </div>

          <!-- 可用转换 -->
          <div class="gsm-block">
            <div class="gsm-block-title">可用转换</div>
            <p v-if="!availableTransitions.length" class="gsm-empty">暂无手动转换可执行（自动推进由状态机判定）。</p>
            <div v-else class="gsm-transitions">
              <div v-for="t in availableTransitions" :key="t.from + t.to + t.label" class="gsm-transition">
                <span class="gsm-transition-path">{{ STATUS_LABELS[t.from] }} → {{ STATUS_LABELS[t.to] }}</span>
                <span class="gsm-transition-label">{{ t.label }}</span>
                <span class="gsm-transition-desc">{{ t.description }}</span>
              </div>
            </div>
            <div v-if="autoTransition" class="gsm-auto">
              <span class="gsm-auto-badge">自动推进</span>
              <span>即将自动进入「{{ STATUS_LABELS[autoTransition.to] }}」—— {{ autoTransition.description }}</span>
            </div>
          </div>

          <!-- 健康度 -->
          <div class="gsm-block" v-if="currentHealth">
            <div class="gsm-block-title gsm-block-title--row">
              <span>健康度</span>
              <span class="gsm-health-level" :class="`gsm-health-level--${currentHealth.level}`" >{{ HEALTH_LEVEL_LABEL[currentHealth.level] }}</span>
              <span class="gsm-health-score">{{ Math.round(currentHealth.score * 100) }}%</span>
            </div>
            <div class="gsm-bar"><span class="gsm-bar-fill" :class="`gsm-bar-fill--${currentHealth.level}`" :style="{ width: currentHealth.score * 100 + '%' }"></span></div>
            <ul v-if="currentHealth.suggestions.length" class="gsm-suggest">
              <li v-for="(s, i) in currentHealth.suggestions" :key="i" class="gsm-suggest-item">{{ s }}</li>
            </ul>
            <p v-else class="gsm-ok">状态良好，继续保持。</p>
          </div>
        </div>
      </template>
    </div>
    <p v-else class="gsm-empty gsm-empty--big">暂无目标可检视——先在上方创建目标与计划吧。</p>

    <!-- ③ 需要关注 -->
    <div class="gsm-focus" v-if="unhealthy.length">
      <div class="gsm-focus-title">
        需要关注（{{ unhealthy.length }}）
        <span class="gsm-focus-hint">健康度低于健康线的目标，点击可检视</span>
      </div>
      <div class="gsm-focus-list">
        <button
          v-for="({ goal, health }) in unhealthy"
          :key="goal.id"
          class="gsm-focus-item"
          :style="goal.id === selectedId ? { borderColor: DOMAIN_COLORS[goal.domain] } : {}"
          @click="select(goal.id)"
        >
          <span class="gsm-focus-dot" :style="{ background: DOMAIN_COLORS[goal.domain] }"></span>
          <span class="gsm-focus-text">
            <span class="gsm-focus-name">{{ goal.title }}</span>
            <span class="gsm-focus-sub">{{ STATUS_LABELS[goal.status] }} · {{ DOMAIN_LABELS[goal.domain] }}</span>
          </span>
          <span class="gsm-focus-score" :class="`gsm-health-level--${health.level}`">{{ Math.round(health.score * 100) }}%</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGoal } from '../modules/goal'
import { STATE_TRANSITIONS, checkAutoTransitions } from '../modules/goal/goal-state-machine'
import type { GoalHealth } from '../modules/goal/goal-state-machine'
import { DOMAIN_LABELS, DOMAIN_COLORS, STATUS_LABELS } from '../modules/goal/types'
import type { Goal, GoalStatus } from '../modules/goal/types'

const goalStore = useGoal()
// 目标数据由宿主视图统一从 storage 加载（useGoal 初始化即 loadAll），面板不再自行 load 以免覆盖宿主内存态。

/** 主干生命周期：种子 → 发芽 → 生长 → 开花 */
const MAIN_PATH: { status: GoalStatus; label: string }[] = [
  { status: 'seed', label: '种子' },
  { status: 'sprout', label: '发芽' },
  { status: 'growing', label: '生长中' },
  { status: 'bloom', label: '已开花' },
]

const HEALTH_LEVEL_LABEL: Record<GoalHealth['level'], string> = {
  healthy: '健康',
  warning: '需留意',
  critical: '告急',
}

/** 检视池：目标 + 计划 */
const inspectable = computed<Goal[]>(() => {
  const seen = new Set<string>()
  const list: Goal[] = []
  for (const g of [...goalStore.targets.value, ...goalStore.plans.value]) {
    if (!seen.has(g.id)) { seen.add(g.id); list.push(g) }
  }
  return list
})

const selectedId = ref('')

const selectedGoal = computed(() => goalStore.goals.value.find(g => g.id === selectedId.value) ?? null)
const activeStatus = computed<GoalStatus | null>(() => selectedGoal.value?.status ?? null)

const currentHealth = computed(() => (selectedId.value ? goalStore.getHealth(selectedId.value) : null))
const availableTransitions = computed(() => (selectedId.value ? goalStore.getTransitions(selectedId.value) : []))
const autoTransition = computed(() => {
  const g = selectedGoal.value
  if (!g) return null
  const ctx = goalStore.getContext(g.id)
  if (!ctx) return null
  return checkAutoTransitions(g, ctx)
})

const unhealthy = computed(() => goalStore.unhealthyGoals.value)

function select(id: string) {
  selectedId.value = selectedId.value === id ? '' : id
}

/** 取主干某一步之间的转换命名（源自状态机定义的边） */
function edgeLabel(from: GoalStatus, to: GoalStatus): string {
  const t = STATE_TRANSITIONS.find(p => p.from === from && p.to === to)
  return t ? t.label : '→'
}
</script>

<style scoped>
.gsm {
  --gsm-accent: var(--accent, #d4a574);
  position: relative;
  padding: 20px;
  margin-top: 20px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
}
.gsm-head { margin-bottom: 16px; }
.gsm-title { margin: 0 0 4px; font-size: 16px; color: rgba(232, 221, 208, 0.92); letter-spacing: 0.02em; }
.gsm-sub { margin: 0; font-size: 12px; color: rgba(232, 221, 208, 0.55); }

/* ① 生命周期导览 */
.gsm-map { display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 12px; background: rgba(0, 0, 0, 0.18); }
.gsm-lane { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.gsm-stage { display: flex; align-items: center; gap: 7px; padding: 6px 12px; border-radius: 999px; border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(255, 255, 255, 0.03); }
.gsm-stage--active { border-color: var(--gsm-accent); background: rgba(var(--accent-rgb, 212, 165, 116), 0.14); }
.gsm-stage-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--gsm-accent); opacity: 0.85; }
.gsm-stage--active .gsm-stage-dot { box-shadow: 0 0 8px var(--gsm-accent); }
.gsm-stage-label { font-size: 12px; color: rgba(232, 221, 208, 0.85); }
.gsm-edge { display: flex; align-items: center; gap: 6px; color: rgba(232, 221, 208, 0.4); }
.gsm-edge-label { font-size: 10px; color: rgba(232, 221, 208, 0.45); }
.gsm-edge-arrow { font-size: 13px; }
.gsm-side { display: flex; align-items: center; gap: 8px; color: rgba(240, 192, 64, 0.6); font-size: 11px; }
.gsm-side-line { width: 26px; height: 1px; background: rgba(240, 192, 64, 0.4); }
.gsm-footnote { font-size: 11px; color: rgba(232, 221, 208, 0.4); }

/* ② 状态检视 */
.gsm-inspect { margin-top: 16px; }
.gsm-pick { margin-bottom: 12px; }
.gsm-pick-label { font-size: 12px; color: rgba(232, 221, 208, 0.6); }
.gsm-pick-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.gsm-pick-btn { display: inline-flex; align-items: center; gap: 7px; padding: 7px 12px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(255, 255, 255, 0.02); color: rgba(232, 221, 208, 0.85); font-size: 12px; cursor: pointer; transition: all 0.2s; }
.gsm-pick-btn:hover { border-color: var(--gsm-accent); }
.gsm-pick-btn--active { border-color: var(--gsm-accent); }
.gsm-pick-dot { width: 7px; height: 7px; border-radius: 50%; }
.gsm-pick-text { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gsm-pick-status { font-size: 10px; padding: 1px 6px; border-radius: 999px; background: rgba(255, 255, 255, 0.08); color: rgba(232, 221, 208, 0.7); }

.gsm-detail { padding: 14px; border-radius: 12px; background: rgba(0, 0, 0, 0.18); }
.gsm-detail-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.gsm-detail-stage { font-size: 12px; padding: 3px 10px; border-radius: 999px; border: 1px solid; }
.gsm-detail-domain { font-size: 12px; color: rgba(232, 221, 208, 0.6); }
.gsm-detail-lum { margin-left: auto; width: 14px; height: 14px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.15); }

.gsm-block { padding: 12px; border-radius: 10px; background: rgba(255, 255, 255, 0.03); margin-top: 10px; }
.gsm-block-title { font-size: 12px; font-weight: 600; color: rgba(232, 221, 208, 0.85); margin-bottom: 8px; }
.gsm-block-title--row { display: flex; align-items: center; gap: 8px; }
.gsm-transitions { display: flex; flex-wrap: wrap; gap: 8px; }
.gsm-transition { display: flex; align-items: baseline; gap: 8px; padding: 7px 10px; border-radius: 8px; background: rgba(255, 255, 255, 0.04); font-size: 12px; }
.gsm-transition-path { color: rgba(232, 221, 208, 0.85); font-weight: 600; }
.gsm-transition-label { color: var(--gsm-accent); }
.gsm-transition-desc { color: rgba(232, 221, 208, 0.5); font-size: 11px; }
.gsm-auto { margin-top: 8px; display: flex; align-items: center; gap: 8px; font-size: 12px; color: rgba(240, 192, 64, 0.85); }
.gsm-auto-badge { padding: 2px 8px; border-radius: 999px; background: rgba(240, 192, 64, 0.16); border: 1px solid rgba(240, 192, 64, 0.4); font-size: 10px; }

.gsm-health-level { font-size: 11px; padding: 1px 8px; border-radius: 999px; }
.gsm-health-level--healthy { color: #8a9a7a; background: rgba(138, 154, 122, 0.16); }
.gsm-health-level--warning { color: #f0c040; background: rgba(240, 192, 64, 0.16); }
.gsm-health-level--critical { color: #c46a5a; background: rgba(196, 106, 90, 0.16); }
.gsm-health-score { font-size: 12px; font-weight: 700; color: rgba(232, 221, 208, 0.9); }
.gsm-bar { height: 6px; border-radius: 999px; background: rgba(255, 255, 255, 0.08); overflow: hidden; }
.gsm-bar-fill { display: block; height: 100%; border-radius: 999px; }
.gsm-bar-fill--healthy { background: linear-gradient(90deg, #8a9a7a, #a8b68f); }
.gsm-bar-fill--warning { background: linear-gradient(90deg, #f0b040, #f0c040); }
.gsm-bar-fill--critical { background: linear-gradient(90deg, #c46a5a, #d9927a); }
.gsm-suggest { margin: 8px 0 0; padding: 0; list-style: none; }
.gsm-suggest-item { position: relative; padding-left: 14px; font-size: 12px; color: rgba(232, 221, 208, 0.75); margin-top: 5px; }
.gsm-suggest-item::before { content: '·'; position: absolute; left: 0; color: var(--gsm-accent); }
.gsm-ok { margin: 8px 0 0; font-size: 12px; color: #8a9a7a; }

.gsm-empty { margin: 0; font-size: 12px; color: rgba(232, 221, 208, 0.5); }
.gsm-empty--big { text-align: center; padding: 22px 0; }

/* ③ 需要关注 */
.gsm-focus { margin-top: 16px; }
.gsm-focus-title { font-size: 12px; font-weight: 600; color: rgba(232, 221, 208, 0.85); margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
.gsm-focus-hint { font-weight: 400; color: rgba(232, 221, 208, 0.45); font-size: 11px; }
.gsm-focus-list { display: flex; flex-direction: column; gap: 6px; }
.gsm-focus-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.07); background: rgba(255, 255, 255, 0.02); cursor: pointer; text-align: left; transition: border-color 0.2s; }
.gsm-focus-item:hover { border-color: var(--gsm-accent); }
.gsm-focus-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.gsm-focus-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.gsm-focus-name { font-size: 13px; color: rgba(232, 221, 208, 0.9); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gsm-focus-sub { font-size: 11px; color: rgba(232, 221, 208, 0.5); }
.gsm-focus-score { font-size: 12px; font-weight: 700; }
</style>