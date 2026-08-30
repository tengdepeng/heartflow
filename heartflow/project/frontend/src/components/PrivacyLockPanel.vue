<template>
  <!-- 锁定遮罩：覆盖全屏隐藏敏感账务 -->
  <div v-if="locked && store.isConfigured()" class="pl-lockmask" @click.self="nothing">
    <div class="pl-lockcard" role="dialog" aria-label="隐私锁已锁定">
      <div class="pl-lock-icon">🔒</div>
      <h3 class="pl-lock-title">账本已锁定</h3>
      <p class="pl-lock-sub">输入主密码以查看记账与资产明细</p>
      <form class="pl-lockform" @submit.prevent="doUnlock">
        <input v-model="unlockPwd" type="password" class="pl-input" placeholder="主密码" autocomplete="off" />
        <button class="pl-btn" :disabled="!unlockPwd">解锁</button>
      </form>
      <p v-if="unlockErr" class="pl-err">密码不正确，请重试</p>
      <p v-if="config?.hint" class="pl-hint">提示：{{ config.hint }}</p>
    </div>
  </div>

  <!-- 管理区 -->
  <section class="pl-panel" aria-label="隐私锁">
    <header class="pl-head">
      <span class="pl-title">🔐 隐私锁</span>
      <span class="pl-sub">主密码守护 · 数据加密 · 锁定时隐藏账务</span>
    </header>

    <!-- 未配置：首次设置 -->
    <div v-if="!store.isConfigured()" class="pl-block">
      <p class="pl-desc">设置主密码后，每次打开本页需先解锁才能查看收支与资产明细。</p>
      <form class="pl-form" @submit.prevent="doSetup">
        <input v-model="setupPwd" type="password" class="pl-input" placeholder="设置主密码" autocomplete="new-password" />
        <input v-model="setupHint" class="pl-input" placeholder="提示（可选，用于忘记密码时）" />
        <button class="pl-btn" :disabled="!setupPwd">启用隐私锁</button>
      </form>
    </div>

    <!-- 已配置且解锁：状态 + 管理 -->
    <template v-else>
      <div class="pl-status">
        <span v-if="locked" class="pl-status-dot off"></span>
        <span>{{ locked ? '已锁定' : '已解锁' }}</span>
        <button v-if="!locked" class="pl-mini pl-mini--warn" @click="doLock">立即锁定</button>
      </div>

      <!-- 修改密码 -->
      <form class="pl-form" @submit.prevent="doChange">
        <span class="pl-form-t">修改主密码</span>
        <input v-model="changeOld" type="password" class="pl-input" placeholder="当前密码" autocomplete="off" />
        <div class="pl-form-row">
          <input v-model="changeNew" type="password" class="pl-input" placeholder="新密码" autocomplete="new-password" />
          <input v-model="changeHint" class="pl-input" placeholder="新提示（可选）" @keyup.enter="blurNow" />
        </div>
        <button class="pl-btn" :disabled="!changeOld || !changeNew">确认修改</button>
        <p v-if="changeErr" class="pl-err">{{ changeErr }}</p>
      </form>

      <!-- 关闭隐私锁 -->
      <form class="pl-form" @submit.prevent="doDisable">
        <span class="pl-form-t">关闭隐私锁</span>
        <div class="pl-form-row">
          <input v-model="disablePwd" type="password" class="pl-input" placeholder="输入当前密码以关闭" autocomplete="off" />
          <button class="pl-btn pl-btn--danger" :disabled="!disablePwd">关闭</button>
        </div>
        <p v-if="disableErr" class="pl-err">{{ disableErr }}</p>
      </form>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePrivacyLock } from '../modules/reward/privacy-lock'

const store = usePrivacyLock()
const locked = computed(() => store.locked.value)
const config = computed(() => store.config.value)

function blurNow(e: Event): void {
  ;(e.target as HTMLInputElement).blur()
}

