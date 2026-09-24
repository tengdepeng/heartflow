<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance self-reward">
    <!-- 氛围背景 -->
    <div data-enter class="sr-ambient" aria-hidden="true">
      <div class="sr-glow sr-glow--top"></div>
      <div class="sr-glow sr-glow--bottom"></div>
      <div class="sr-spark sr-spark-1"></div>
      <div class="sr-spark sr-spark-2"></div>
      <div class="sr-spark sr-spark-3"></div>
    </div>
    <div data-enter class="sr-atmos" aria-hidden="true">
      <div class="atmos-warm-glow"></div>
      <div class="atmos-work-light"></div>
    </div>

    <RoomLayout title="自我奖励" kicker="为自己设一份兑现清单" data-enter>
      <template #breadcrumb>
        <nav class="sr-breadcrumb">
          <router-link to="/home-space" class="bc-link">家</router-link>
          <span class="bc-sep">→</span>
          <router-link to="/worklog" class="bc-link">更漏</router-link>
          <span class="bc-sep">→</span>
          <router-link to="/reward" class="bc-link">劳酬</router-link>
          <span class="bc-sep">→</span>
          <span class="bc-current">自奖</span>
        </nav>
      </template>
      <template #meta>
        <div class="sr-stats">
          <div class="sr-stat"><span class="sr-stat-num">{{ stats.total }}</span><span class="sr-stat-label">合计</span></div>
          <div class="sr-stat"><span class="sr-stat-num sr-stat-num--pending">{{ stats.pending }}</span><span class="sr-stat-label">待触发</span></div>
          <div class="sr-stat"><span class="sr-stat-num sr-stat-num--ready">{{ stats.redeemable }}</span><span class="sr-stat-label">可兑现</span></div>
          <div class="sr-stat"><span class="sr-stat-num sr-stat-num--done">{{ stats.redeemed }}</span><span class="sr-stat-label">已兑现</span></div>
        </div>
      </template>

    <!-- 新建入口 -->
    <section data-enter class="sr-new-entry">
      <button class="sr-toggle-btn" @click="showForm = !showForm">
        <span class="sr-toggle-icon">{{ showForm ? '−' : '＋' }}</span>
        <span>{{ showForm ? '收起新建' : '新建一条奖励' }}</span>
      </button>

      <transition name="sr-slide">
        <div v-if="showForm" class="sr-form">
          <div class="sr-form-row">
            <label class="sr-field sr-field--grow">
              <span class="sr-field-label">奖励名称</span>
              <input v-model="form.title" class="sr-input" placeholder="例如：看一场电影" maxlength="40" />
            </label>
            <label class="sr-field sr-field--icon">
              <span class="sr-field-label">图标</span>
              <input v-model="form.icon" class="sr-input sr-input--icon" maxlength="4" />
            </label>
          </div>

          <label class="sr-field">
            <span class="sr-field-label">描述（可选）</span>
            <input v-model="form.description" class="sr-input" placeholder="为什么犒赏自己" maxlength="80" />
          </label>

          <div class="sr-form-row">
            <label class="sr-field">
              <span class="sr-field-label">触发方式</span>
              <select v-model="form.triggerType" class="sr-select">
                <option value="manual">✋ 纯手动</option>
                <option value="habit-streak">🔥 习惯连续</option>
                <option value="badge">🏅 匠庐徽章</option>
              </select>
            </label>

            <template v-if="form.triggerType === 'habit-streak'">
              <label class="sr-field sr-field--grow">
                <span class="sr-field-label">关联习惯</span>
                <select v-model="form.habitId" class="sr-select">
                  <option value="">选择习惯…</option>
                  <option v-for="h in habits" :key="h.id" :value="h.id">{{ h.icon }} {{ h.title }}（当前连续 {{ h.streak }} 天）</option>
                </select>
              </label>
              <label class="sr-field sr-field--days">
                <span class="sr-field-label">目标天数</span>
                <input v-model.number="form.streakDays" type="number" min="1" max="365" class="sr-input" />
              </label>
            </template>

            <template v-if="form.triggerType === 'badge'">
              <label class="sr-field sr-field--grow">
                <span class="sr-field-label">关联徽章</span>
                <select v-model="form.badgeId" class="sr-select">
                  <option value="">选择徽章…</option>
                  <option v-for="b in badgeOptions" :key="b.id" :value="b.id">{{ b.icon }} {{ b.name }}</option>
                </select>
              </label>
            </template>
          </div>

          <div class="sr-form-actions">
            <button class="sr-btn sr-btn--ghost" @click="resetForm">清空</button>
            <button class="sr-btn sr-btn--primary" :disabled="!canSubmit" @click="submit">创建</button>
          </div>
          <p v-if="form.triggerType !== 'manual'" class="sr-form-hint">{{ triggerHint }}</p>
        </div>
      </transition>
    </section>

    <!-- 列表 -->
    <section data-enter class="sr-list-section">
      <!-- 可兑现 -->
      <div v-if="grouped.redeemable.length" class="sr-group sr-group--ready">
        <h2 class="sr-group-title"><span class="sr-group-dot sr-group-dot--ready"></span>可兑现 · {{ grouped.redeemable.length }}</h2>
        <div class="sr-cards">
          <article v-for="r in grouped.redeemable" :key="r.id" class="sr-card sr-card--ready">
            <div class="sr-card-icon">{{ r.icon || '🎁' }}</div>
            <div class="sr-card-body">
              <h3 class="sr-card-title">{{ r.title }}</h3>
              <p v-if="r.description" class="sr-card-desc">{{ r.description }}</p>
              <p class="sr-card-meta">{{ triggerLabel(r) }} · 可兑现于 {{ fmt(r.redeemableSince) }}</p>
            </div>
            <div class="sr-card-actions">
              <button class="sr-mini-btn sr-mini-btn--redeem" @click="onRedeem(r.id)">兑现</button>
              <button class="sr-mini-btn sr-mini-btn--del" @click="onRemove(r.id)">删</button>
            </div>
          </article>
        </div>
      </div>

      <!-- 待触发 -->
      <div v-if="grouped.pending.length" class="sr-group sr-group--pending">
        <h2 class="sr-group-title"><span class="sr-group-dot sr-group-dot--pending"></span>待触发 · {{ grouped.pending.length }}</h2>
        <div class="sr-cards">
          <article v-for="r in grouped.pending" :key="r.id" class="sr-card">
            <div class="sr-card-icon">{{ r.icon || '🎁' }}</div>
            <div class="sr-card-body">
              <h3 class="sr-card-title">{{ r.title }}</h3>
              <p v-if="r.description" class="sr-card-desc">{{ r.description }}</p>
              <p class="sr-card-meta">{{ triggerLabel(r) }}{{ triggerProgress(r) }}</p>
            </div>
            <div class="sr-card-actions">
              <button v-if="r.trigger.type === 'manual'" class="sr-mini-btn sr-mini-btn--redeem" @click="onRedeem(r.id)">兑现</button>
              <button class="sr-mini-btn sr-mini-btn--del" @click="onRemove(r.id)">删</button>
            </div>
          </article>
        </div>
      </div>

      <!-- 已兑现 -->
      <div v-if="grouped.redeemed.length" class="sr-group sr-group--done">
        <h2 class="sr-group-title"><span class="sr-group-dot sr-group-dot--done"></span>已兑现 · {{ grouped.redeemed.length }}</h2>
        <div class="sr-cards">
          <article v-for="r in grouped.redeemed" :key="r.id" class="sr-card sr-card--done">
            <div class="sr-card-icon">{{ r.icon || '🎁' }}</div>
            <div class="sr-card-body">
              <h3 class="sr-card-title">{{ r.title }}</h3>
              <p v-if="r.description" class="sr-card-desc">{{ r.description }}</p>
              <p class="sr-card-meta">兑现于 {{ fmt(r.redeemedAt) }}</p>
            </div>
            <div class="sr-card-actions">
              <button class="sr-mini-btn sr-mini-btn--undo" @click="onUnredeem(r.id)">撤销</button>
            </div>
          </article>
        </div>
      </div>

      <!-- 空态 -->
      <div v-if="stats.total === 0" class="sr-empty">
        <div class="sr-empty-icon">🎁</div>
        <p class="sr-empty-text">还没有任何自我奖励。</p>
        <p class="sr-empty-sub">为自己设第一份犒赏吧——可以是「连续早睡 7 天就去看场电影」。</p>
      </div>
    </section>

    <!-- 犒赏账本（self-reward·reward-machine：兑现成本/节奏/里程碑/月度分布，INCR-165） -->
    <section data-enter class="sr-ledger">
      <RewardLedgerPanel />
    </section>
  </RoomLayout>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSelfReward, SELF_REWARD_TRIGGER_META } from '../modules/self-reward'
