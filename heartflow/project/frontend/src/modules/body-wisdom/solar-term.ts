// ============================================================
// 藏象阁 · 节气养生（知源中医「节气养生提醒」借鉴）
// 二十四节气养生日历 + 当前节气养生建议 + 节气打卡
// 宪法兼容：身体感受而非指标，拒绝诊断/建议强制；节气为「象」非「症」
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

// ---- 类型定义 ----

/** 季节 */
export type SolarSeason = '春' | '夏' | '秋' | '冬'

/** 节气养生信息 */
export interface SolarTermWellness {
  /** 节气名 */
  name: string
  /** 月份（1-12） */
  month: number
  /** 大约日期 */
  day: number
  season: SolarSeason
  /** 六气 */
  sixQi: string
  /** 五行 */
  element: string
  /** 养生主题 */
  theme: string
  /** 饮食建议 */
  diet: string[]
  /** 运动建议 */
  exercise: string[]
  /** 穴位按摩 */
  acupressure: { point: string; location: string; benefit: string }[]
  /** 起居作息 */
  lifestyle: string[]
  /** 情志调节 */
  emotional: string[]
  /** 禁忌 */
  taboo: string[]
}

/** 节气打卡记录 */
export interface SolarTermCheckIn {
  term: string
  year: number
  checkedAt: string
  /** 打卡备注 */
  note: string
  /** 是否完成主要养生建议 */
  done: boolean
}

/** 节气养生洞察 */
export interface SolarTermInsight {
  /** 当前节气 */
  current: SolarTermWellness
  /** 下一节气 */
  next: SolarTermWellness | null
  /** 距下一节气天数 */
  daysToNext: number
  /** 季节转换提示 */
  transition: string | null
  /** 节气养生要点 */
  highlights: string[]
}

// ---- 存储键 ----

const STORAGE_KEY = 'hf:body-wisdom:solar-term-checkins'

// ---- 二十四节气养生数据 ----