const setupPwd = ref('')
const setupHint = ref('')
const unlockPwd = ref('')
const unlockErr = ref(false)
const changeOld = ref('')
const changeNew = ref('')
const changeHint = ref('')
const changeErr = ref('')
const disablePwd = ref('')
const disableErr = ref('')

function doSetup(): void {
  if (!setupPwd.value) return
  store.setup(setupPwd.value, setupHint.value.trim() || undefined)
  setupPwd.value = ''
  setupHint.value = ''
}
function doUnlock(): void {
  unlockErr.value = !store.unlock(unlockPwd.value)
  if (!unlockErr.value) unlockPwd.value = ''
}
function nothing(): void {
  /* 阻止点击遮罩空白处关闭 */
}
function doLock(): void {
  if (store.isConfigured()) store.lock(true)
}
function doChange(): void {
  changeErr.value = store.changePassword(changeOld.value, changeNew.value, changeHint.value.trim() || undefined)
    ? ''
    : '当前密码不正确，无法修改'
  if (!changeErr.value) {
    changeOld.value = ''
    changeNew.value = ''
    changeHint.value = ''
  }
}
function doDisable(): void {
  if (store.disable(disablePwd.value)) {
    disablePwd.value = ''
    disableErr.value = ''
  } else {
    disableErr.value = '密码不正确，无法关闭'
  }
}
</script>

<style scoped>
.pl-lockmask {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(6, 8, 6, 0.88); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center; padding: 24px;
}
.pl-lockcard {
  width: 100%; max-width: 360px; background: #20241f; border: 1px solid #4a5243;
  border-radius: 16px; padding: 28px 24px; text-align: center; color: #d9decf;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}
.pl-lock-icon { font-size: 40px; }
.pl-lock-title { font-size: 18px; margin: 10px 0 4px; color: #e8c060; }
.pl-lock-sub { font-size: 12px; color: #8a9a7a; margin: 0 0 16px; }
.pl-lockform { display: flex; gap: 8px; }
.pl-hint { font-size: 11px; color: #6b7563; margin-top: 12px; }

.pl-panel { background: #20241f; border: 1px solid #333a33; border-radius: 12px; padding: 14px; margin-top: 14px; color: #d9decf; }
.pl-head { display: flex; gap: 10px; align-items: baseline; margin-bottom: 10px; flex-wrap: wrap; }
.pl-title { font-weight: 600; }
.pl-sub { font-size: 12px; color: #8a9a7a; flex: 1; min-width: 120px; }

.pl-desc { font-size: 12px; color: #b7c0a8; line-height: 1.6; margin: 0 0 10px; }
.pl-form { background: #161a15; border-radius: 10px; padding: 10px; margin-bottom: 10px; display: flex; flex-direction: column; gap: 8px; }
.pl-form:last-child { margin-bottom: 0; }
.pl-form-t { font-size: 12px; color: #e8c060; }
.pl-form-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.pl-input {
  flex: 1; min-width: 100px; background: #101310; border: 1px solid #374136; border-radius: 8px;
  color: #d9decf; padding: 6px 9px; font-size: 12px; font-family: inherit;
}
.pl-btn { background: #8a9a7a; color: #171a15; border: none; border-radius: 8px; padding: 6px 14px; font-weight: 600; font-size: 12px; cursor: pointer; white-space: nowrap; font-family: inherit; }
.pl-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pl-btn--danger { background: #c46a5a; color: #1a0f0c; }
.pl-err { font-size: 11px; color: #c46a5a; margin: 0; }

.pl-status { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #d9decf; margin-bottom: 10px; }
.pl-status-dot { width: 9px; height: 9px; border-radius: 50%; }
.pl-status-dot.on { background: #8aca70; box-shadow: 0 0 8px #8aca70; }
.pl-status-dot.off { background: #c46a5a; box-shadow: 0 0 8px #c46a5a; }
.pl-mini { margin-left: auto; background: transparent; border: 1px solid #4a5243; color: #d9decf; border-radius: 8px; padding: 4px 10px; font-size: 12px; cursor: pointer; }
.pl-mini--warn:hover { border-color: #c46a5a; color: #c46a5a; }
</style>