import RewardLedgerPanel from '../components/RewardLedgerPanel.vue'
import { getHabits } from '../modules/discipline/workshop'
import { useCraftBadges } from '../modules/craft/craft-badges'
import { useViewEntrance } from '../composables/useViewEntrance'
import RoomLayout from '../components/RoomLayout.vue'
import type { SelfReward, SelfRewardTriggerType } from '../modules/self-reward'

const { stats, grouped, add, remove, redeem, unredeem, evaluate } = useSelfReward()
const habits = getHabits()
const badges = useCraftBadges()

const badgeOptions = computed(() => {
  const unlocked = badges.unlockedBadges.value.map(ub => {
    const def = badges.getBadgeDef(ub.badgeId)
    return def ? { id: def.id, name: def.name, icon: def.icon } : null
  }).filter(Boolean) as { id: string; name: string; icon: string }[]
  const locked = badges.lockedBadges.value.map(b => ({ id: b.id, name: b.name, icon: b.icon }))
  return [...unlocked, ...locked]
})

// 入场动画
const { entranceClass, entranceRef } = useViewEntrance()

const showForm = ref(false)
const form = ref<{
  title: string
  description: string
  icon: string
  triggerType: SelfRewardTriggerType
  habitId: string
  streakDays: number
  badgeId: string
}>({
  title: '',
  description: '',
  icon: '🎁',
  triggerType: 'manual',
  habitId: '',
  streakDays: 7,
  badgeId: '',
})

