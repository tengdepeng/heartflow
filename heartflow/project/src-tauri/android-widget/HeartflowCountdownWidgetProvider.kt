// ============================================================
// 倒数日卡（2×2）：对标时光序「倒数日」小组件
// 取快照中最近到期的心锚（daysLeft 最小）做大字倒数。
// ============================================================

package com.heartflow.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class HeartflowCountdownWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) {
            updateWidget(context, appWidgetManager, id)
        }
    }

    companion object {
        fun updateWidget(context: Context, mgr: AppWidgetManager, widgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_countdown)
            val snap = WidgetSnapshot.read(context)

            // 找 daysLeft 最小的心锚
            var bestTitle = ""
            var bestDays = Int.MAX_VALUE
            val arr = snap.optJSONArray("anchors")
            if (arr != null) {
                for (i in 0 until arr.length()) {
                    val a = arr.optJSONObject(i) ?: continue
                    val days = a.optInt("daysLeft", Int.MAX_VALUE)
                    val title = a.optString("title")
                    if (title.isNotEmpty() && days < bestDays) {
                        bestDays = days
                        bestTitle = title
                    }
                }
            }

            if (bestTitle.isEmpty()) {
                views.setTextViewText(R.id.cd_days, "—")
                views.setTextViewText(R.id.cd_unit, "暂无倒数")
                views.setTextViewText(R.id.cd_title, "回应用许一个心锚吧")
            } else {
                views.setTextViewText(R.id.cd_days, bestDays.toString())
                views.setTextViewText(R.id.cd_unit, "天后")
                views.setTextViewText(R.id.cd_title, bestTitle)
            }

            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pi = PendingIntent.getActivity(
                context, 2, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            views.setOnClickPendingIntent(R.id.widget_root, pi)

            mgr.updateAppWidget(widgetId, views)
        }
    }
}
