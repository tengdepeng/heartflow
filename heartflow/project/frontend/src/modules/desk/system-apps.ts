// ============================================================
// 桌面收纳空间 · 系统已安装应用枚举桥
// 调用后端 enumSystemApps（按平台路由），把结果映射成 DeskItem(kind:'app')，
// 并入收纳候选；registry 以 id 为键，供空间解析 appIds → 图标/启动目标。
// web / 无能力时枚举结果为空，收纳面板仍可正常用（仅少一类候选）。
// 不持久化系统应用本身：appIds 只存 id 引用，每次启动重新枚举解析，
// 与房间「只存 ID 引用」的口径一致。
// ============================================================

import { ref, computed } from 'vue'
import { enumSystemApps } from '../../engine/tauri-bridge'
import type { DeskItem } from './types'

export interface SystemApp {
  id: string
  name: string
  exec: string
  icon?: string
}

// 模块级单例：跨视图共享同一份枚举结果
const registry = ref<Map<string, DeskItem>>(new Map())
const loading = ref(false)

/**
 * 触发一次枚举（幂等并发保护：正在枚举时直接返回）。
 * 失败（命令未注册 / 无能力）静默降级为空，不阻断收纳面板。
 */
async function refresh(): Promise<void> {
  if (loading.value) return
  loading.value = true
  try {
    const res = await enumSystemApps()
    if (res.success && res.data) {
      const m = new Map<string, DeskItem>()
      for (const a of res.data) {
        if (!a.id || !a.name) continue
        m.set(a.id, {
          id: a.id,
          name: a.name,
          icon: a.icon || '📦',
          color: '#7c8db5',
          kind: 'app',
          launch: a.exec,
        })
      }
      registry.value = m
    }
  } catch {
    /* 静默降级：系统应用候选为空 */
  } finally {
    loading.value = false
  }
}

export function useSystemApps() {
  const appItems = computed<DeskItem[]>(() => [...registry.value.values()])
  return { appItems, registry, loading, refresh }
}
