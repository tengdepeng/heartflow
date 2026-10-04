# MT2 APK 分析报告

> 数据来源：MT MCP（http://192.168.1.17:8787/mcp）只读工作区，逐个 打开→读取 AndroidManifest→列原生库→列 assets→Compose 探测→关闭。
> 生成时间：2026-10-04 07:35

## 一、总览

| 指标 | 数值 |
| --- | --- |
| APK 总数 | 96 |
| 成功分析 | 96 |
| 失败 | 0 |
| 总体积 | 7680.4 MB |
| 平均 dex 类数 | 18861 |

## 二、技术栈分布（文件指纹 + Compose 探测）

| 技术栈 | 数量 |
| --- | --- |
| 原生/Java-Kotlin | 59 |
| Compose | 20 |
| Flutter | 14 |
| ReactNative | 6 |
| Unity | 4 |

## 三、体积 Top 15

| App | 包名 | 版本 | 体积(MB) | dex 类数 | 技术栈 |
| --- | --- | --- | --- | --- | --- |
| 星空漫步 | `com.zwoasi.mount` | 1.8.0 | 829.2 | 37624 | 原生/Java-Kotlin |
| 人工桌面 | `com.mihoyo.desktopportal` | 2.2.1.72 | 319.4 | 18863 | 原生/Java-Kotlin |
| 知源中医 | `com.nineton.tcm` | 5.2.2 | 281.8 | 43 | Flutter+Unity |
| WorkBuddy | `com.tencent.workbuddy.app` | 2.5.0 | 268.9 | 15339 | Flutter |
| 华为运动健康 | `com.huawei.health` | 17.0.7.320 | 256.6 | 85949 | 原生/Java-Kotlin |
| AR星座 | `com.fancyar.star` | 3.5.2 | 246.6 | 7754 | Unity |
| 奶酪单词 | `com.jdjdc.jdfastjdc` | 4.4.6 | 218 | 4 | 原生/Java-Kotlin |
| 知源经络穴位 | `com.mc.acupoint_3d` | 4.5.0 | 203.7 | 5 | Flutter+Unity |
| 组件岛Widget Island | `cn.widgetisland.theme` | 2.0.7 | 198 | 4 | 原生/Java-Kotlin |
| 每日减脂 | `jianzhi.cn.day` | 5.5.0 | 193.3 | 17644 | Compose+Flutter |
| 无痛单词Pro | `tech.xiangzi.painlesx` | 4.6.1 | 175.2 | 22139 | Compose |
| 堪舆山水卫星地图 | `com.future.compass` | 1.6.0 | 171.1 | 65 | 原生/Java-Kotlin |
| 中医通 | `com.uchappy.riddles` | 6.0.1 | 157 | 4 | 原生/Java-Kotlin |
| OneNote | `com.microsoft.office.onenote` | 16.0.19725.20156 | 145.4 | 56038 | Compose |
| 小米运动健康 | `com.mi.health` | 3.59.1 | 143.6 | 106581 | ReactNative |

## 四、代码规模 Top 15（dex 类数）

| App | dex 类数 | dex 数 | zip 条目 | 组件(A/S/R/P) | 技术栈 |
| --- | --- | --- | --- | --- | --- |
| Keep | 126694 | 16 | 26903 | 132/2/0/0 | Compose |
| 小米运动健康 | 106581 | 13 | 11241 | 93/15/8/3 | ReactNative |
| 华为运动健康 | 85949 | 46 | 13784 | 17/0/0/1 | 原生/Java-Kotlin |
| 可灵AI | 75841 | 8 | 4138 | 54/2/0/2 | Compose+ReactNative |
| ima | 69285 | 15 | 3756 | 20/28/12/5 | Compose |
| 每日英语听力 | 58848 | 11 | 7346 | 156/6/8/3 | 原生/Java-Kotlin |
| OneNote | 56038 | 6 | 48119 | 86/1/1/0 | Compose |
| 识典古籍 | 50047 | 7 | 2234 | 75/61/14/13 | 原生/Java-Kotlin |
| 欧路词典 | 48727 | 7 | 4977 | 123/7/4/1 | 原生/Java-Kotlin |
| 微信读书 | 47804 | 7 | 7152 | 90/24/15/10 | Compose+ReactNative |
| 多邻国 | 45931 | 12 | 12569 | 134/4/1/2 | Compose |
| 嗅觉浏览器 | 39697 | 6 | 2804 | 56/10/2/2 | 原生/Java-Kotlin |
| 海阔视界 | 38978 | 5 | 3134 | 56/11/4/2 | 原生/Java-Kotlin |
| 星空漫步 | 37624 | 5 | 18854 | 23/9/10/4 | 原生/Java-Kotlin |
| 工时记录 | 37484 | 5 | 1686 | 113/13/3/16 | 原生/Java-Kotlin |

## 五、权限画像

### 5.1 高频权限 Top 20

