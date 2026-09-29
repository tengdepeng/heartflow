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

    @Command
    fun refreshWidgets(invoke: Invoke) {
        WidgetBridge.refreshAll(activity)
        invoke.resolve(JSObject())
    }
}
