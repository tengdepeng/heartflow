// ============================================================
// 心流桌面小组件 · Tauri 移动端命令插件
// 暴露 refreshWidgets 命令，供前端
//   invoke('plugin:heartflowWidgets|refreshWidgets')
// 触发原生即时刷新。仅 Android 生效；iOS 如需可加 Swift 命令（当前未实现）。
// ============================================================

package com.heartflow.app

import android.app.Activity
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import app.tauri.plugin.Invoke

@TauriPlugin
class HeartflowWidgetsPlugin(private val activity: Activity) : Plugin(activity) {

    init {
        // 冷启动即刷新一次：App 重启后 widget 不必等系统 30min 周期才拿到最新快照。
        // 失败静默（widget 尚未放置 / 服务未就绪），不阻断启动。
        runCatching { WidgetBridge.refreshAll(activity) }
    }

    @Command
    fun refreshWidgets(invoke: Invoke) {
        val n = runCatching { WidgetBridge.refreshAll(activity) }.getOrDefault(0)
        val ret = JSObject()
        ret.put("refreshed", n)
        invoke.resolve(ret)
    }
}
