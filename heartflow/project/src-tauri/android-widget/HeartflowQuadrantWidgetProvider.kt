// ============================================================
// 四象限任务卡（2×2）
// 数据源：快照 quadrant（前端 modules/tasks 的 quadrant-board 引擎产出，
// 与自律工坊四象限看板共用同一任务池，不另造数据）。
// 刷新：系统 updatePeriodMillis + WidgetBridge 广播（数据一变即时刷新）。
// ============================================================

package com.heartflow.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class HeartflowQuadrantWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) {
            updateWidget(context, appWidgetManager, id)
        }
    }

    companion object {
        private val LABEL_IDS = intArrayOf(R.id.q1_label, R.id.q2_label, R.id.q3_label, R.id.q4_label)
        private val COUNT_IDS = intArrayOf(R.id.q1_count, R.id.q2_count, R.id.q3_count, R.id.q4_count)
        private val DEFAULT_LABELS = arrayOf("重要且紧急", "重要不紧急", "紧急不重要", "不急不重要")

        fun updateWidget(context: Context, mgr: AppWidgetManager, widgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_quadrant)
            val snap = WidgetSnapshot.read(context)

            val q = snap.optJSONObject("quadrant")
            val cols = q?.optJSONArray("cols")
            for (i in 0 until 4) {
                val c = cols?.optJSONObject(i)
                val label = c?.optString("label").orEmpty().ifEmpty { DEFAULT_LABELS[i] }
                views.setTextViewText(LABEL_IDS[i], label)
                views.setTextViewText(COUNT_IDS[i], (c?.optInt("active", 0) ?: 0).toString())
            }
            views.setTextViewText(R.id.quadrant_total, "${q?.optInt("total", 0) ?: 0} 件待推进")

            // 点击整卡唤起主 Activity
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pi = PendingIntent.getActivity(
                context, 8, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            views.setOnClickPendingIntent(R.id.widget_root, pi)

            mgr.updateAppWidget(widgetId, views)
        }
    }
}
