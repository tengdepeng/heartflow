// ============================================================
// 日历热力图卡（6 周 × 7 天 = 42 格）：对标 GitHub 式活跃度格阵
// 数据来自前端推送的 widget_data.json → activityHeatmap（42 日计数，周序在前）。
// 每格按活跃度用品牌琥珀 accent 调 alpha 着色，无活跃日用淡底。
// ============================================================

package com.heartflow.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.json.JSONArray

class HeartflowHeatmapWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) {
            updateWidget(context, appWidgetManager, id)
        }
    }

    companion object {
        private const val ACCENT = 0xFFD4A15A.toInt()   // 品牌琥珀（与前端 --ww-accent 一致）
        private const val BASE = 0xFF252E3A.toInt()      // 无活跃淡底
        private const val WEEKS = 6
        private const val DAYS = 7

        fun updateWidget(context: Context, mgr: AppWidgetManager, widgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_heatmap)

            val arr = WidgetSnapshot.read(context).optJSONArray("activityHeatmap")
            val counts = IntArray(WEEKS * DAYS)
            var max = 1
            if (arr != null) {
                for (i in counts.indices) {
                    val v = if (i < arr.length()) arr.optInt(i, 0) else 0
                    counts[i] = v
                    if (v > max) max = v
                }
            }

            for (i in counts.indices) {
                val cellId = context.resources.getIdentifier("cell_$i", "id", context.packageName)
                if (cellId == 0) continue
                val count = counts[i]
                val color = if (count <= 0) {
                    BASE
                } else {
                    val intensity = 0.25f + (count.toFloat() / max) * 0.75f
                    tint(ACCENT, intensity)
                }
                views.setInt(cellId, "setBackgroundColor", color)
            }

            views.setTextViewText(R.id.heat_title, "近 ${WEEKS} 周活跃")

            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pi = PendingIntent.getActivity(
                context, 6, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            views.setOnClickPendingIntent(R.id.widget_root, pi)

            mgr.updateAppWidget(widgetId, views)
        }

        /** accent 按强度调 alpha（0..1）混入 ARGB */
        private fun tint(accent: Int, intensity: Float): Int {
            val a = (intensity.coerceIn(0f, 1f) * 255).toInt()
            return (accent and 0x00FFFFFF) or (a shl 24)
        }
    }
}
