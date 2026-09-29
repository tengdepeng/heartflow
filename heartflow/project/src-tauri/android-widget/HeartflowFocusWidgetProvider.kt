// ============================================================
// 专注卡（2×1）：对标时光序「番茄专注」小组件
// 显示番茄钟状态 + 计时 + 进度条（RemoteViews.setProgressBar）。
// 数据：快照 timer { status, clock, progress }。
// ============================================================

package com.heartflow.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class HeartflowFocusWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) {
            updateWidget(context, appWidgetManager, id)
        }
    }

    companion object {
        fun updateWidget(context: Context, mgr: AppWidgetManager, widgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_focus)
            val snap = WidgetSnapshot.read(context)

            val timer = snap.optJSONObject("timer")
            val status = timer?.optString("status")?.ifEmpty { null }
                ?: snap.optString("timerStatus").ifEmpty { "🔒 等待开始" }
            val clock = timer?.optString("clock")?.ifEmpty { null } ?: "00:00"
            val progress = timer?.optInt("progress", 0)?.coerceIn(0, 100) ?: 0

            views.setTextViewText(R.id.focus_status, status)
            views.setTextViewText(R.id.focus_clock, clock)
            views.setProgressBar(R.id.focus_bar, 100, progress, false)

            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pi = PendingIntent.getActivity(
                context, 3, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            views.setOnClickPendingIntent(R.id.widget_root, pi)

            mgr.updateAppWidget(widgetId, views)
        }
    }
}