| 权限 | 出现次数 |
| --- | --- |
| `android.permission.INTERNET` | 92 |
| `android.permission.ACCESS_NETWORK_STATE` | 88 |
| `android.permission.WAKE_LOCK` | 75 |
| `android.permission.ACCESS_WIFI_STATE` | 74 |
| `android.permission.WRITE_EXTERNAL_STORAGE` | 74 |
| `android.permission.READ_EXTERNAL_STORAGE` | 73 |
| `android.permission.FOREGROUND_SERVICE` | 72 |
| `android.permission.VIBRATE` | 66 |
| `android.permission.POST_NOTIFICATIONS` | 55 |
| `android.permission.REQUEST_INSTALL_PACKAGES` | 54 |
| `android.permission.CAMERA` | 45 |
| `android.permission.CHANGE_NETWORK_STATE` | 42 |
| `android.permission.RECEIVE_BOOT_COMPLETED` | 40 |
| `android.permission.READ_PHONE_STATE` | 39 |
| `com.google.android.gms.permission.AD_ID` | 36 |
| `com.asus.msa.SupplementaryDID.ACCESS` | 36 |
| `android.permission.CHANGE_WIFI_STATE` | 36 |
| `android.permission.RECORD_AUDIO` | 35 |
| `android.permission.QUERY_ALL_PACKAGES` | 34 |
| `android.permission.SYSTEM_ALERT_WINDOW` | 33 |

### 5.2 敏感权限分布

| 类别 | 命中 App 数 | 占比 |
| --- | --- | --- |
| 日历 | 8 | 8% |
| 定位 | 35 | 36% |
| 安装包 | 54 | 56% |
| 麦克风 | 35 | 36% |
| 无障碍 | 3 | 3% |
| 通讯录 | 4 | 4% |
| 通话记录 | 2 | 2% |
| 存储 | 79 | 82% |
| 悬浮窗 | 33 | 34% |
| 精确闹钟 | 15 | 16% |
| 相机 | 45 | 47% |
| 查询全部应用 | 34 | 35% |
| 身体活动 | 6 | 6% |
| 短信 | 1 | 1% |

## 六、按 Heartflow 房间分类

### 中医/经络 （7）

| App | 包名 | 版本 | MB | SDK | 技术栈 | dex 类 |
| --- | --- | --- | --- | --- | --- | --- |
| 知源中医 | `com.nineton.tcm` | 5.2.2 | 281.8 | 26-36 | Flutter+Unity | 43 |
| 知源经络穴位 | `com.mc.acupoint_3d` | 4.5.0 | 203.7 | 24-35 | Flutter+Unity | 5 |
| 中医通 | `com.uchappy.riddles` | 6.0.1 | 157 | 21-33 | 原生/Java-Kotlin | 4 |
| 中医经络穴位流注 | `com.yinplusplus.meridianzw` | 3.0 | 70 | 26-32 | Compose | 18477 |
| 快背中医 | `com.walkdare.recite` | 2.1.5 | 49.6 | 21-34 | Flutter | 14773 |
| 人纪针灸2021.2.11 | `org.geometerplus.zlibrary.ui.YYebook190811101115` | 1.4.5 | 39.1 | 19-28 | 原生/Java-Kotlin | 3662 |
| 中医经络穴位典籍 | `com.jlxwpaf.vtbi` | 1.1 | 30.1 | 23-29 | 原生/Java-Kotlin | 26489 |

### 天文/观星 （6）

| App | 包名 | 版本 | MB | SDK | 技术栈 | dex 类 |
| --- | --- | --- | --- | --- | --- | --- |
| 星空漫步 | `com.zwoasi.mount` | 1.8.0 | 829.2 | 26-35 | 原生/Java-Kotlin | 37624 |
| AR星座 | `com.fancyar.star` | 3.5.2 | 246.6 | 26-35 | Unity | 7754 |
| 天文通 | `com.twtapp` | 3.5.2 | 104.2 | 24-36 | Compose+Flutter | 27979 |
| 灵占算命八字星座 | `predictor.ui` | 24.7 | 64.4 | 14-26 | 原生/Java-Kotlin | 7 |
| 观星 | `com.x.istar` | 2.1.7 | 42.4 | 23-30 | 原生/Java-Kotlin | 4 |
| 天文大师 | `com.app.micai.tianwen` | 1.3.2 | 39 | 24-30 | 原生/Java-Kotlin | 27616 |

### 地图/地球 （3）

| App | 包名 | 版本 | MB | SDK | 技术栈 | dex 类 |
| --- | --- | --- | --- | --- | --- | --- |
| 堪舆山水卫星地图 | `com.future.compass` | 1.6.0 | 171.1 | 24-36 | 原生/Java-Kotlin | 65 |
| 元地球Earth | `com.earth.bdspace` | 4.6.5.2 | 86.4 | 24-30 | Unity | 3 |
| 全球街景高清地图 | `com.qbqj.bdwxgjx` | 1.1.3 | 68.1 | 24-29 | 原生/Java-Kotlin | 32301 |

### 语言/单词 （12）

