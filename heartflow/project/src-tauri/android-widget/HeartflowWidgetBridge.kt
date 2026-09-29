// ============================================================
// 心流 Android 桌面小组件 · 即时刷新桥
// 机制：前端 pushWidgetSnapshotNow 写完 widget_data.json 后，
// 经 Kotlin @TauriPlugin 命令（HeartflowWidgetsPlugin）调用本对象，
// 对全部 7 个 Provider 广播 ACTION_APPWIDGET_UPDATE，
// 跳过系统默认的 30min 刷新周期，实现「数据一变即时刷新」。
// ============================================================

package com.heartflow.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent

object WidgetBridge {

    /** 全部心流原生小组件 Provider（与 android-widget 规范源一一对应） */
    private val PROVIDERS: Array<Class<out AppWidgetProvider>> = arrayOf(
        HeartflowWidgetProvider::class.java,
        HeartflowAnchorsWidgetProvider::class.java,
        HeartflowCountdownWidgetProvider::class.java,
        HeartflowFocusWidgetProvider::class.java,
        HeartflowCalendarWidgetProvider::class.java,
        HeartflowEmotionWidgetProvider::class.java,
        HeartflowNoteWidgetProvider::class.java,
    )

    /**
     * 立即刷新所有已放置的心流小组件。
     * 仅对「当前确有实例」的 Provider 发广播，避免无谓刷新。
     */
    fun refreshAll(context: Context) {
        val mgr = AppWidgetManager.getInstance(context)
        for (clazz in PROVIDERS) {
            val ids = mgr.getAppWidgetIds(ComponentName(context, clazz))
            if (ids.isNullOrEmpty()) continue
            val intent = Intent(context, clazz).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            }
            context.sendBroadcast(intent)
        }
    }
}
