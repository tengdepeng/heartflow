// ============================================================
// 情绪速记卡（2×2）：对标时光序「情绪打卡」小组件
// 显示今日情绪记录次数 + 最近一条心情（若无则空态提示）。
// 数据：快照 emotion { todayCount, lastMood }。
// ============================================================

package com.heartflow.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class HeartflowEmotionWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) {
            updateWidget(context, appWidgetManager, id)
        }
    }

    companion object {
        fun updateWidget(context: Context, mgr: AppWidgetManager, widgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_emotion)
            val snap = WidgetSnapshot.read(context)

            val emotion = snap.optJSONObject("emotion")
            val count = emotion?.optInt("todayCount", 0) ?: 0
            val lastMood = emotion?.optString("lastMood")?.ifEmpty { null } ?: ""

            views.setTextViewText(R.id.emotion_count, count.toString())
            views.setTextViewText(R.id.emotion_count_label, if (count == 1) "今日已记 1 次" else "今日已记 $count 次")
            views.setTextViewText(
                R.id.emotion_last,
                if (lastMood.isEmpty()) "还没记，回应用点一下心情吧。" else "最近：$lastMood",
            )

            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pi = PendingIntent.getActivity(
                context, 5, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            views.setOnClickPendingIntent(R.id.widget_root, pi)

            mgr.updateAppWidget(widgetId, views)
        }
    }
}