| App | 包名 | 版本 | MB | SDK | 技术栈 | dex 类 |
| --- | --- | --- | --- | --- | --- | --- |
| 奶酪单词 | `com.jdjdc.jdfastjdc` | 4.4.6 | 218 | 24-37 | 原生/Java-Kotlin | 4 |
| 无痛单词Pro | `tech.xiangzi.painlesx` | 4.6.1 | 175.2 | 26-35 | Compose | 22139 |
| 每日英语听力 | `com.eusoft.ting.en` | 26.6.0 | 133 | 23-34 | 原生/Java-Kotlin | 58848 |
| 不背单词 | `cn.com.langeasy.LangEasyLexis` | 5.11.6 | 121.4 | 21-34 | 原生/Java-Kotlin | 4 |
| 欧路词典 | `com.eusoft.eudic` | 26.9.1 | 112.8 | 23-34 | 原生/Java-Kotlin | 48727 |
| AI翻译通 | `com.hnmg.translate.master` | 2.2.4 | 92.7 | 24-31 | 原生/Java-Kotlin | 36627 |
| 多邻国 | `com.duolingo` | 6.20.2 | 65.6 | 29-34 | Compose | 45931 |
| Quizlet | `com.quizlet.quizletandroid` | 9.38 | 49.4 | 26-35 | Compose | 32184 |
| Readable | `co.playlingo.readable` | 95 | 42 | 24-34 | ReactNative | 4 |
| 英语词根词缀手册 | `com.yinplusplus.englishdict` | 10.8 | 39.9 | 26-34 | Compose | 25057 |
| 百词斩托福 | `com.chaoui.toefl.app` | 2.0.6 | 29.6 | 21-31 | Flutter | 9621 |
| 超级翻译官 | `cjfyg.translate.topfyg` | 1.0.3 | 21.1 | 26-35 | 原生/Java-Kotlin | 10158 |

### 阅读/古籍 （8）

| App | 包名 | 版本 | MB | SDK | 技术栈 | dex 类 |
| --- | --- | --- | --- | --- | --- | --- |
| 微信读书 | `com.tencent.weread` | 10.2.2 | 130.3 | 24-33 | Compose+ReactNative | 47804 |
| 识典古籍 | `com.shidianguji.android` | 4.9.0 | 110.5 | 26-34 | 原生/Java-Kotlin | 50047 |
| 微信听书 | `com.tencent.wehear` | 1.0.50 | 97 | 23-31 | Compose+ReactNative | 27597 |
| 网易爆米花 | `com.netease.filmlytv` | 2.12.10 | 53.2 | 21-35 | 原生/Java-Kotlin | 19636 |
| 番茄浏览阅读器 | `com.filhshqw.xrkbnywp.exejzeel` | 2.0.0 | 52.3 | 15-31 | 原生/Java-Kotlin | 8 |
| 静读天下专业版 | `com.flyersoft.moonreaderp` | 8.3 | 33.1 | 21-33 | 原生/Java-Kotlin | 22170 |
| 搜古籍 | `uni.app.UNI54EF3B0` | 1.0.0 | 25.6 | 21-28 | 原生/Java-Kotlin | 17037 |
| 若风阅读 | `com.wintheshow.quickreply` | 1008 | 19.5 | 21-30 | 原生/Java-Kotlin | 16524 |

### 笔记/写作 （10）

| App | 包名 | 版本 | MB | SDK | 技术栈 | dex 类 |
| --- | --- | --- | --- | --- | --- | --- |
| OneNote | `com.microsoft.office.onenote` | 16.0.19725.20156 | 145.4 | 28-35 | Compose | 56038 |
| 知识星球 | `com.unnoo.quan` | 5.46.0 | 137.7 | 24-34 | Flutter | 4 |
| 闪卡与笔记 | `com.bluemobile.flashnotes` | 1.2.2 | 112.4 | 24-35 | Flutter | 18218 |
| 云上写作 | `com.yunshangxiezuo.apk` | 8.1 | 72.3 | 29-33 | 原生/Java-Kotlin | 17551 |
| ima | `com.tencent.ima` | 2.6.11.0580 | 62.5 | 24-36 | Compose | 69285 |
| OpenWrite | `com.openwrite.app` | 2.0.1 | 29.9 | 24-36 | Flutter | 3826 |
| 纯纯写作 | `com.drakeet.purewriter` | 29.11.0 | 29.7 | 23-35 | 原生/Java-Kotlin | 14550 |
| 轻羽写作 | `core.writer` | 1.85.7 | 12.5 | 21-34 | 原生/Java-Kotlin | 4 |
| 周公解梦 | `com.zhima.dream` | 9.4.8 | 9.2 | 21-28 | 原生/Java-Kotlin | 11520 |
| 椒盐笔记 | `com.moriafly.note` | 0.29.10-预售版 | 9.1 | 24-33 | Compose | 8996 |

### 时间/任务 （7）

| App | 包名 | 版本 | MB | SDK | 技术栈 | dex 类 |
| --- | --- | --- | --- | --- | --- | --- |
| 时光序 | `com.duorong.smarttool` | 4.21.0 | 130.6 | 24-30 | 原生/Java-Kotlin | 4 |
| 工时记录 | `io.dcloud.H5D4EC138` | 8.0.8 | 37.7 | 24-35 | 原生/Java-Kotlin | 37484 |
| 万年日历 | `wnl.cn.chuantong` | 2.0.00 | 35.8 | 24-31 | 原生/Java-Kotlin | 4 |
| 时光提醒 | `com.imzhiqiang.time` | 1.11.1 | 17.5 | 24-35 | Compose | 28491 |
| 时钟 | `com.android.deskclock` | 17.71.0 | 17 | 26-35 | 原生/Java-Kotlin | 14456 |
| 人升 | `net.sarasarasa.lifeup` | 1.106.0-alpha02 | 14.3 | 23-36 | 原生/Java-Kotlin | 16520 |
| 云人升 | `net.lifeupapp.lifeup.http` | 1.3.0 | 9.8 | 21-32 | 原生/Java-Kotlin | 11449 |

### 音乐/音频 （5）