/** 二十四节气养生数据（日期为大约值） */
export const SOLAR_TERM_WELLNESS: SolarTermWellness[] = [
  {
    name: '立春', month: 2, day: 4, season: '春', sixQi: '厥阴风木', element: '木',
    theme: '生发阳气，疏肝理气',
    diet: ['多食辛甘发散之品：韭菜、香菜、豆芽', '少酸多甘，养护脾胃', '可饮玫瑰花茶疏肝解郁'],
    exercise: ['晨起散步，舒展筋骨', '练习八段锦「双手托天理三焦」', '避免剧烈运动，以微汗为度'],
    acupressure: [
      { point: '太冲', location: '足背第一、二跖骨间', benefit: '疏肝理气，缓解春困' },
      { point: '足三里', location: '膝盖外侧下方3寸', benefit: '健脾胃，助阳气生发' },
    ],
    lifestyle: ['早睡早起，顺应阳气生发', '「春捂」适度，不急于减衣', '多到户外感受春气'],
    emotional: ['保持心情舒畅，忌怒', '多与亲友交流，舒展情志'],
    taboo: ['忌食生冷，损伤阳气', '忌过度进补，春季宜清补'],
  },
  {
    name: '雨水', month: 2, day: 19, season: '春', sixQi: '厥阴风木', element: '木',
    theme: '健脾祛湿，防倒春寒',
    diet: ['多食健脾祛湿之品：山药、薏米、小米', '适当食甘：红枣、蜂蜜', '少食油腻生冷'],
    exercise: ['散步、慢跑等温和运动', '练习太极拳，调和气血', '避免早晚受寒'],
    acupressure: [
      { point: '阴陵泉', location: '小腿内侧胫骨内侧髁下缘', benefit: '健脾利湿' },
      { point: '中脘', location: '上腹部前正中线脐上4寸', benefit: '和胃健脾' },
    ],
    lifestyle: ['注意保暖，尤其护好腰腹', '居室保持干燥通风', '睡前温水泡脚'],
    emotional: ['保持心态平和，避免思虑过度', '可听舒缓音乐放松'],
    taboo: ['忌贪凉饮冷', '忌情绪波动过大'],
  },
  {
    name: '惊蛰', month: 3, day: 5, season: '春', sixQi: '厥阴风木', element: '木',
    theme: '顺肝之性，助益脾气',
    diet: ['多食清淡之品：菠菜、芹菜、春笋', '适当食梨润燥', '少食辛辣刺激'],
    exercise: ['晨练以微汗为宜', '练习伸展运动，唤醒身体', '户外踏青，亲近自然'],
    acupressure: [
      { point: '风池', location: '后颈部枕骨下凹陷处', benefit: '疏风解表，缓解春困' },
      { point: '合谷', location: '手背虎口处', benefit: '疏风通络' },
    ],
    lifestyle: ['早睡早起，规律作息', '注意防风，春季多风', '适当春捂，护好颈背'],
    emotional: ['保持心情舒畅，忌怒', '多接触自然，舒缓情绪'],
    taboo: ['忌熬夜，耗伤肝血', '忌情绪郁结'],
  },
  {
    name: '春分', month: 3, day: 20, season: '春', sixQi: '厥阴风木', element: '木',
    theme: '阴阳平衡，调和肝脾',
    diet: ['饮食宜清淡，荤素搭配', '多食时令蔬菜：荠菜、香椿', '少食偏寒偏热之品'],
    exercise: ['散步、慢跑、放风筝', '练习八段锦，调和阴阳', '运动量适中，不宜过度'],
    acupressure: [
      { point: '太冲', location: '足背第一、二跖骨间', benefit: '疏肝理气' },
      { point: '三阴交', location: '内踝尖上3寸', benefit: '调和肝脾肾' },
    ],
    lifestyle: ['作息规律，早睡早起', '「春分」昼夜平分，宜平衡作息', '适当增减衣物'],
    emotional: ['保持心态平和，忌大喜大悲', '可练习冥想，安定心神'],
    taboo: ['忌暴饮暴食', '忌过度劳累'],
  },
  {
    name: '清明', month: 4, day: 5, season: '春', sixQi: '少阴君火', element: '火',
    theme: '疏肝养阳，防过敏',
    diet: ['多食清淡：荠菜、菠菜、山药', '适当食辛温发散之品', '过敏体质少食海鲜发物'],
    exercise: ['踏青、登山等户外活动', '练习八段锦，舒展筋骨', '运动后及时擦汗防受凉'],
    acupressure: [
      { point: '足三里', location: '膝盖外侧下方3寸', benefit: '健脾胃，增强体质' },
      { point: '迎香', location: '鼻翼外缘中点旁', benefit: '通鼻窍，防过敏' },
    ],
    lifestyle: ['早睡早起，顺应阳气', '注意防风保暖', '过敏季节外出戴口罩'],
    emotional: ['清明时节易感怀，注意调节情绪', '多与家人朋友相聚'],
    taboo: ['忌情绪过度悲伤', '忌食发物过量'],
  },
  {
    name: '谷雨', month: 4, day: 20, season: '春', sixQi: '少阴君火', element: '火',
    theme: '健脾祛湿，养肝护肝',
    diet: ['多食祛湿之品：薏米、赤小豆、冬瓜', '适当食绿叶蔬菜', '少食生冷油腻'],
    exercise: ['散步、慢跑等温和运动', '练习太极拳，健脾祛湿', '避免久坐'],
    acupressure: [
      { point: '阴陵泉', location: '小腿内侧胫骨内侧髁下缘', benefit: '健脾利湿' },
      { point: '足三里', location: '膝盖外侧下方3寸', benefit: '健脾胃' },
    ],
    lifestyle: ['居室通风，防潮防湿', '早睡早起，规律作息', '适当午休'],
    emotional: ['保持心情舒畅', '可听音乐放松心情'],
    taboo: ['忌贪凉饮冷', '忌久居潮湿之地'],
  },
  {
    name: '立夏', month: 5, day: 5, season: '夏', sixQi: '少阴君火', element: '火',
    theme: '养心安神，顾护阳气',
    diet: ['多食养心之品：莲子、百合、红枣', '适当食苦味：苦瓜、莲子心', '饮食清淡，多饮温水'],
    exercise: ['晨练宜早，避免正午暴晒', '游泳、散步等清凉运动', '运动后及时补充水分'],
    acupressure: [
      { point: '内关', location: '腕横纹上2寸', benefit: '宁心安神' },
      { point: '神门', location: '腕横纹尺侧端', benefit: '养心安神' },
    ],
    lifestyle: ['晚睡早起，午间小憩', '「夏不坐木」，避免久坐湿木', '注意防暑降温'],
    emotional: ['保持心情舒畅，忌急躁', '可静坐养心，安定心神'],
    taboo: ['忌大汗淋漓，耗伤心气', '忌贪凉饮冷过度'],
  },
  {
    name: '小满', month: 5, day: 21, season: '夏', sixQi: '少阴君火', element: '火',
    theme: '清热利湿，防暑防湿',
    diet: ['多食清热利湿之品：冬瓜、苦瓜、绿豆', '适当食酸：山楂、乌梅', '少食辛辣油腻'],
    exercise: ['温和运动，避免大汗', '散步、瑜伽等', '运动后及时擦干'],
    acupressure: [
      { point: '曲池', location: '屈肘时肘横纹外侧端', benefit: '清热利湿' },
      { point: '丰隆', location: '小腿前外侧外踝尖上8寸', benefit: '化痰祛湿' },
    ],
    lifestyle: ['居室通风，防潮防湿', '注意防晒防暑', '多饮温水，少饮冷饮'],
    emotional: ['保持心态平和', '避免烦躁易怒'],
    taboo: ['忌贪凉饮冷', '忌暴晒久处高温'],
  },
  {
    name: '芒种', month: 6, day: 6, season: '夏', sixQi: '少阳相火', element: '火',
    theme: '清热祛湿，养心健脾',
    diet: ['多食清淡祛湿：绿豆、薏米、冬瓜', '适当食苦味食物', '多饮茶：绿茶、菊花茶'],
    exercise: ['早晚运动，避开正午', '游泳、散步等', '运动后及时补水'],
    acupressure: [
      { point: '内关', location: '腕横纹上2寸', benefit: '宁心安神' },
      { point: '足三里', location: '膝盖外侧下方3寸', benefit: '健脾胃' },
    ],
    lifestyle: ['「芒种」忙种，注意劳逸结合', '午间小憩，养心安神', '注意防暑降温'],
    emotional: ['保持心情舒畅', '避免情绪急躁'],
    taboo: ['忌大汗后立即冲凉', '忌贪凉饮冷过度'],
  },
  {
    name: '夏至', month: 6, day: 21, season: '夏', sixQi: '少阳相火', element: '火',
    theme: '养心安神，护阳防暑',
    diet: ['多食清淡：绿豆汤、酸梅汤', '适当食苦味：苦瓜、莲子', '少食辛辣油腻'],
    exercise: ['早晚运动，避免正午', '游泳、散步等清凉运动', '运动后补充水分和盐分'],
    acupressure: [
      { point: '神门', location: '腕横纹尺侧端', benefit: '养心安神' },
      { point: '涌泉', location: '足底前1/3凹陷处', benefit: '引火下行，安神' },
    ],
    lifestyle: ['「夏至一阴生」，注意养阴', '午间小憩，养心安神', '晚睡早起，顺应阳气'],
    emotional: ['保持心态平和，忌急躁', '可静坐冥想，安定心神'],
    taboo: ['忌大汗淋漓', '忌贪凉饮冷过度'],
  },
  {
    name: '小暑', month: 7, day: 7, season: '夏', sixQi: '少阳相火', element: '火',
    theme: '清热解暑，健脾养胃',
    diet: ['多食清热解暑：绿豆、西瓜、冬瓜', '适当食酸：柠檬、山楂', '少食生冷油腻'],
    exercise: ['早晚运动，避开高温', '游泳、散步等', '运动后及时补水'],
    acupressure: [
      { point: '曲池', location: '屈肘时肘横纹外侧端', benefit: '清热解暑' },
      { point: '足三里', location: '膝盖外侧下方3寸', benefit: '健脾胃' },
    ],
    lifestyle: ['注意防暑降温', '居室通风，避免闷热', '多饮温水，少饮冷饮'],
    emotional: ['保持心情舒畅', '「心静自然凉」，避免烦躁'],
    taboo: ['忌暴晒久处高温', '忌贪凉饮冷过度'],
  },
  {
    name: '大暑', month: 7, day: 23, season: '夏', sixQi: '少阳相火', element: '火',
    theme: '清热祛湿，防暑降温',
    diet: ['多食清热祛湿：冬瓜、薏米、绿豆', '适当食苦味食物', '多饮温水，补充水分'],
    exercise: ['避免高温时段运动', '室内运动为主', '运动后及时补水'],
    acupressure: [
      { point: '曲池', location: '屈肘时肘横纹外侧端', benefit: '清热利湿' },
      { point: '丰隆', location: '小腿前外侧外踝尖上8寸', benefit: '化痰祛湿' },
    ],
    lifestyle: ['注意防暑降温，避免中暑', '午间小憩，养心安神', '居室通风降温'],
    emotional: ['保持心情平静', '避免情绪烦躁'],
    taboo: ['忌暴晒久处高温', '忌贪凉饮冷过度'],
  },
  {
    name: '立秋', month: 8, day: 7, season: '秋', sixQi: '太阴湿土', element: '土',
    theme: '润肺养阴，收敛阳气',
    diet: ['多食润肺之品：梨、百合、银耳', '适当食酸：葡萄、山楂', '少食辛辣'],
    exercise: ['散步、慢跑等温和运动', '练习八段锦，润肺养气', '运动量适中'],
    acupressure: [
      { point: '列缺', location: '桡骨茎突上方腕横纹上1.5寸', benefit: '宣肺止咳' },
      { point: '足三里', location: '膝盖外侧下方3寸', benefit: '健脾胃' },
    ],
    lifestyle: ['早睡早起，顺应秋收', '「秋冻」适度，不急于添衣', '注意润燥'],
    emotional: ['保持心情舒畅，忌悲秋', '多与朋友交流'],
    taboo: ['忌食辛辣过度', '忌情绪悲伤'],
  },
  {
    name: '处暑', month: 8, day: 23, season: '秋', sixQi: '太阴湿土', element: '土',
    theme: '润肺养阴，健脾祛湿',
    diet: ['多食润肺祛湿：梨、百合、薏米', '适当食酸收敛', '少食辛辣油腻'],
    exercise: ['散步、慢跑等温和运动', '练习太极拳', '避免过度出汗'],
    acupressure: [
      { point: '列缺', location: '桡骨茎突上方腕横纹上1.5寸', benefit: '宣肺止咳' },
      { point: '阴陵泉', location: '小腿内侧胫骨内侧髁下缘', benefit: '健脾利湿' },
    ],
    lifestyle: ['早睡早起，规律作息', '注意润燥，多饮水', '适当增减衣物'],
    emotional: ['保持心情舒畅', '避免悲秋情绪'],
    taboo: ['忌食辛辣过度', '忌熬夜'],
  },
  {
    name: '白露', month: 9, day: 7, season: '秋', sixQi: '太阴湿土', element: '土',
    theme: '润肺防燥，养阴敛气',
    diet: ['多食润肺之品：梨、银耳、蜂蜜', '适当食酸：石榴、柠檬', '少食辛辣燥热'],
    exercise: ['散步、慢跑等温和运动', '练习八段锦，润肺养气', '运动后及时补水'],
    acupressure: [
      { point: '列缺', location: '桡骨茎突上方腕横纹上1.5寸', benefit: '宣肺润燥' },
      { point: '太渊', location: '腕掌侧横纹桡侧端', benefit: '补肺益气' },
    ],
    lifestyle: ['「白露身不露」，注意保暖', '早睡早起，顺应秋收', '注意润燥，多饮水'],
    emotional: ['保持心情舒畅', '避免悲秋情绪'],
    taboo: ['忌食辛辣燥热', '忌受凉'],
  },
  {
    name: '秋分', month: 9, day: 23, season: '秋', sixQi: '太阴湿土', element: '土',
    theme: '阴阳平衡，润肺养阴',
    diet: ['饮食宜清淡滋润', '多食时令果蔬：梨、藕、山药', '少食辛辣燥热'],
    exercise: ['散步、慢跑、登山', '练习八段锦，调和阴阳', '运动量适中'],
    acupressure: [
      { point: '列缺', location: '桡骨茎突上方腕横纹上1.5寸', benefit: '宣肺润燥' },
      { point: '三阴交', location: '内踝尖上3寸', benefit: '调和肝脾肾' },
    ],
    lifestyle: ['作息规律，早睡早起', '「秋分」昼夜平分，宜平衡作息', '注意润燥保暖'],
    emotional: ['保持心态平和', '可练习冥想，安定心神'],
    taboo: ['忌暴饮暴食', '忌食辛辣过度'],
  },
  {
    name: '寒露', month: 10, day: 8, season: '秋', sixQi: '阳明燥金', element: '金',
    theme: '润肺防燥，养阴护阳',
    diet: ['多食润肺之品：银耳、百合、芝麻', '适当食酸收敛', '少食辛辣燥热'],
    exercise: ['散步、慢跑等温和运动', '练习八段锦，润肺养气', '运动后及时补水'],
    acupressure: [
      { point: '太渊', location: '腕掌侧横纹桡侧端', benefit: '补肺益气' },
      { point: '足三里', location: '膝盖外侧下方3寸', benefit: '健脾胃' },
    ],
    lifestyle: ['「寒露」注意保暖，尤其足部', '早睡早起，顺应秋收', '睡前温水泡脚'],
    emotional: ['保持心情舒畅', '避免悲秋情绪'],
    taboo: ['忌食辛辣燥热', '忌受凉'],
  },
  {
    name: '霜降', month: 10, day: 23, season: '秋', sixQi: '阳明燥金', element: '金',
    theme: '润肺养阴，健脾进补',
    diet: ['多食润肺健脾：山药、栗子、银耳', '适当进补：羊肉、牛肉', '少食生冷'],
    exercise: ['散步、慢跑等温和运动', '练习太极拳', '避免过度出汗'],
    acupressure: [
      { point: '足三里', location: '膝盖外侧下方3寸', benefit: '健脾胃，补气血' },
      { point: '关元', location: '脐下3寸', benefit: '温阳补气' },
    ],
    lifestyle: ['注意保暖，防寒防燥', '早睡早起，规律作息', '睡前温水泡脚'],
    emotional: ['保持心情舒畅', '多晒太阳，舒缓情绪'],
    taboo: ['忌食生冷', '忌受凉'],
  },
  {
    name: '立冬', month: 11, day: 7, season: '冬', sixQi: '阳明燥金', element: '金',
    theme: '敛阳藏精，补肾养藏',
    diet: ['多食温补之品：羊肉、核桃、黑芝麻', '适当食黑色食物：黑豆、黑米', '少食生冷'],
    exercise: ['温和运动，避免大汗', '散步、太极等', '运动后注意保暖'],
    acupressure: [
      { point: '关元', location: '脐下3寸', benefit: '温阳补肾' },
      { point: '涌泉', location: '足底前1/3凹陷处', benefit: '补肾固精' },
    ],
    lifestyle: ['「冬藏」，早睡晚起', '注意保暖，尤其腰背', '睡前温水泡脚'],
    emotional: ['保持心情平静，忌躁动', '可静坐养神'],
    taboo: ['忌大汗淋漓', '忌食生冷'],
  },
  {
    name: '小雪', month: 11, day: 22, season: '冬', sixQi: '阳明燥金', element: '金',
    theme: '温阳补肾，防寒保暖',
    diet: ['多食温补之品：羊肉、牛肉、红枣', '适当食黑色食物', '少食生冷'],
    exercise: ['温和运动，避免大汗', '室内运动为主', '运动后注意保暖'],
    acupressure: [
      { point: '关元', location: '脐下3寸', benefit: '温阳补肾' },
      { point: '肾俞', location: '腰部第二腰椎棘突下旁开1.5寸', benefit: '补肾益气' },
    ],
    lifestyle: ['注意保暖，尤其腰背足部', '早睡晚起，顺应冬藏', '睡前温水泡脚'],
    emotional: ['保持心情平静', '多晒太阳，舒缓情绪'],
    taboo: ['忌食生冷', '忌受凉'],
  },
  {
    name: '大雪', month: 12, day: 7, season: '冬', sixQi: '太阳寒水', element: '水',
    theme: '温阳补肾，防寒养藏',
    diet: ['多食温补之品：羊肉、狗肉、核桃', '适当食黑色食物', '少食生冷'],
    exercise: ['温和运动，避免大汗', '室内运动为主', '运动后注意保暖'],
    acupressure: [
      { point: '关元', location: '脐下3寸', benefit: '温阳补肾' },
      { point: '涌泉', location: '足底前1/3凹陷处', benefit: '补肾固精' },
    ],
    lifestyle: ['注意保暖，防寒防冻', '早睡晚起，顺应冬藏', '睡前温水泡脚'],
    emotional: ['保持心情平静', '避免情绪波动'],
    taboo: ['忌大汗淋漓', '忌食生冷'],
  },
  {
    name: '冬至', month: 12, day: 22, season: '冬', sixQi: '太阳寒水', element: '水',
    theme: '养藏固本，温阳补肾',
    diet: ['多食温补之品：羊肉、当归生姜羊肉汤', '适当食黑色食物', '少食生冷'],
    exercise: ['温和运动，避免大汗', '散步、太极等', '运动后注意保暖'],
    acupressure: [
      { point: '关元', location: '脐下3寸', benefit: '温阳补肾' },
      { point: '神阙', location: '肚脐中央', benefit: '温阳散寒' },
    ],
    lifestyle: ['「冬至一阳生」，注意养藏', '早睡晚起，顺应冬藏', '睡前温水泡脚'],
    emotional: ['保持心情平静', '可静坐养神'],
    taboo: ['忌大汗淋漓', '忌食生冷'],
  },
  {
    name: '小寒', month: 1, day: 5, season: '冬', sixQi: '太阳寒水', element: '水',
    theme: '温阳散寒，补肾养藏',
    diet: ['多食温补之品：羊肉、桂圆、红枣', '适当食黑色食物', '少食生冷'],
    exercise: ['温和运动，避免大汗', '室内运动为主', '运动后注意保暖'],
    acupressure: [
      { point: '关元', location: '脐下3寸', benefit: '温阳补肾' },
      { point: '足三里', location: '膝盖外侧下方3寸', benefit: '健脾胃，补气血' },
    ],
    lifestyle: ['注意保暖，防寒防冻', '早睡晚起，顺应冬藏', '睡前温水泡脚'],
    emotional: ['保持心情平静', '多晒太阳，舒缓情绪'],
    taboo: ['忌食生冷', '忌受凉'],
  },
  {
    name: '大寒', month: 1, day: 20, season: '冬', sixQi: '太阳寒水', element: '水',
    theme: '温阳固本，为春生做准备',
    diet: ['多食温补之品：羊肉、牛肉、核桃', '适当食黑色食物', '少食生冷'],
    exercise: ['温和运动，避免大汗', '散步、太极等', '运动后注意保暖'],
    acupressure: [
      { point: '关元', location: '脐下3寸', benefit: '温阳补肾' },
      { point: '涌泉', location: '足底前1/3凹陷处', benefit: '补肾固精' },
    ],
    lifestyle: ['注意保暖，防寒防冻', '早睡晚起，顺应冬藏', '「大寒」过后即立春，注意养藏'],
    emotional: ['保持心情平静', '可静坐养神'],
    taboo: ['忌大汗淋漓', '忌食生冷'],
  },
]

