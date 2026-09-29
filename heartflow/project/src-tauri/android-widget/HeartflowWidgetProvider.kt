// ============================================================
// 心流 Android 桌面小组件（AppWidgetProvider）
// 数据流：前端 pushSystemWidgetSnapshot → Rust sync_widget_data
//   写入 app_data_dir/widget_data.json（Android 上 app_data_dir = filesDir）
//   → 本 Provider onUpdate 读取渲染。
// 刷新时机：系统按 updatePeriodMillis（30min）触发 + 用户放置时触发；
//   应用启动/数据变化后如已写新快照，下次系统刷新即生效。
// ============================================================

package com.heartflow.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class HeartflowWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) {
            updateWidget(context, appWidgetManager, id)
        }
    }

    companion object {
        fun updateWidget(context: Context, mgr: AppWidgetManager, widgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_heartflow)
            val snap = WidgetSnapshot.read(context)

            val quoteText = snap.optString("quoteText").ifEmpty { "心之所向，素履以往。" }
            val quoteAuthor = snap.optString("quoteAuthor").ifEmpty { "《易传》" }
            val seasonIcon = snap.optString("seasonIcon").ifEmpty { "🌸" }
            val seasonLabel = snap.optString("seasonLabel").ifEmpty { "春 · 生发" }
            val timerStatus = snap.optString("timerStatus").ifEmpty { "🔒 等待开始" }

            val anchors = StringBuilder()
            val arr = snap.optJSONArray("anchorTop")
            if (arr != null) {
                for (i in 0 until arr.length()) {
                    if (i > 0) anchors.append('\n')
                    anchors.append("○ ").append(arr.optString(i))
                }
            }

            views.setTextViewText(R.id.widget_season, "$seasonIcon $seasonLabel")
            views.setTextViewText(R.id.widget_quote, "「$quoteText」")
            views.setTextViewText(R.id.widget_quote_author, "—— $quoteAuthor")
            views.setTextViewText(
                R.id.widget_anchors,
                if (anchors.isEmpty()) "还没有心锚" else anchors.toString(),
            )
            views.setTextViewText(R.id.widget_timer, timerStatus)

            // 点击整卡唤起主 Activity
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pi = PendingIntent.getActivity(
                context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            views.setOnClickPendingIntent(R.id.widget_root, pi)

            mgr.updateAppWidget(widgetId, views)
        }
    }
}