| App | 包名 | 版本 | MB | SDK | 技术栈 | dex 类 |
| --- | --- | --- | --- | --- | --- | --- |
| 青听音乐 | `com.qingmusic.changqinh` | 2.3.9 | 42.2 | 24-34 | ReactNative | 20040 |
| 天天静听 | `com.chen.ttasmr` | 4.3.2 | 19.6 | 21-29 | Flutter | 1 |
| 听点音乐Pro | `com.gushi.music` | 1.0.6 | 15.1 | 24-35 | Compose | 12091 |
| 音乐标签 | `com.xjcheng.musictageditor` | @7F11022C | 11 | 16-28 | 原生/Java-Kotlin | 4 |
| Salt Player | `com.salt.music` | 12.3.2 | 9.6 | 23-36 | Compose | 11441 |

### 健康/运动 （5）

| App | 包名 | 版本 | MB | SDK | 技术栈 | dex 类 |
| --- | --- | --- | --- | --- | --- | --- |
| 华为运动健康 | `com.huawei.health` | 17.0.7.320 | 256.6 | 26-35 | 原生/Java-Kotlin | 85949 |
| 每日减脂 | `jianzhi.cn.day` | 5.5.0 | 193.3 | 24-36 | Compose+Flutter | 17644 |
| 小米运动健康 | `com.mi.health` | 3.59.1 | 143.6 | 26-35 | ReactNative | 106581 |
| Keep | `com.gotokeep.keep` | 9.1.70 | 133.2 | 21-30 | Compose | 126694 |
| 正气 | `com.zhengnengliang.precepts` | 8.3.7 | 38.4 | 21-33 | 原生/Java-Kotlin | 656 |

### 玄学/命理 （5）

| App | 包名 | 版本 | MB | SDK | 技术栈 | dex 类 |
| --- | --- | --- | --- | --- | --- | --- |
| 生辰 | `com.chanyouji.birth` | 2.2.16 | 93.7 | 24-36 | 原生/Java-Kotlin | 84 |
| 文墨天机 | `air.com.ziwei001.zwmobilepro` | 2.5.3 | 39.3 | 19-29 | 原生/Java-Kotlin | 9137 |
| 批八字算命 | `com.nfbazi.pibazi` | 1.81 | 5.5 | 26-28 | 原生/Java-Kotlin | 4 |
| 批八字算命 | `com.nfzhouyi.pibazi` | 2.32 | 4.8 | 29-34 | 原生/Java-Kotlin | 350 |
| 称骨算命 | `com.xiaosage.stapp` | 1.0 | 3.3 | 15-26 | 原生/Java-Kotlin | 3135 |

### 护眼/专注 （3）

| App | 包名 | 版本 | MB | SDK | 技术栈 | dex 类 |
| --- | --- | --- | --- | --- | --- | --- |
| OffScreen | `tech.miidii.offscreen_android.domestic` | 1.2.4 | 38.1 | 28-34 | 原生/Java-Kotlin | 5581 |
| 夜间模式 | `com.chenai.eyes` | 26.09.10 | 7.1 | 21-33 | 原生/Java-Kotlin | 158 |
| 屏幕录制 | `com.miui.screenrecorder` | 4.15.3.5.1 | 4.5 | 29-35 | 原生/Java-Kotlin | 3322 |

### AI/助手 （8）

| App | 包名 | 版本 | MB | SDK | 技术栈 | dex 类 |
| --- | --- | --- | --- | --- | --- | --- |
| WorkBuddy | `com.tencent.workbuddy.app` | 2.5.0 | 268.9 | 24-36 | Flutter | 15339 |
| 可灵AI | `com.kwai.kling` | 3.8.41.514 | 93.8 | 28-35 | Compose+ReactNative | 75841 |
| 秘塔AI搜索 | `com.metaso` | 2.8.1 | 52.4 | 24-35 | Compose | 32107 |
| Kimi | `com.moonshot.kimichat` | 3.1.2 | 34.3 | 26-36 | Compose | 29954 |
| 系统语音引擎 | `com.xiaomi.mibrain.speech` | 1.6.0 | 31.9 | 21-33 | 原生/Java-Kotlin | 17634 |
| DeepSeek | `com.deepseek.chat` | 2.6.1 | 21.2 | 23-36 | Compose | 15484 |
| IMYAI | `com.imyai.app` | 2.0.8 | 5.2 | 26-34 | 原生/Java-Kotlin | 8176 |
| 超级小爱 | `com.miui.voiceassistProxy` | 1.5.0 | 1.4 | 21-33 | 原生/Java-Kotlin | 3069 |

### 工具/系统 （15）