// ---- 节气排序（跨年：小寒/大寒 排最前） ----

/** 按节气时间排序（跨年处理：小寒、大寒 为一年之始） */
export const SOLAR_TERM_ORDER: string[] = [
  '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
  '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
  '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
  '寒露', '霜降', '立冬', '小雪', '大雪', '冬至',
]

/** 季节元信息 */
export const SOLAR_SEASON_META: Record<SolarSeason, { label: string; icon: string; color: string }> = {
  春: { label: '春', icon: '🌱', color: '#8a9a7a' },
  夏: { label: '夏', icon: '☀️', color: '#f0a050' },
  秋: { label: '秋', icon: '🍂', color: '#d4a05a' },
  冬: { label: '冬', icon: '❄️', color: '#6b9fc4' },
}

// ============================================================
// 纯函数
// ============================================================

/** 获取当前节气（基于日期，使用大约日期） */
export function getCurrentSolarTerm(date: Date = new Date()): SolarTermWellness {
  const month = date.getMonth() + 1
  const day = date.getDate()

  // 按 SOLAR_TERM_ORDER 遍历，找最后一个 <= 当前日期的节气
  let current = SOLAR_TERM_WELLNESS.find(t => t.name === '立春')!
  for (const name of SOLAR_TERM_ORDER) {
    const term = SOLAR_TERM_WELLNESS.find(t => t.name === name)!
    // 跨年处理：小寒(1/5)、大寒(1/20) 在立春之前
    if (term.month < month || (term.month === month && term.day <= day)) {
      current = term
    }
  }
  return current
}