const triggerHint = computed(() => SELF_REWARD_TRIGGER_META[form.value.triggerType].hint)

const canSubmit = computed(() => {
  if (!form.value.title.trim()) return false
  if (form.value.triggerType === 'habit-streak') return !!form.value.habitId && form.value.streakDays > 0
  if (form.value.triggerType === 'badge') return !!form.value.badgeId
  return true
})

function resetForm() {
  form.value = { title: '', description: '', icon: '🎁', triggerType: 'manual', habitId: '', streakDays: 7, badgeId: '' }
}

function submit() {
  if (!canSubmit.value) return
  const trigger = form.value.triggerType === 'habit-streak'
    ? { type: 'habit-streak' as const, habitId: form.value.habitId, streakDays: form.value.streakDays }
    : form.value.triggerType === 'badge'
      ? { type: 'badge' as const, badgeId: form.value.badgeId }
      : { type: 'manual' as const }
  add({ title: form.value.title, description: form.value.description, icon: form.value.icon, trigger })
  resetForm()
  showForm.value = false
}

function onRedeem(id: string) { redeem(id) }
function onUnredeem(id: string) { unredeem(id) }
function onRemove(id: string) { remove(id) }

function triggerLabel(r: SelfReward): string {
  const meta = SELF_REWARD_TRIGGER_META[r.trigger.type]
  if (r.trigger.type === 'habit-streak') {
    const h = habits.find(x => x.id === r.trigger.habitId)
    return `${meta.icon} ${h ? h.title : '习惯'}连续 ${r.trigger.streakDays} 天`
  }
  if (r.trigger.type === 'badge') {
    const def = badges.getBadgeDef(r.trigger.badgeId || '')
    return `${meta.icon} 解锁${def ? def.name : '徽章'}`
  }
  return `${meta.icon} ${meta.label}`
}

function triggerProgress(r: SelfReward): string {
  if (r.trigger.type === 'habit-streak') {
    const h = habits.find(x => x.id === r.trigger.habitId)
    if (!h) return ''
    const cur = h.streak
    const target = r.trigger.streakDays || 0
    return ` · 当前 ${cur}/${target} 天`
  }
  if (r.trigger.type === 'badge') {
    const unlocked = r.trigger.badgeId ? badges.isBadgeUnlocked(r.trigger.badgeId) : false
    return unlocked ? ' · 徽章已解锁' : ' · 徽章未解锁'
  }
  return ''
}