| App | 包名 | 版本 | MB | SDK | 技术栈 | dex 类 |
| --- | --- | --- | --- | --- | --- | --- |
| 人工桌面 | `com.mihoyo.desktopportal` | 2.2.1.72 | 319.4 | 21-33 | 原生/Java-Kotlin | 18863 |
| 组件岛Widget Island | `cn.widgetisland.theme` | 2.0.7 | 198 | 24-33 | 原生/Java-Kotlin | 4 |
| 酷安 | `com.coolapk.market` | 16.6.2 | 111.4 | 24-34 | Flutter | 30 |
| 小组件盒子 | `io.iftech.android.box` | 1.27.39 | 94.3 | 24-36 | 原生/Java-Kotlin | 84 |
| 相册 | `com.miui.gallery` | 4.3.1.18 | 85.4 | 31-35 | 原生/Java-Kotlin | 32293 |
| OCAT | `com.drakeet.deepocat` | 9.8.2 | 62.8 | 24-36 | Flutter | 5235 |
| 电工仿真软件 | `com.mshd.tools.electrician.simulation` | 9.1.0 | 49.5 | 24-31 | 原生/Java-Kotlin | 28058 |
| 嗅觉浏览器 | `com.hiker.youtoo` | 6.81 | 39.7 | 23-30 | 原生/Java-Kotlin | 39697 |
| 天气 | `com.miui.weather2` | 17.1.0.27-R | 30.8 | 24-35 | Flutter | 0 |
| 自动点击器 | `autoclicker.clicker.autoclickerapp.autoclickerforgames` | 1.3.1 | 25.4 | 28-34 | 原生/Java-Kotlin | 20860 |
| 蛋蛋分享库 | `com.android.dandan` | 2.0 | 16 | 15-31 | 原生/Java-Kotlin | 4618 |
| 单位换算 | `com.androidapps.unitconverter` | 2.2.54 | 9.2 | 21-35 | 原生/Java-Kotlin | 6027 |
| 花简空间 | `com.one.huane` | 2.0.5 | 8.4 | 21-34 | 原生/Java-Kotlin | 9322 |
| 站长后台APP | `cn.x13sz.ds` | 1.4.9 | 3.9 | 19-30 | 原生/Java-Kotlin | 3885 |
| 密码 | `com.miui.password` | 1.0.15 | 0 | 24-35 | 原生/Java-Kotlin | 1 |

### 其他（2）

| App | 包名 | 版本 | MB | 技术栈 | dex 类 |
| --- | --- | --- | --- | --- | --- |
| 海阔视界 | `com.example.hikerview` | 8.81 | 40.1 | 原生/Java-Kotlin | 38978 |
| 中华汉语字典 | `com.hyzd.byxm` | 1.006 | 29.8 | 原生/Java-Kotlin | 6937 |

## 七、全量明细

