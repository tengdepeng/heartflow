import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/design-tokens.css'
import './assets/animations.css'
import './assets/layout-contract.css'
import './assets/room-adaptive.css'
import './assets/glass-fallback.css'
// 全局交互状态基线层（焦点环兜底 / 语义态反馈原语 / reduced-motion 守卫）；
// 置末位以作为最终基线覆盖，样式内用 :where() 保持零特异性，不抢组件规则
import './assets/states.css'
import { useStyleStore } from './stores/style'
import { initStorage, flushStorage } from './engine/storage'
import { initPlatform } from './utils/platform'
import { getPerception } from './modules/perception/usePerception'
import { getRuntimeStateBridge } from './resonance/bridges/runtime'
import { useRuntimeStore } from './stores/runtime'
import { useResonance } from './resonance'
import { setRouteSource } from './modules/advisor/featureDictionary'

async function bootstrap() {
  // 容错工具：单个初始化步骤失败只记日志，绝不阻断挂载
  const safe = async (label: string, fn: () => any) => {
    try { await fn() }
    catch (e) { console.error(`[bootstrap] ${label} 初始化失败（已降级）:`, e) }
  }

  // 1. 初始化平台检测（必须在 storage 初始化之前）
  await safe('initPlatform', initPlatform)

  // 1.1 启动 P2 感知层采集器（纯前端，零后端依赖；采集到的状态在 App.vue 订阅写入感知 store）
  safe('perception', () => getPerception().start())

  // 2. 初始化存储引擎（Tauri FS 或 localStorage）
  await safe('initStorage', initStorage)

  // 2.1 注册关闭/隐藏前 flush，确保异步持久化落盘，避免数据丢失
  const flush = () => { void flushStorage() }
  window.addEventListener('beforeunload', flush)
  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushStorage()
  })

  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  app.use(router)

  // 把真实路由表注入幕僚功能词典（featureDictionary 不静态 import router，
  // 否则会把 createRouter 副作用带进所有引用它的模块图，测试中会整片崩）
  setRouteSource(() => router.getRoutes())

  // 根组件渲染错误兜底：避免子组件异常导致整体白屏（仅记日志，Vue 仍会渲染其余部分）
  app.config.errorHandler = (err, _instance, info) => {
    console.error('[Vue render error]', info, err)
  }
  app.config.warnHandler = (_msg) => { /* 静默 Vue 警告，避免噪音 */ }

  // 3. 初始化共鸣协议层
  safe('resonance', () => {
    const resonance = useResonance()
    resonance.initialize()
  })

  // 4. 绑定 RuntimeState 桥接器到真实的 runtime store
  safe('runtimeBridge', () => {
    const runtimeStore = useRuntimeStore()
    const bridge = getRuntimeStateBridge()
    bridge.bind(
      () => runtimeStore.isSanctuaryActive,
      () => runtimeStore.enterSanctuary(),
      () => runtimeStore.exitSanctuary(),
    )
  })

  // 初始化风格包（在挂载前应用 CSS 变量）
  safe('styleStore', () => {
    const styleStore = useStyleStore()
    styleStore.init()
  })

  // 挂载（即使以上步骤有失败，也必须挂载，保证界面可见）
  app.mount('#app')
}

bootstrap().catch((e) => {
  // 极端情况下 bootstrap 整体抛错：在 #app 渲染可见错误，避免纯白屏
  console.error('[bootstrap] 致命错误:', e)
  const el = document.getElementById('app')
  if (el && !el.innerHTML.trim()) {
    el.innerHTML = `<div style="padding:24px;font-family:sans-serif;color:#e8c97a">
      <h2>启动失败</h2><pre style="white-space:pre-wrap">${String(e && e.stack || e)}</pre></div>`
  }
})

