// ============================================================
// 心锚清单卡（4×2）：对标时光序「待办清单」小组件
// 静态 RemoteViews 文本列表（首批不用 collection widget，稳优先）。
// 数据：快照 anchors 明细（至多 6 条，含倒数天数）。
// ============================================================

package com.heartflow.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class HeartflowAnchorsWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) {
            updateWidget(context, appWidgetManager, id)
        }
    }

    companion object {
        fun updateWidget(context: Context, mgr: AppWidgetManager, widgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_anchors)
            val snap = WidgetSnapshot.read(context)

            val lines = StringBuilder()
            var count = 0
            val arr = snap.optJSONArray("anchors")
            if (arr != null) {
                for (i in 0 until arr.length()) {
                    val a = arr.optJSONObject(i) ?: continue
                    val title = a.optString("title")
                    if (title.isEmpty()) continue
                    val days = a.optInt("daysLeft", -1)
                    if (count > 0) lines.append('\n')
                    lines.append("○ ").append(title)
                    if (days >= 0) lines.append("  ·  ").append(days).append(" 天")
                    count++
                    if (count >= 5) break
                }
            }

            views.setTextViewText(R.id.anchors_count, "$count 项进行中")
            views.setTextViewText(
                R.id.anchors_list,
                if (count == 0) "还没有心锚，回应用许一个吧。" else lines.toString(),
            )

            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pi = PendingIntent.getActivity(
                context, 1, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            views.setOnClickPendingIntent(R.id.widget_root, pi)

            mgr.updateAppWidget(widgetId, views)
        }
    }
}