/** 获取下一节气 */
export function getNextSolarTerm(currentName: string): SolarTermWellness | null {
  const idx = SOLAR_TERM_ORDER.indexOf(currentName)
  if (idx === -1) return null
  const nextName = SOLAR_TERM_ORDER[(idx + 1) % SOLAR_TERM_ORDER.length]
  return SOLAR_TERM_WELLNESS.find(t => t.name === nextName) ?? null
}

/** 距下一节气天数（大约） */
export function daysToNextSolarTerm(currentName: string, date: Date = new Date()): number {
  const next = getNextSolarTerm(currentName)
  if (!next) return 0
  const current = SOLAR_TERM_WELLNESS.find(t => t.name === currentName)!
  // 计算当前节气日期
  let currentDate = new Date(date.getFullYear(), current.month - 1, current.day)
  // 若当前节气是跨年（小寒/大寒），其日期在上一年
  if (current.month === 1 && date.getMonth() + 1 <= 1) {
    // 当前日期在1月，小寒/大寒在同一年
  } else if (current.month === 1) {
    currentDate = new Date(date.getFullYear() - 1, current.month - 1, current.day)
  }
  let nextDate = new Date(date.getFullYear(), next.month - 1, next.day)
  if (next.month === 1 && current.month !== 1) {
    nextDate = new Date(date.getFullYear() + 1, next.month - 1, next.day)
  }
  const diff = Math.round((nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

/** 节气养生洞察 */
export function solarTermInsights(date: Date = new Date()): SolarTermInsight {
  const current = getCurrentSolarTerm(date)
  const next = getNextSolarTerm(current.name)
  const daysToNext = daysToNextSolarTerm(current.name, date)

  // 季节转换提示
  let transition: string | null = null
  if (current.name === '立春') transition = '冬去春来，阳气初生，注意「春捂」防寒'
  else if (current.name === '立夏') transition = '春末夏初，阳气渐盛，注意养心防暑'
  else if (current.name === '立秋') transition = '夏秋之交，暑气未消，注意润肺防燥'
  else if (current.name === '立冬') transition = '秋去冬来，万物收藏，注意温阳补肾'

  const highlights = [
    `节气主题：${current.theme}`,
    `当前六气：${current.sixQi} · 五行属${current.element}`,
    `饮食要点：${current.diet[0]}`,
    `起居要点：${current.lifestyle[0]}`,
  ]

  return { current, next, daysToNext, transition, highlights }
}

// ============================================================
// useSolarTermStore — 节气打卡
// ============================================================

export function useSolarTermStore() {
  const checkIns = ref<SolarTermCheckIn[]>(storage.getKV<SolarTermCheckIn[]>(STORAGE_KEY, []))

  function persist() {
    storage.setKV(STORAGE_KEY, checkIns.value)
  }

  function load() {
    checkIns.value = storage.getKV<SolarTermCheckIn[]>(STORAGE_KEY, [])
  }

  /** 打卡当前节气 */
  function checkIn(term: string, note: string = '', done: boolean = true): SolarTermCheckIn {
    const year = new Date().getFullYear()
    const record: SolarTermCheckIn = {
      term,
      year,
      checkedAt: new Date().toISOString(),
      note,
      done,
    }
    // 同一年同一节气重复打卡则覆盖
    const idx = checkIns.value.findIndex(c => c.term === term && c.year === year)
    if (idx >= 0) {
      checkIns.value[idx] = record
    } else {
      checkIns.value.push(record)
    }
    persist()
    return record
  }

  /** 是否已打卡当前节气 */
  function isCheckedIn(term: string, year: number = new Date().getFullYear()): boolean {
    return checkIns.value.some(c => c.term === term && c.year === year)
  }

  /** 节气打卡统计 */
  const checkInStats = computed(() => {
    const year = new Date().getFullYear()
    const yearRecords = checkIns.value.filter(c => c.year === year)
    return {
      total: yearRecords.length,
      done: yearRecords.filter(c => c.done).length,
      records: yearRecords,
    }
  })

  return { checkIns, checkIn, isCheckedIn, checkInStats, persist, load }
}

/** 单例模式（与 note 模块 getNoteStore 一致）：跨组件共享打卡状态 */
let _solarTermInstance: ReturnType<typeof useSolarTermStore> | null = null

export function getSolarTermStore() {
  if (!_solarTermInstance) {
    _solarTermInstance = useSolarTermStore()
    _solarTermInstance.load()
  }
  return _solarTermInstance
}
