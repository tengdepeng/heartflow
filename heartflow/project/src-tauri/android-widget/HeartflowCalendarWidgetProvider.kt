// ============================================================
// 月历卡（4×3）：对标时光序「日历月视图」小组件
// 42 格静态单元（6 行 × 7 列）——首批不用 GridView collection
// widget，静态格稳定可靠；月份数据由系统日历原生计算，离线可用。
// 今日高亮：accent 圆底 + 反白字。
// ============================================================

package com.heartflow.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import java.util.Calendar

class HeartflowCalendarWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) {
            updateWidget(context, appWidgetManager, id)
        }
    }

    companion object {
        private const val COLOR_DAY = 0xFFC6D0E8.toInt()
        private const val COLOR_TODAY = 0xFFFFFFFF.toInt()

        fun updateWidget(context: Context, mgr: AppWidgetManager, widgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_calendar)

            val cal = Calendar.getInstance()
            val year = cal.get(Calendar.YEAR)
            val month = cal.get(Calendar.MONTH)
            val today = cal.get(Calendar.DAY_OF_MONTH)
            views.setTextViewText(R.id.cal_title, "${year}年${month + 1}月")

            cal.set(Calendar.DAY_OF_MONTH, 1)
            // 周日开头的起始偏移（Calendar.SUNDAY=1 → 偏移 0）
            val firstOffset = cal.get(Calendar.DAY_OF_WEEK) - Calendar.SUNDAY
            val daysInMonth = cal.getActualMaximum(Calendar.DAY_OF_MONTH)

            for (i in 0 until 42) {
                val cellId = context.resources.getIdentifier("cell_$i", "id", context.packageName)
                if (cellId == 0) continue
                val day = i - firstOffset + 1
                if (day in 1..daysInMonth) {
                    views.setTextViewText(cellId, day.toString())
                    if (day == today) {
                        views.setInt(cellId, "setBackgroundResource", R.drawable.widget_today_bg)
                        views.setTextColor(cellId, COLOR_TODAY)
                    } else {
                        views.setInt(cellId, "setBackgroundResource", 0)
                        views.setTextColor(cellId, COLOR_DAY)
                    }
                } else {
                    views.setTextViewText(cellId, "")
                    views.setInt(cellId, "setBackgroundResource", 0)
                }
            }

            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pi = PendingIntent.getActivity(
                context, 4, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            views.setOnClickPendingIntent(R.id.widget_root, pi)

            mgr.updateAppWidget(widgetId, views)
        }
    }
}
