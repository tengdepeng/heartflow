// ============================================================
// 系统桌面小组件（desktop-widget）
// 三端路线：Tauri 无边框透明置顶小窗（label = 'desktop-widget'），
// 本组合式负责窗口识别 + 固定/取消固定 + 持久化偏好。
// 移动端路线：Android 桌面小组件（AppWidgetProvider）读取
// app_data_dir/widget_data.json，由 pushSystemWidgetSnapshot 写入。
//
// 持久化键：
//   desktop-widget:pinned   是否已固定到系统桌面（重启后由用户重新唤起）
// ============================================================

import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { storage } from '../../engine/storage'

const PINNED_KEY = 'desktop-widget:pinned'

/** 当前窗口是否为系统桌面小组件窗（仅 Tauri 桌面端成立） */
const isDesktopWidgetWindow = ref<boolean>(false)

/** 用户偏好：是否固定到系统桌面 */
const pinned = ref<boolean>(storage.getKV<boolean>(PINNED_KEY, false))

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/**
 * 探测是否处于桌面小组件窗。命中时给 <html> 加 .desktop-widget-window
 * （透明背景 + 隐藏壳层滚动），并标记 isDesktopWidgetWindow。
 * web / 移动端静默失败。
 */
async function detectDesktopWidgetWindow(): Promise<void> {
  try {
    const mod = await import('@tauri-apps/api/window')
    const w = mod.getCurrentWindow()
    if (w.label === 'desktop-widget') {
      isDesktopWidgetWindow.value = true
      if (typeof document !== 'undefined') {
        document.documentElement.classList.add('desktop-widget-window')
      }
    }
  } catch {
    isDesktopWidgetWindow.value = false
  }
}

/** 固定到系统桌面：唤起（或创建）小组件窗。web/移动端返回 false。 */
async function pinToDesktop(): Promise<boolean> {
  if (!isTauriRuntime()) return false
  try {
    await invoke('show_desktop_widget')
    pinned.value = true
    storage.setKV(PINNED_KEY, true)
    return true
  } catch {
    return false
  }
}

/** 取消固定：隐藏小组件窗。 */
async function unpinFromDesktop(): Promise<void> {
  if (!isTauriRuntime()) return
  try {
    await invoke('hide_desktop_widget')
  } catch {
    /* 窗未创建，静默忽略 */
  }
  pinned.value = false
  storage.setKV(PINNED_KEY, false)
}

/** 切换固定状态，返回切换后的固定态。 */
async function togglePinned(): Promise<boolean> {
  if (pinned.value) {
    await unpinFromDesktop()
    return false
  }
  return pinToDesktop()
}

/** 小组件窗内的「关闭」按钮：隐藏窗口（Rust 侧 CloseRequested 亦转为隐藏）。 */
async function dismissWindow(): Promise<void> {
  if (!isTauriRuntime()) return
  try {
    const mod = await import('@tauri-apps/api/window')
    await mod.getCurrentWindow().hide()
  } catch {
    /* 静默忽略 */
  }
}

/** 心锚明细（清单卡 + 倒数日卡数据源） */
export interface SystemWidgetAnchor {
  title: string
  daysLeft: number
}

/** 同步给 Android 系统小组件的快照结构（与各 HeartflowWidgetProvider 读取字段一一对应） */
export interface SystemWidgetSnapshot {
  quoteText: string
  quoteAuthor: string
  seasonLabel: string
  seasonIcon: string
  /** 心锚标题列表（兼容旧字段，一言卡用） */
  anchorTop: string[]
  /** 心锚明细（清单卡/倒数日卡用，至多 6 条） */
  anchors: SystemWidgetAnchor[]
  /** 番茄状态文案（兼容旧字段） */
  timerStatus: string
  /** 番茄钟明细（专注卡用） */
  timer: { status: string; clock: string; progress: number }
  /** 情绪速记（情绪卡用） */
  emotion: { todayCount: number; lastMood: string }
  /** 速记便签（便签卡用） */
  note: { text: string }
  updatedAt: number
}

/**
 * 推送小组件快照给系统层（Android AppWidgetProvider 读取渲染）。
 * 桌面端写入 app_data_dir 无害；web 端静默跳过。
 */
async function pushSystemWidgetSnapshot(snapshot: SystemWidgetSnapshot): Promise<void> {
  if (!isTauriRuntime()) return
  try {
    await invoke('sync_widget_data', { payload: JSON.stringify(snapshot) })
  } catch {
    /* 命令未注册（旧包体），静默忽略 */
  }
}

export function useDesktopWidget() {
  return {
    isDesktopWidgetWindow,
    pinned,
    detectDesktopWidgetWindow,
    pinToDesktop,
    unpinFromDesktop,
    togglePinned,
    dismissWindow,
    pushSystemWidgetSnapshot,
  }
}