function fmt(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(() => { evaluate() })
</script>

<style scoped>
.self-reward { position: relative; min-height: 100%; color: var(--text-primary, #e8e4dc); }

:deep(.room-layout) {
  position: relative;
  z-index: 1;
}

/* 入场动画 */
.view-entrance .enter-from [data-enter] { opacity: 0; transform: translateY(16px); transition: opacity 0.5s ease, transform 0.5s ease; }
.view-entrance .enter-to [data-enter] { opacity: 1; transform: translateY(0); }
.view-entrance .enter-to [data-enter]:nth-child(2) { transition-delay: 0.08s; }
.view-entrance .enter-to [data-enter]:nth-child(3) { transition-delay: 0.16s; }
.view-entrance .enter-to [data-enter]:nth-child(4) { transition-delay: 0.24s; }

.sr-ambient { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.sr-glow { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.18; }
.sr-glow--top { top: -10%; left: 20%; width: 40vw; height: 40vw; background: radial-gradient(circle, #e0a96d, transparent 70%); }
.sr-glow--bottom { bottom: -15%; right: 10%; width: 35vw; height: 35vw; background: radial-gradient(circle, #a07c8c, transparent 70%); }
.sr-spark { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: #e8c060; opacity: 0.4; animation: sr-float 8s ease-in-out infinite; }
.sr-spark-1 { top: 30%; left: 15%; animation-delay: 0s; }
.sr-spark-2 { top: 60%; left: 80%; animation-delay: 2s; }
.sr-spark-3 { top: 45%; left: 50%; animation-delay: 4s; }
@keyframes sr-float { 0%,100%{transform:translateY(0);opacity:.4} 50%{transform:translateY(-20px);opacity:.15} }

.sr-atmos { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
.atmos-warm-glow { position: absolute; top: 0; left: 0; right: 0; height: 280px; background: linear-gradient(180deg, rgba(224,169,109,0.05), transparent); }
.atmos-work-light { position: absolute; bottom: 0; left: 0; right: 0; height: 200px; background: linear-gradient(0deg, rgba(160,124,140,0.04), transparent); }

.sr-new-entry, .sr-list-section, .sr-ledger { position: relative; z-index: 1; max-width: 820px; margin: 0 auto; }

.sr-ledger { margin-top: 2.5rem; }


.sr-breadcrumb { display: flex; align-items: center; justify-content: center; gap: 0.4rem; font-size: 0.78rem; color: var(--text-muted, #8a857a); margin-bottom: 1.2rem; }
.bc-link { color: var(--text-muted, #8a857a); text-decoration: none; transition: color 0.2s; }
.bc-link:hover { color: var(--accent, #e8c060); }
.bc-sep { opacity: 0.5; }
.bc-current { color: var(--text-primary, #e8e4dc); }


.sr-stats { display: flex; justify-content: center; gap: 2.2rem; margin-top: 1.6rem; }
.sr-stat { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; }
.sr-stat-num { font-size: 1.5rem; font-weight: 600; color: var(--text-primary, #e8e4dc); font-variant-numeric: tabular-nums; }
.sr-stat-num--pending { color: #8a857a; }
.sr-stat-num--ready { color: #e8c060; }
.sr-stat-num--done { color: #8a9a7a; }
.sr-stat-label { font-size: 0.72rem; color: var(--text-muted, #8a857a); letter-spacing: 0.08em; }

.sr-new-entry { margin-bottom: 2rem; }
.sr-toggle-btn { display: flex; align-items: center; gap: 0.5rem; margin: 0 auto; padding: 0.6rem 1.4rem; background: rgba(232,192,96,0.08); border: 1px solid rgba(232,192,96,0.25); border-radius: 999px; color: var(--accent, #e8c060); font-size: 0.88rem; cursor: pointer; transition: all 0.2s; }
.sr-toggle-btn:hover { background: rgba(232,192,96,0.15); border-color: rgba(232,192,96,0.45); }
.sr-toggle-icon { font-size: 1.1rem; line-height: 1; }

.sr-form { margin: 1.2rem auto 0; padding: 1.4rem; background: rgba(30,28,24,0.5); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; backdrop-filter: blur(8px); display: flex; flex-direction: column; gap: 1rem; max-width: 820px; }
.sr-form-row { display: flex; gap: 0.8rem; flex-wrap: wrap; }
.sr-field { display: flex; flex-direction: column; gap: 0.35rem; flex: 1; min-width: 0; }
.sr-field--grow { flex: 2; }
.sr-field--icon { flex: 0 0 80px; }
.sr-field--days { flex: 0 0 110px; }
.sr-field-label { font-size: 0.72rem; color: var(--text-muted, #8a857a); letter-spacing: 0.05em; }
.sr-input, .sr-select { padding: 0.55rem 0.7rem; background: rgba(20,18,15,0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; color: var(--text-primary, #e8e4dc); font-size: 0.88rem; outline: none; transition: border-color 0.2s; }
.sr-input:focus, .sr-select:focus { border-color: rgba(232,192,96,0.5); }
.sr-input--icon { text-align: center; font-size: 1.1rem; }
.sr-select option { background: #1c1a17; }

.sr-form-actions { display: flex; justify-content: flex-end; gap: 0.6rem; }
.sr-btn { padding: 0.5rem 1.2rem; border-radius: 8px; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
.sr-btn--ghost { background: transparent; border-color: rgba(255,255,255,0.12); color: var(--text-muted, #8a857a); }
.sr-btn--ghost:hover { border-color: rgba(255,255,255,0.25); color: var(--text-primary, #e8e4dc); }
.sr-btn--primary { background: rgba(232,192,96,0.18); border-color: rgba(232,192,96,0.45); color: var(--accent, #e8c060); }
.sr-btn--primary:hover:not(:disabled) { background: rgba(232,192,96,0.28); }
.sr-btn--primary:disabled { opacity: 0.35; cursor: not-allowed; }
.sr-form-hint { font-size: 0.74rem; color: var(--text-muted, #8a857a); margin: 0; opacity: 0.8; }

.sr-list-section { display: flex; flex-direction: column; gap: 2rem; }
.sr-group-title { display: flex; align-items: center; gap: 0.6rem; font-size: 0.95rem; font-weight: 500; color: var(--text-muted, #8a857a); margin: 0 0 1rem; letter-spacing: 0.04em; }
.sr-group-dot { width: 8px; height: 8px; border-radius: 50%; }
.sr-group-dot--pending { background: #8a857a; }
.sr-group-dot--ready { background: #e8c060; box-shadow: 0 0 8px rgba(232,192,96,0.5); }
.sr-group-dot--done { background: #8a9a7a; }

.sr-cards { display: flex; flex-direction: column; gap: 0.7rem; }
.sr-card { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.2rem; background: rgba(30,28,24,0.45); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; transition: all 0.2s; }
.sr-card:hover { border-color: rgba(255,255,255,0.12); background: rgba(34,32,28,0.55); }
.sr-card--ready { border-color: rgba(232,192,96,0.3); background: rgba(232,192,96,0.05); }
.sr-card--ready:hover { border-color: rgba(232,192,96,0.5); background: rgba(232,192,96,0.09); }
.sr-card--done { opacity: 0.6; }
.sr-card-icon { font-size: 1.6rem; flex-shrink: 0; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.04); border-radius: 10px; }
.sr-card-body { flex: 1; min-width: 0; }
.sr-card-title { font-size: 0.98rem; font-weight: 500; margin: 0 0 0.2rem; color: var(--text-primary, #e8e4dc); }
.sr-card-desc { font-size: 0.8rem; color: var(--text-muted, #8a857a); margin: 0 0 0.25rem; line-height: 1.5; }
.sr-card-meta { font-size: 0.73rem; color: var(--text-muted, #8a857a); margin: 0; opacity: 0.85; }
.sr-card-actions { display: flex; gap: 0.4rem; flex-shrink: 0; }
.sr-mini-btn { padding: 0.35rem 0.7rem; border-radius: 6px; font-size: 0.76rem; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; background: transparent; }
.sr-mini-btn--redeem { background: rgba(232,192,96,0.15); border-color: rgba(232,192,96,0.35); color: var(--accent, #e8c060); }
.sr-mini-btn--redeem:hover { background: rgba(232,192,96,0.25); }
.sr-mini-btn--undo { background: rgba(138,154,122,0.12); border-color: rgba(138,154,122,0.3); color: #8a9a7a; }
.sr-mini-btn--undo:hover { background: rgba(138,154,122,0.2); }
.sr-mini-btn--del { background: transparent; border-color: rgba(255,255,255,0.1); color: var(--text-muted, #8a857a); }
.sr-mini-btn--del:hover { border-color: rgba(217,140,122,0.4); color: #d98c7a; }

.sr-empty { text-align: center; padding: 3rem 1rem; color: var(--text-muted, #8a857a); }
.sr-empty-icon { font-size: 3rem; opacity: 0.4; margin-bottom: 1rem; }
.sr-empty-text { font-size: 1rem; margin: 0 0 0.4rem; color: var(--text-primary, #e8e4dc); }
.sr-empty-sub { font-size: 0.82rem; margin: 0 auto; max-width: 380px; line-height: 1.6; opacity: 0.8; }

.sr-slide-enter-active, .sr-slide-leave-active { transition: all 0.25s ease; overflow: hidden; }
.sr-slide-enter-from, .sr-slide-leave-to { opacity: 0; max-height: 0; margin-top: 0; }
.sr-slide-enter-to, .sr-slide-leave-from { opacity: 1; max-height: 600px; margin-top: 1.2rem; }

@media (max-width: 640px) {
  .sr-stats { gap: 1.4rem; }
  .sr-stat-num { font-size: 1.25rem; }
  .sr-form-row { flex-direction: column; }
  .sr-field--icon, .sr-field--days { flex: 1; }
  .sr-card { flex-wrap: wrap; }
  .sr-card-actions { width: 100%; justify-content: flex-end; }
}
</style>
