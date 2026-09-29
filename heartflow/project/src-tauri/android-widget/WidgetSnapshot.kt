// ============================================================
// 心流小组件共享快照读取器（首批五卡共用）
// 数据源：前端 pushSystemWidgetSnapshot → Rust sync_widget_data
//   写入 app_data_dir/widget_data.json（Android 上 app_data_dir = filesDir）。
// ============================================================

package com.heartflow.app

import android.content.Context
import org.json.JSONObject
import java.io.File

object WidgetSnapshot {
    private const val SNAPSHOT_FILE = "widget_data.json"

    /** 读取快照；文件不存在或损坏时返回空对象（各 Provider 用 opt* 兜底） */
    fun read(context: Context): JSONObject {
        return try {
            val f = File(context.filesDir, SNAPSHOT_FILE)
            if (f.exists()) JSONObject(f.readText()) else JSONObject()
        } catch (_: Exception) {
            JSONObject()
        }
    }
}