| # | App | 包名 | 版本 | MB | minSdk-targetSdk | dex类 | A/S/R/P | 权限数 | 原生库 | 技术栈 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 百词斩托福 | `com.chaoui.toefl.app` | 2.0.6 | 29.6 | 21-31 | 9621 | 24/3/1/5 | 15 | 3 | Flutter |
| 2 | 不背单词 | `cn.com.langeasy.LangEasyLexis` | 5.11.6 | 121.4 | 21-34 | 4 | 97/19/6/5 | 27 | 22 | 原生/Java-Kotlin |
| 3 | 超级翻译官 | `cjfyg.translate.topfyg` | 1.0.3 | 21.1 | 26-35 | 10158 | 41/3/2/4 | 35 | 4 | 原生/Java-Kotlin |
| 4 | 超级小爱 | `com.miui.voiceassistProxy` | 1.5.0 | 1.4 | 21-33 | 3069 | 1/0/0/1 | 1 | 0 | 原生/Java-Kotlin |
| 5 | 称骨算命 | `com.xiaosage.stapp` | 1.0 | 3.3 | 15-26 | 3135 | 9/0/0/1 | 5 | 3 | 原生/Java-Kotlin |
| 6 | 纯纯写作 | `com.drakeet.purewriter` | 29.11.0 | 29.7 | 23-35 | 14550 | 48/14/10/2 | 18 | 3 | 原生/Java-Kotlin |
| 7 | 单位换算 | `com.androidapps.unitconverter` | 2.2.54 | 9.2 | 21-35 | 6027 | 115/8/11/3 | 12 | 0 | 原生/Java-Kotlin |
| 8 | 蛋蛋分享库 | `com.android.dandan` | 2.0 | 16 | 15-31 | 4618 | 10/0/0/1 | 7 | 15 | 原生/Java-Kotlin |
| 9 | 电工仿真软件 | `com.mshd.tools.electrician.simulation` | 9.1.0 | 49.5 | 24-31 | 28058 | 119/4/0/5 | 16 | 11 | 原生/Java-Kotlin |
| 10 | 多邻国 | `com.duolingo` | 6.20.2 | 65.6 | 29-34 | 45931 | 134/4/1/2 | 37 | 10 | Compose |
| 11 | 番茄浏览阅读器 | `com.filhshqw.xrkbnywp.exejzeel` | 2.0.0 | 52.3 | 15-31 | 8 | 10/3/2/1 | 10 | 7 | 原生/Java-Kotlin |
| 12 | 工时记录 | `io.dcloud.H5D4EC138` | 8.0.8 | 37.7 | 24-35 | 37484 | 113/13/3/16 | 43 | 27 | 原生/Java-Kotlin |
| 13 | 观星 | `com.x.istar` | 2.1.7 | 42.4 | 23-30 | 4 | 59/5/1/7 | 15 | 11 | 原生/Java-Kotlin |
| 14 | 海阔视界 | `com.example.hikerview` | 8.81 | 40.1 | 23-30 | 38978 | 56/11/4/2 | 34 | 22 | 原生/Java-Kotlin |
| 15 | 花简空间 | `com.one.huane` | 2.0.5 | 8.4 | 21-34 | 9322 | 65/0/1/2 | 12 | 1 | 原生/Java-Kotlin |
| 16 | 华为运动健康 | `com.huawei.health` | 17.0.7.320 | 256.6 | 26-35 | 85949 | 17/0/0/1 | 0 | 49 | 原生/Java-Kotlin |
| 17 | 椒盐笔记 | `com.moriafly.note` | 0.29.10-预售版 | 9.1 | 24-33 | 8996 | 25/5/9/4 | 7 | 8 | Compose |
| 18 | 静读天下专业版 | `com.flyersoft.moonreaderp` | 8.3 | 33.1 | 21-33 | 22170 | 14/3/2/3 | 13 | 6 | 原生/Java-Kotlin |
| 19 | 堪舆山水卫星地图 | `com.future.compass` | 1.6.0 | 171.1 | 24-36 | 65 | 124/16/6/19 | 30 | 32 | 原生/Java-Kotlin |
| 20 | 可灵AI | `com.kwai.kling` | 3.8.41.514 | 93.8 | 28-35 | 75841 | 54/2/0/2 | 60 | 114 | Compose+ReactNative |
| 21 | 酷安 | `com.coolapk.market` | 16.6.2 | 111.4 | 24-34 | 30 | 112/1/0/2 | 58 | 52 | Flutter |
| 22 | 快背中医 | `com.walkdare.recite` | 2.1.5 | 49.6 | 21-34 | 14773 | 10/3/4/2 | 13 | 6 | Flutter |
| 23 | 灵占算命八字星座 | `predictor.ui` | 24.7 | 64.4 | 14-26 | 7 | 259/13/4/1 | 30 | 14 | 原生/Java-Kotlin |
| 24 | 每日减脂 | `jianzhi.cn.day` | 5.5.0 | 193.3 | 24-36 | 17644 | 18/8/13/4 | 28 | 16 | Compose+Flutter |
| 25 | 每日英语听力 | `com.eusoft.ting.en` | 26.6.0 | 133 | 23-34 | 58848 | 156/6/8/3 | 40 | 32 | 原生/Java-Kotlin |
| 26 | 秘塔AI搜索 | `com.metaso` | 2.8.1 | 52.4 | 24-35 | 32107 | 82/27/14/7 | 52 | 16 | Compose |
| 27 | 密码 | `com.miui.password` | 1.0.15 | 0 | 24-35 | 1 | 1/0/0/0 | 1 | 0 | 原生/Java-Kotlin |
| 28 | 奶酪单词 | `com.jdjdc.jdfastjdc` | 4.4.6 | 218 | 24-37 | 4 | 103/5/15/4 | 45 | 50 | 原生/Java-Kotlin |
| 29 | 欧路词典 | `com.eusoft.eudic` | 26.9.1 | 112.8 | 23-34 | 48727 | 123/7/4/1 | 29 | 17 | 原生/Java-Kotlin |
| 30 | 批八字算命 | `com.nfbazi.pibazi` | 1.81 | 5.5 | 26-28 | 4 | 12/0/0/0 | 6 | 0 | 原生/Java-Kotlin |
| 31 | 批八字算命 | `com.nfzhouyi.pibazi` | 2.32 | 4.8 | 29-34 | 350 | 14/0/0/0 | 11 | 1 | 原生/Java-Kotlin |
| 32 | 屏幕录制 | `com.miui.screenrecorder` | 4.15.3.5.1 | 4.5 | 29-35 | 3322 | 4/5/1/2 | 33 | 0 | 原生/Java-Kotlin |
| 33 | 青听音乐 | `com.qingmusic.changqinh` | 2.3.9 | 42.2 | 24-34 | 20040 | 2/4/3/2 | 19 | 19 | ReactNative |
| 34 | 轻羽写作 | `core.writer` | 1.85.7 | 12.5 | 21-34 | 4 | 36/16/12/6 | 21 | 3 | 原生/Java-Kotlin |
| 35 | 全球街景高清地图 | `com.qbqj.bdwxgjx` | 1.1.3 | 68.1 | 24-29 | 32301 | 464/0/0/0 | 19 | 19 | 原生/Java-Kotlin |
| 36 | 人工桌面 | `com.mihoyo.desktopportal` | 2.2.1.72 | 319.4 | 21-33 | 18863 | 19/3/1/3 | 11 | 9 | 原生/Java-Kotlin |
| 37 | 人纪针灸2021.2.11 | `org.geometerplus.zlibrary.ui.YYebook190811101115` | 1.4.5 | 39.1 | 19-28 | 3662 | 50/7/1/0 | 10 | 4 | 原生/Java-Kotlin |
| 38 | 人升 | `net.sarasarasa.lifeup` | 1.106.0-alpha02 | 14.3 | 23-36 | 16520 | 74/9/19/3 | 22 | 3 | 原生/Java-Kotlin |
| 39 | 若风阅读 | `com.wintheshow.quickreply` | 1008 | 19.5 | 21-30 | 16524 | 44/10/1/5 | 18 | 1 | 原生/Java-Kotlin |
| 40 | 闪卡与笔记 | `com.bluemobile.flashnotes` | 1.2.2 | 112.4 | 24-35 | 18218 | 70/20/13/17 | 25 | 14 | Flutter |
| 41 | 生辰 | `com.chanyouji.birth` | 2.2.16 | 93.7 | 24-36 | 84 | 16/0/18/0 | 73 | 33 | 原生/Java-Kotlin |
| 42 | 时光提醒 | `com.imzhiqiang.time` | 1.11.1 | 17.5 | 24-35 | 28491 | 23/9/24/3 | 18 | 4 | Compose |
| 43 | 时光序 | `com.duorong.smarttool` | 4.21.0 | 130.6 | 24-30 | 4 | 124/16/11/0 | 85 | 37 | 原生/Java-Kotlin |
| 44 | 时钟 | `com.android.deskclock` | 17.71.0 | 17 | 26-35 | 14456 | 20/13/7/8 | 55 | 0 | 原生/Java-Kotlin |
| 45 | 识典古籍 | `com.shidianguji.android` | 4.9.0 | 110.5 | 26-34 | 50047 | 75/61/14/13 | 23 | 88 | 原生/Java-Kotlin |
| 46 | 搜古籍 | `uni.app.UNI54EF3B0` | 1.0.0 | 25.6 | 21-28 | 17037 | 23/4/3/6 | 27 | 19 | 原生/Java-Kotlin |
| 47 | 天气 | `com.miui.weather2` | 17.1.0.27-R | 30.8 | 24-35 | 0 | 9/5/5/4 | 25 | 10 | Flutter |
| 48 | 天天静听 | `com.chen.ttasmr` | 4.3.2 | 19.6 | 21-29 | 1 | 25/13/11/10 | 30 | 9 | Flutter |
| 49 | 天文大师 | `com.app.micai.tianwen` | 1.3.2 | 39 | 24-30 | 27616 | 112/19/2/16 | 27 | 22 | 原生/Java-Kotlin |
| 50 | 天文通 | `com.twtapp` | 3.5.2 | 104.2 | 24-36 | 27979 | 75/21/21/14 | 28 | 18 | Compose+Flutter |
| 51 | 听点音乐Pro | `com.gushi.music` | 1.0.6 | 15.1 | 24-35 | 12091 | 2/3/1/2 | 13 | 4 | Compose |
| 52 | 万年日历 | `wnl.cn.chuantong` | 2.0.00 | 35.8 | 24-31 | 4 | 122/13/2/16 | 18 | 14 | 原生/Java-Kotlin |
| 53 | 网易爆米花 | `com.netease.filmlytv` | 2.12.10 | 53.2 | 21-35 | 19636 | 57/9/2/7 | 15 | 17 | 原生/Java-Kotlin |
| 54 | 微信读书 | `com.tencent.weread` | 10.2.2 | 130.3 | 24-33 | 47804 | 90/24/15/10 | 56 | 96 | Compose+ReactNative |
| 55 | 微信听书 | `com.tencent.wehear` | 1.0.50 | 97 | 23-31 | 27597 | 91/28/16/6 | 32 | 99 | Compose+ReactNative |
| 56 | 文墨天机 | `air.com.ziwei001.zwmobilepro` | 2.5.3 | 39.3 | 19-29 | 9137 | 14/2/2/2 | 15 | 6 | 原生/Java-Kotlin |
| 57 | 无痛单词Pro | `tech.xiangzi.painlesx` | 4.6.1 | 175.2 | 26-35 | 22139 | 39/8/10/6 | 18 | 9 | Compose |
| 58 | 系统语音引擎 | `com.xiaomi.mibrain.speech` | 1.6.0 | 31.9 | 21-33 | 17634 | 8/2/0/0 | 16 | 11 | 原生/Java-Kotlin |
| 59 | 相册 | `com.miui.gallery` | 4.3.1.18 | 85.4 | 31-35 | 32293 | 23/0/0/4 | 81 | 24 | 原生/Java-Kotlin |
| 60 | 小米运动健康 | `com.mi.health` | 3.59.1 | 143.6 | 26-35 | 106581 | 93/15/8/3 | 122 | 65 | ReactNative |
| 61 | 小组件盒子 | `io.iftech.android.box` | 1.27.39 | 94.3 | 24-36 | 84 | 16/0/18/1 | 73 | 33 | 原生/Java-Kotlin |
| 62 | 星空漫步 | `com.zwoasi.mount` | 1.8.0 | 829.2 | 26-35 | 37624 | 23/9/10/4 | 25 | 7 | 原生/Java-Kotlin |
| 63 | 嗅觉浏览器 | `com.hiker.youtoo` | 6.81 | 39.7 | 23-30 | 39697 | 56/10/2/2 | 35 | 21 | 原生/Java-Kotlin |
| 64 | 夜间模式 | `com.chenai.eyes` | 26.09.10 | 7.1 | 21-33 | 158 | 21/3/1/1 | 8 | 2 | 原生/Java-Kotlin |
| 65 | 音乐标签 | `com.xjcheng.musictageditor` | @7F11022C | 11 | 16-28 | 4 | 15/2/0/2 | 4 | 2 | 原生/Java-Kotlin |
| 66 | 英语词根词缀手册 | `com.yinplusplus.englishdict` | 10.8 | 39.9 | 26-34 | 25057 | 8/7/12/2 | 6 | 0 | Compose |
| 67 | 元地球Earth | `com.earth.bdspace` | 4.6.5.2 | 86.4 | 24-30 | 3 | 133/2/4/2 | 29 | 38 | Unity |
| 68 | 云人升 | `net.lifeupapp.lifeup.http` | 1.3.0 | 9.8 | 21-32 | 11449 | 3/4/1/3 | 8 | 1 | 原生/Java-Kotlin |
| 69 | 云上写作 | `com.yunshangxiezuo.apk` | 8.1 | 72.3 | 29-33 | 17551 | 62/0/0/2 | 14 | 5 | 原生/Java-Kotlin |
| 70 | 站长后台APP | `cn.x13sz.ds` | 1.4.9 | 3.9 | 19-30 | 3885 | 5/0/0/2 | 12 | 0 | 原生/Java-Kotlin |
| 71 | 正气 | `com.zhengnengliang.precepts` | 8.3.7 | 38.4 | 21-33 | 656 | 176/7/2/1 | 22 | 29 | 原生/Java-Kotlin |
| 72 | 知识星球 | `com.unnoo.quan` | 5.46.0 | 137.7 | 24-34 | 4 | 247/8/10/4 | 30 | 17 | Flutter |
| 73 | 知源经络穴位 | `com.mc.acupoint_3d` | 4.5.0 | 203.7 | 24-35 | 5 | 67/13/16/15 | 54 | 48 | Flutter+Unity |
| 74 | 知源中医 | `com.nineton.tcm` | 5.2.2 | 281.8 | 26-36 | 43 | 213/4/2/0 | 71 | 52 | Flutter+Unity |
| 75 | 中华汉语字典 | `com.hyzd.byxm` | 1.006 | 29.8 | 21-30 | 6937 | 61/9/2/10 | 17 | 3 | 原生/Java-Kotlin |
| 76 | 中医经络穴位典籍 | `com.jlxwpaf.vtbi` | 1.1 | 30.1 | 23-29 | 26489 | 111/14/2/11 | 18 | 17 | 原生/Java-Kotlin |
| 77 | 中医经络穴位流注 | `com.yinplusplus.meridianzw` | 3.0 | 70 | 26-32 | 18477 | 3/6/11/3 | 5 | 0 | Compose |
| 78 | 中医通 | `com.uchappy.riddles` | 6.0.1 | 157 | 21-33 | 4 | 220/0/0/1 | 9 | 11 | 原生/Java-Kotlin |
| 79 | 周公解梦 | `com.zhima.dream` | 9.4.8 | 9.2 | 21-28 | 11520 | 23/5/8/2 | 14 | 0 | 原生/Java-Kotlin |
| 80 | 自动点击器 | `autoclicker.clicker.autoclickerapp.autoclickerforgames` | 1.3.1 | 25.4 | 28-34 | 20860 | 99/26/11/8 | 20 | 2 | 原生/Java-Kotlin |
| 81 | 组件岛Widget Island | `cn.widgetisland.theme` | 2.0.7 | 198 | 24-33 | 4 | 70/3/3/0 | 117 | 42 | 原生/Java-Kotlin |
| 82 | AI翻译通 | `com.hnmg.translate.master` | 2.2.4 | 92.7 | 24-31 | 36627 | 124/18/3/17 | 23 | 20 | 原生/Java-Kotlin |
| 83 | AR星座 | `com.fancyar.star` | 3.5.2 | 246.6 | 26-35 | 7754 | 59/7/1/12 | 27 | 13 | Unity |
| 84 | DeepSeek | `com.deepseek.chat` | 2.6.1 | 21.2 | 23-36 | 15484 | 11/11/5/5 | 22 | 16 | Compose |
| 85 | ima | `com.tencent.ima` | 2.6.11.0580 | 62.5 | 24-36 | 69285 | 20/28/12/5 | 30 | 20 | Compose |
| 86 | IMYAI | `com.imyai.app` | 2.0.8 | 5.2 | 26-34 | 8176 | 4/0/1/2 | 19 | 0 | 原生/Java-Kotlin |
| 87 | Keep | `com.gotokeep.keep` | 9.1.70 | 133.2 | 21-30 | 126694 | 132/2/0/0 | 77 | 86 | Compose |
| 88 | Kimi | `com.moonshot.kimichat` | 3.1.2 | 34.3 | 26-36 | 29954 | 29/18/7/7 | 41 | 22 | Compose |
| 89 | OCAT | `com.drakeet.deepocat` | 9.8.2 | 62.8 | 24-36 | 5235 | 13/14/14/3 | 17 | 4 | Flutter |
| 90 | OffScreen | `tech.miidii.offscreen_android.domestic` | 1.2.4 | 38.1 | 28-34 | 5581 | 44/8/6/2 | 26 | 2 | 原生/Java-Kotlin |
| 91 | OneNote | `com.microsoft.office.onenote` | 16.0.19725.20156 | 145.4 | 28-35 | 56038 | 86/1/1/0 | 35 | 37 | Compose |
| 92 | OpenWrite | `com.openwrite.app` | 2.0.1 | 29.9 | 24-36 | 3826 | 3/5/4/3 | 13 | 6 | Flutter |
| 93 | Quizlet | `com.quizlet.quizletandroid` | 9.38 | 49.4 | 26-35 | 32184 | 7/0/0/0 | 24 | 6 | Compose |
| 94 | Readable | `co.playlingo.readable` | 95 | 42 | 24-34 | 4 | 11/14/12/7 | 14 | 68 | ReactNative |
| 95 | Salt Player | `com.salt.music` | 12.3.2 | 9.6 | 23-36 | 11441 | 16/7/7/5 | 22 | 18 | Compose |
| 96 | WorkBuddy | `com.tencent.workbuddy.app` | 2.5.0 | 268.9 | 24-36 | 15339 | 15/10/3/10 | 27 | 34 | Flutter |

