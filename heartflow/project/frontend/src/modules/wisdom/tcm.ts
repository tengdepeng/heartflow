// ============================================================
// 知微阁 · 中医经络穴位典籍 (模块三十四)
// 借鉴中医经络穴位典籍 / 人纪针灸：
//   - 经络穴位结构化知识（经络 → 穴位 → 定位 / 主治 / 经典引用）
//   - 经典原文与白话翻译双栏对照
//   - 子午流注 24 小时圆环表盘
//   - 穴位歌诀卡片（四总穴歌 / 八会穴歌 / 流注歌）
// 内容为传统文化知识呈现，非医疗建议；纯函数 + 本地收藏持久化。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

// ============================================================
// 类型定义
// ============================================================

/** 一条经络 */
export interface Meridian {
  id: string
  /** 名称（如：手太阴肺经） */
  name: string
  /** 英文缩写（如 LU） */
  code: string
  /** 阴阳属性（阴 / 阳） */
  polarity: '阴' | '阳'
  /** 五行（如：金） */
  element: string
  /** 流注时辰（如：寅时） */
  period: string
  /** 流注小时段（如 [3, 5]） */
  hours: [number, number]
  /** 循行概述 */
  path: string
  /** 主治要点 */
  indications: string
}

/** 一个穴位 */
export interface Acupoint {
  id: string
  /** 穴名（如：合谷） */
  name: string
  /** 拼音 */
  pinyin: string
  /** 国际代码（如 LI4） */
  code: string
  /** 所属经络 id */
  meridianId: string
  /** 定位 */
  location: string
  /** 主治 */
  indications: string
  /** 经典引用（出处 + 原文） */
  classic?: { source: string; text: string }
}

/** 经典原文对照条目 */
export interface ClassicExcerpt {
  id: string
  /** 书名（如《黄帝内经·素问》） */
  book: string
  /** 篇章 */
  chapter: string
  /** 原文 */
  original: string
  /** 白话翻译 */
  vernacular: string
}

/** 穴位歌诀 */
export interface AcupointSong {
  id: string
  title: string
  content: string
  note: string
}

/** 子午流注时段 */
export interface MeridianSlot {
  /** 时辰名（如：子时） */
  period: string
  /** 起始小时 */
  start: number
  /** 结束小时 */
  end: number
  /** 经络 */
  meridian: Meridian
}

// ============================================================
// 经络数据（十二正经 + 任督二脉）
// ============================================================

export const MERIDIANS: Meridian[] = [
  { id: 'lu', name: '手太阴肺经', code: 'LU', polarity: '阴', element: '金', period: '寅时', hours: [3, 5], path: '起于中焦，下络大肠，还循胃口，上膈属肺，从肺系横出腋下，循臂内前缘下行，止于拇指桡侧端。', indications: '咳嗽、气喘、咽喉肿痛、胸闷、上肢内侧前缘疼痛。' },
  { id: 'li', name: '手阳明大肠经', code: 'LI', polarity: '阳', element: '金', period: '卯时', hours: [5, 7], path: '起于食指桡侧端，沿上肢外侧前缘上行，经肩、颈，止于对侧鼻翼旁。', indications: '齿痛、咽喉肿痛、鼻塞、腹痛、上肢外侧前缘疼痛。' },
  { id: 'st', name: '足阳明胃经', code: 'ST', polarity: '阳', element: '土', period: '辰时', hours: [7, 9], path: '起于鼻翼旁，循面下行，经胸腹、下肢外侧前缘，止于第二趾外侧端。', indications: '胃痛、腹胀、呕吐、食欲不振、下肢前缘疼痛。' },
  { id: 'sp', name: '足太阴脾经', code: 'SP', polarity: '阴', element: '土', period: '巳时', hours: [9, 11], path: '起于足大趾内侧端，沿下肢内侧前缘上行，入腹属脾络胃，止于舌下。', indications: '腹胀、便溏、食欲不振、身重乏力、月经不调。' },
  { id: 'ht', name: '手少阴心经', code: 'HT', polarity: '阴', element: '火', period: '午时', hours: [11, 13], path: '起于心中，出属心系，下膈络小肠，沿上肢内侧后缘下行，止于小指桡侧端。', indications: '心悸、失眠、健忘、胸痛、上肢内侧后缘疼痛。' },
  { id: 'si', name: '手太阳小肠经', code: 'SI', polarity: '阳', element: '火', period: '未时', hours: [13, 15], path: '起于小指尺侧端，沿上肢外侧后缘上行，经肩胛，止于耳前。', indications: '头项强痛、肩臂痛、耳鸣、颊肿、腹痛。' },
  { id: 'bl', name: '足太阳膀胱经', code: 'BL', polarity: '阳', element: '水', period: '申时', hours: [15, 17], path: '起于目内眦，上额交巅，循头项、脊柱两侧下行，经下肢后侧，止于小趾外侧端。', indications: '头痛、项背强痛、腰背痛、下肢后侧疼痛、小便异常。' },
  { id: 'ki', name: '足少阴肾经', code: 'KI', polarity: '阴', element: '水', period: '酉时', hours: [17, 19], path: '起于足小趾下，斜走足心，沿下肢内侧后缘上行，入腹属肾络膀胱，止于舌根。', indications: '腰膝酸软、耳鸣、失眠、遗尿、月经不调。' },
  { id: 'pc', name: '手厥阴心包经', code: 'PC', polarity: '阴', element: '火', period: '戌时', hours: [19, 21], path: '起于胸中，出属心包络，下膈络三焦，沿上肢内侧中线上行，止于中指端。', indications: '心悸、胸闷、心烦、胃痛、上肢内侧中线疼痛。' },
  { id: 'te', name: '手少阳三焦经', code: 'TE', polarity: '阳', element: '火', period: '亥时', hours: [21, 23], path: '起于无名指尺侧端，沿上肢外侧中线上行，经肩、颈、耳后，止于眉梢。', indications: '耳鸣、耳聋、偏头痛、胁肋痛、上肢外侧中线疼痛。' },
  { id: 'gb', name: '足少阳胆经', code: 'GB', polarity: '阳', element: '木', period: '子时', hours: [23, 1], path: '起于目外眦，绕耳前后，沿头侧、胁肋、下肢外侧中线下行，止于第四趾外侧端。', indications: '偏头痛、口苦、胁痛、下肢外侧疼痛、失眠。' },
  { id: 'lr', name: '足厥阴肝经', code: 'LR', polarity: '阴', element: '木', period: '丑时', hours: [1, 3], path: '起于足大趾背，沿下肢内侧前缘上行，入腹属肝络胆，止于胁肋。', indications: '胁痛、情志不畅、月经不调、头痛、目赤。' },
  { id: 'cv', name: '任脉', code: 'CV', polarity: '阴', element: '—', period: '—', hours: [-1, -1], path: '起于胞中，下出会阴，沿腹胸正中线上行，止于颏唇沟。总任一身之阴经。', indications: '调理月经、培补元气、腹痛、小便不利、虚劳。' },
  { id: 'gv', name: '督脉', code: 'GV', polarity: '阳', element: '—', period: '—', hours: [-1, -1], path: '起于胞中，下出会阴，沿脊柱正中线上行，过头顶，止于上唇系带。总督一身之阳经。', indications: '头痛、项强、腰脊强痛、神志病、发热。' },
]

export function listMeridians(): Meridian[] {
  return MERIDIANS
}

export function meridianById(id: string): Meridian | undefined {
  return MERIDIANS.find((m) => m.id === id)
}

// ============================================================
// 穴位数据（精选常用穴，含经典引用）
// ============================================================

export const ACUPOINTS: Acupoint[] = [
  { id: 'lu7', name: '列缺', pinyin: 'liè quē', code: 'LU7', meridianId: 'lu', location: '前臂桡侧缘，桡骨茎突上方，腕横纹上 1.5 寸。', indications: '头项强痛、咳嗽、气喘、咽喉肿痛、手腕痛。', classic: { source: '《针灸大成》', text: '列缺，腕上一寸五分，主偏风，口眼㖞斜，手肘无力。' } },
  { id: 'lu9', name: '太渊', pinyin: 'tài yuān', code: 'LU9', meridianId: 'lu', location: '腕掌侧横纹桡侧，桡动脉搏动处。', indications: '咳嗽、气喘、咽喉肿痛、腕臂痛、无脉症。', classic: { source: '《灵枢·九针十二原》', text: '阳中之少阴，肺也，其原出于太渊。' } },
  { id: 'lu11', name: '少商', pinyin: 'shào shāng', code: 'LU11', meridianId: 'lu', location: '拇指桡侧指甲角旁约 0.1 寸。', indications: '咽喉肿痛、咳嗽、发热、昏迷、癫狂。', classic: { source: '《针灸大成》', text: '少商，大指内侧端，主咽喉肿痛，心烦。' } },
  { id: 'li4', name: '合谷', pinyin: 'hé gǔ', code: 'LI4', meridianId: 'li', location: '手背，第 1、2 掌骨间，第 2 掌骨桡侧中点。', indications: '头痛、齿痛、目赤、咽喉肿痛、发热、口眼㖞斜。', classic: { source: '《四总穴歌》', text: '面口合谷收。' } },
  { id: 'li11', name: '曲池', pinyin: 'qū chí', code: 'LI11', meridianId: 'li', location: '屈肘，肘横纹外侧端与肱骨外上髁连线中点。', indications: '发热、咽喉肿痛、上肢不遂、高血压、皮肤瘙痒。', classic: { source: '《针灸大成》', text: '曲池，肘外辅骨陷中，主偏风半身不遂，肘中痛。' } },
  { id: 'li10', name: '手三里', pinyin: 'shǒu sān lǐ', code: 'LI10', meridianId: 'li', location: '前臂背面桡侧，阳溪与曲池连线上，肘横纹下 2 寸。', indications: '手臂无力、上肢不遂、腹痛、腹泻、齿痛。', classic: { source: '《针灸大成》', text: '手三里，肘下二寸，主手臂不仁，肘挛不伸。' } },
  { id: 'li20', name: '迎香', pinyin: 'yíng xiāng', code: 'LI20', meridianId: 'li', location: '鼻翼外缘中点旁，鼻唇沟中。', indications: '鼻塞、鼻衄、口眼㖞斜、面痒。', classic: { source: '《针灸甲乙经》', text: '迎香，在鼻下孔傍，主鼻塞不利。' } },
  { id: 'st25', name: '天枢', pinyin: 'tiān shū', code: 'ST25', meridianId: 'st', location: '脐中旁开 2 寸。', indications: '腹胀、腹痛、便秘、泄泻、月经不调。', classic: { source: '《针灸大成》', text: '天枢，脐旁二寸，主泄泻，痢疾，腹胀。' } },
  { id: 'st36', name: '足三里', pinyin: 'zú sān lǐ', code: 'ST36', meridianId: 'st', location: '小腿前外侧，犊鼻下 3 寸，胫骨前嵴外一横指。', indications: '胃痛、腹胀、呕吐、泄泻、虚劳羸瘦、下肢痿痹。', classic: { source: '《四总穴歌》', text: '肚腹三里留。' } },
  { id: 'st40', name: '丰隆', pinyin: 'fēng lóng', code: 'ST40', meridianId: 'st', location: '小腿前外侧，外踝尖上 8 寸，胫骨前嵴外二横指。', indications: '痰多、咳嗽、眩晕、头痛、下肢痿痹。', classic: { source: '《玉龙歌》', text: '痰多宜向丰隆寻。' } },
  { id: 'sp6', name: '三阴交', pinyin: 'sān yīn jiāo', code: 'SP6', meridianId: 'sp', location: '小腿内侧，内踝尖上 3 寸，胫骨内侧缘后际。', indications: '月经不调、带下、遗精、失眠、腹胀、下肢痿痹。', classic: { source: '《针灸大成》', text: '三阴交，内踝上三寸，主妇人月水不调，难产。' } },
  { id: 'sp9', name: '阴陵泉', pinyin: 'yīn líng quán', code: 'SP9', meridianId: 'sp', location: '小腿内侧，胫骨内侧髁下缘与胫骨内侧缘之间的凹陷。', indications: '腹胀、水肿、小便不利、膝痛、泄泻。', classic: { source: '《针灸大成》', text: '阴陵泉，膝下内侧辅骨下陷中，主腹中寒，不嗜食。' } },
  { id: 'sp10', name: '血海', pinyin: 'xuè hǎi', code: 'SP10', meridianId: 'sp', location: '大腿内侧，髌底内侧端上 2 寸。', indications: '月经不调、痛经、瘾疹、皮肤瘙痒、膝痛。', classic: { source: '《针灸甲乙经》', text: '血海，在膝膑上内廉白肉际二寸中。' } },
  { id: 'ht3', name: '少海', pinyin: 'shào hǎi', code: 'HT3', meridianId: 'ht', location: '屈肘，肘横纹内侧端与肱骨内上髁连线中点。', indications: '心痛、肘臂挛痛、瘰疬、头项痛。', classic: { source: '《针灸大成》', text: '少海，肘内廉节后陷中，主心痛，肘挛。' } },
  { id: 'ht7', name: '神门', pinyin: 'shén mén', code: 'HT7', meridianId: 'ht', location: '腕掌侧横纹尺侧端，尺侧腕屈肌腱桡侧凹陷。', indications: '心悸、失眠、健忘、癫狂、胸痛。', classic: { source: '《针灸大成》', text: '神门，掌后锐骨端陷中，主惊悸，怔忡，健忘。' } },
  { id: 'si3', name: '后溪', pinyin: 'hòu xī', code: 'SI3', meridianId: 'si', location: '微握拳，第 5 掌指关节尺侧近端赤白肉际凹陷。', indications: '头项强痛、腰背痛、目赤、耳聋、癫狂。', classic: { source: '《针灸大成》', text: '后溪，手小指本节后陷中，主头项强，不得回顾。' } },
  { id: 'bl1', name: '睛明', pinyin: 'jīng míng', code: 'BL1', meridianId: 'bl', location: '目内眦角稍上方凹陷处。', indications: '目赤肿痛、迎风流泪、近视、夜盲。', classic: { source: '《针灸大成》', text: '睛明，目内眦，主目远视不明，迎风流泪。' } },
  { id: 'bl2', name: '攒竹', pinyin: 'cuán zhú', code: 'BL2', meridianId: 'bl', location: '眉头凹陷中，眶上切迹处。', indications: '头痛、眉棱骨痛、目赤肿痛、眼睑瞤动。', classic: { source: '《针灸甲乙经》', text: '攒竹，在眉头陷者中，主头风痛，目眩。' } },
  { id: 'bl23', name: '肾俞', pinyin: 'shèn shù', code: 'BL23', meridianId: 'bl', location: '腰部，第 2 腰椎棘突下，旁开 1.5 寸。', indications: '腰痛、遗精、阳痿、月经不调、耳鸣、水肿。', classic: { source: '《针灸大成》', text: '肾俞，十四椎下两旁相去脊中各一寸五分，主虚劳羸瘦。' } },
  { id: 'bl40', name: '委中', pinyin: 'wěi zhōng', code: 'BL40', meridianId: 'bl', location: '腘横纹中点，股二头肌腱与半腱肌腱中间。', indications: '腰背痛、下肢痿痹、腹痛、吐泻、小便不利。', classic: { source: '《四总穴歌》', text: '腰背委中求。' } },
  { id: 'ki1', name: '涌泉', pinyin: 'yǒng quán', code: 'KI1', meridianId: 'ki', location: '足底，屈足卷趾时足心最凹陷处。', indications: '头痛、眩晕、失眠、便秘、足心热、昏厥。', classic: { source: '《灵枢·本输》', text: '肾出于涌泉，涌泉者足心也。' } },
  { id: 'ki3', name: '太溪', pinyin: 'tài xī', code: 'KI3', meridianId: 'ki', location: '内踝尖与跟腱之间的凹陷处。', indications: '腰膝酸软、耳鸣、失眠、遗精、月经不调、齿痛。', classic: { source: '《针灸大成》', text: '太溪，足内踝后跟骨上陷中，主久疟咳逆，心痛如锥刺。' } },
  { id: 'pc6', name: '内关', pinyin: 'nèi guān', code: 'PC6', meridianId: 'pc', location: '前臂掌侧，腕横纹上 2 寸，掌长肌腱与桡侧腕屈肌腱之间。', indications: '心悸、胸闷、胃痛、呕吐、失眠、晕车。', classic: { source: '《针灸大成》', text: '内关，掌后去腕二寸，主心痛，胸满，胃痛。' } },
  { id: 'pc8', name: '劳宫', pinyin: 'láo gōng', code: 'PC8', meridianId: 'pc', location: '掌心，第 2、3 掌骨之间偏于第 3 掌骨，握拳屈指时中指尖处。', indications: '心痛、心烦、口疮、口臭、癫狂、鹅掌风。', classic: { source: '《灵枢·本输》', text: '心出于中冲……劳宫，掌中中指本节之内间也。' } },
  { id: 'te5', name: '外关', pinyin: 'wài guān', code: 'TE5', meridianId: 'te', location: '前臂背侧，腕背横纹上 2 寸，尺骨与桡骨之间。', indications: '偏头痛、耳鸣、耳聋、胁肋痛、上肢痹痛、热病。', classic: { source: '《针灸大成》', text: '外关，腕后二寸两骨间，主肘臂不得屈伸，五指尽痛。' } },
  { id: 'te6', name: '支沟', pinyin: 'zhī gōu', code: 'TE6', meridianId: 'te', location: '前臂背侧，腕背横纹上 3 寸，尺骨与桡骨之间。', indications: '便秘、胁肋痛、耳鸣、耳聋、暴喑。', classic: { source: '《针灸大成》', text: '支沟，腕后三寸两骨间陷中，主热病汗不出，便秘。' } },
  { id: 'gb20', name: '风池', pinyin: 'fēng chí', code: 'GB20', meridianId: 'gb', location: '项后，枕骨之下，胸锁乳突肌与斜方肌上端之间凹陷。', indications: '头痛、眩晕、颈项强痛、目赤、感冒、失眠。', classic: { source: '《针灸大成》', text: '风池，在颞颥后发际陷中，主洒淅寒热，头眩。' } },
  { id: 'gb30', name: '环跳', pinyin: 'huán tiào', code: 'GB30', meridianId: 'gb', location: '股外侧，侧卧屈股，股骨大转子最凸点与骶管裂孔连线的外 1/3 与内 2/3 交点。', indications: '腰胯痛、下肢痿痹、半身不遂。', classic: { source: '《针灸大成》', text: '环跳，在髀枢中，主冷风湿痹，腰胯痛。' } },
  { id: 'gb34', name: '阳陵泉', pinyin: 'yáng líng quán', code: 'GB34', meridianId: 'gb', location: '小腿外侧，腓骨头前下方凹陷处。', indications: '胁痛、口苦、下肢痿痹、膝肿痛、筋脉拘挛。', classic: { source: '《八会穴歌》', text: '筋会阳陵泉。' } },
  { id: 'lr3', name: '太冲', pinyin: 'tài chōng', code: 'LR3', meridianId: 'lr', location: '足背，第 1、2 跖骨间，跖骨底结合部前方凹陷。', indications: '头痛、眩晕、目赤、胁痛、月经不调、情志不畅。', classic: { source: '《针灸大成》', text: '太冲，足大指本节后二寸，主心痛脉弦，足寒。' } },
  { id: 'lr14', name: '期门', pinyin: 'qī mén', code: 'LR14', meridianId: 'lr', location: '胸部，第 6 肋间隙，前正中线旁开 4 寸。', indications: '胸胁胀痛、呕吐、呃逆、乳痈、情志不畅。', classic: { source: '《针灸大成》', text: '期门，直乳二肋端，主胸中烦热，胁下胀满。' } },
  { id: 'cv4', name: '关元', pinyin: 'guān yuán', code: 'CV4', meridianId: 'cv', location: '下腹部，前正中线上，脐中下 3 寸。', indications: '虚劳羸瘦、月经不调、遗精、阳痿、腹痛、小便不利。', classic: { source: '《针灸大成》', text: '关元，脐下三寸，主积冷虚乏，脐下绞痛。' } },
  { id: 'cv6', name: '气海', pinyin: 'qì hǎi', code: 'CV6', meridianId: 'cv', location: '下腹部，前正中线上，脐中下 1.5 寸。', indications: '腹痛、泄泻、虚脱、月经不调、遗尿、形体羸瘦。', classic: { source: '《针灸大成》', text: '气海，脐下一寸半宛宛中，主脏气虚惫，真气不足。' } },
  { id: 'cv8', name: '神阙', pinyin: 'shén què', code: 'CV8', meridianId: 'cv', location: '腹部，脐中央。', indications: '腹痛、泄泻、脱肛、水肿、虚脱。', classic: { source: '《针灸大成》', text: '神阙，当脐中，主泄利不止，小儿奶利不绝。' } },
  { id: 'cv12', name: '中脘', pinyin: 'zhōng wǎn', code: 'CV12', meridianId: 'cv', location: '上腹部，前正中线上，脐中上 4 寸。', indications: '胃痛、腹胀、呕吐、吞酸、食欲不振。', classic: { source: '《八会穴歌》', text: '腑会中脘。' } },
  { id: 'cv17', name: '膻中', pinyin: 'dàn zhōng', code: 'CV17', meridianId: 'cv', location: '胸部，前正中线上，平第 4 肋间，两乳头连线中点。', indications: '胸闷、气短、心悸、咳嗽、乳汁不足。', classic: { source: '《八会穴歌》', text: '气会膻中。' } },
  { id: 'gv14', name: '大椎', pinyin: 'dà zhuī', code: 'GV14', meridianId: 'gv', location: '项后，第 7 颈椎棘突下凹陷中。', indications: '发热、恶寒、咳嗽、项强、疟疾、癫狂。', classic: { source: '《针灸大成》', text: '大椎，在第一椎上陷者中，主五劳七伤，风劳食气。' } },
  { id: 'gv20', name: '百会', pinyin: 'bǎi huì', code: 'GV20', meridianId: 'gv', location: '头顶正中线与两耳尖连线的交点处。', indications: '头痛、眩晕、失眠、健忘、脱肛、中风失语。', classic: { source: '《针灸大成》', text: '百会，前顶后一寸五分，主头风中风，言语謇涩。' } },
  { id: 'ex3', name: '印堂', pinyin: 'yìn táng', code: 'EX-HN3', meridianId: 'gv', location: '额部，两眉头连线的中点。', indications: '头痛、眩晕、鼻塞、失眠、小儿惊风。', classic: { source: '《针灸大成》', text: '印堂，两眉间，主小儿惊痫，鼻塞。' } },
  { id: 'ex5', name: '太阳', pinyin: 'tài yáng', code: 'EX-HN5', meridianId: 'gb', location: '颞部，眉梢与目外眦之间向后约一横指凹陷。', indications: '头痛、偏头痛、目赤肿痛、目眩、面痛。', classic: { source: '《奇效良方》', text: '太阳二穴，在眉后陷中，主偏正头风。' } },
]

export function listAcupoints(meridianId?: string): Acupoint[] {
  if (!meridianId) return ACUPOINTS
  return ACUPOINTS.filter((a) => a.meridianId === meridianId)
}

export function acupointById(id: string): Acupoint | undefined {
  return ACUPOINTS.find((a) => a.id === id)
}

/** 穴位检索：穴名 / 拼音 / 代码 / 经络 / 主治 */
export function searchAcupoints(query: string): Acupoint[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return ACUPOINTS.filter((a) => {
    const m = meridianById(a.meridianId)
    return (
      a.name.includes(q) ||
      a.pinyin.toLowerCase().includes(q) ||
      a.code.toLowerCase().includes(q) ||
      a.location.includes(q) ||
      a.indications.includes(q) ||
      (m?.name ?? '').includes(q)
    )
  })
}

// ============================================================
// 子午流注（24 小时圆环表盘）
// ============================================================

/** 十二时辰 → 经络 映射（含小时段） */
export function meridianClock(hour: number): MeridianSlot[] {
  const h = ((hour % 24) + 24) % 24
  const slots: MeridianSlot[] = []
  for (const m of MERIDIANS) {
    if (m.hours[0] < 0) continue
    const start = m.hours[0]
    const end = m.hours[1] <= m.hours[0] ? m.hours[1] + 24 : m.hours[1]
    slots.push({ period: m.period, start, end, meridian: m })
  }
  // 排序：从当前小时所在的时段开始循环
  const activeIdx = slots.findIndex((s) => {
    let sEnd = s.end
    if (sEnd <= s.start) sEnd += 24
    let hh = h
    if (hh < s.start) hh += 24
    return hh >= s.start && hh < sEnd
  })
  if (activeIdx > 0) {
    const rotated = slots.slice(activeIdx).concat(slots.slice(0, activeIdx))
    return rotated
  }
  return slots
}

/** 当前小时所处的经络时段 */
export function activeMeridianSlot(hour: number): MeridianSlot | undefined {
  const h = ((hour % 24) + 24) % 24
  const m = MERIDIANS.filter((mm) => mm.hours[0] >= 0).find((mm) => {
    let start = mm.hours[0]
    let end = mm.hours[1] <= mm.hours[0] ? mm.hours[1] + 24 : mm.hours[1]
    let hh = h
    if (hh < start) hh += 24
    return hh >= start && hh < end
  })
  if (!m) return undefined
  const start = m.hours[0]
  const end = m.hours[1] <= m.hours[0] ? m.hours[1] + 24 : m.hours[1]
  return { period: m.period, start, end, meridian: m }
}

// ============================================================
// 经典原文对照
// ============================================================

export const CLASSIC_EXCERPTS: ClassicExcerpt[] = [
  { id: 'c1', book: '《黄帝内经·素问》', chapter: '上古天真论', original: '上古之人，其知道者，法于阴阳，和于术数，食饮有节，起居有常，不妄作劳，故能形与神俱，而尽终其天年，度百岁乃去。', vernacular: '上古懂得养生之道的人，效法阴阳变化的规律，调和养生方法，饮食有节制，作息有常规，不过度操劳，所以形体与精神都保持健旺，能够活到天赋的自然寿命，超过百岁才离世。' },
  { id: 'c2', book: '《黄帝内经·素问》', chapter: '四气调神大论', original: '春三月，此谓发陈。天地俱生，万物以荣。夜卧早起，广步于庭。', vernacular: '春季三个月，是推陈出新、生命萌发的时节。天地之间生机勃发，万物欣欣向荣。人们应当晚睡早起，在庭院中从容散步。' },
  { id: 'c3', book: '《黄帝内经·素问》', chapter: '生气通天论', original: '阴平阳秘，精神乃治；阴阳离决，精气乃绝。', vernacular: '阴阳平衡协调，精神就安和正常；阴阳分离决绝，精气就会衰竭。' },
  { id: 'c4', book: '《黄帝内经·灵枢》', chapter: '经脉', original: '经脉者，所以能决死生，处百病，调虚实，不可不通。', vernacular: '经脉能够决断生死、处理各种疾病、调理虚实，不可以不通畅。' },
  { id: 'c5', book: '《黄帝内经·素问》', chapter: '阴阳应象大论', original: '怒伤肝，喜伤心，思伤脾，忧伤肺，恐伤肾。', vernacular: '愤怒伤肝，狂喜伤心，思虑伤脾，忧愁伤肺，恐惧伤肾。' },
  { id: 'c6', book: '《黄帝内经·素问》', chapter: '上古天真论', original: '恬惔虚无，真气从之，精神内守，病安从来。', vernacular: '内心恬淡清静、没有过多欲念，真气就会顺从调和，精神内守不耗散，疾病又从哪里来呢。' },
]

export function classicExcerpts(): ClassicExcerpt[] {
  return CLASSIC_EXCERPTS
}

// ============================================================
// 穴位歌诀
// ============================================================

export const ACUPOINT_SONGS: AcupointSong[] = [
  { id: 's1', title: '四总穴歌', content: '肚腹三里留，腰背委中求，头项寻列缺，面口合谷收。', note: '四总穴：足三里、委中、列缺、合谷。' },
  { id: 's2', title: '八会穴歌', content: '腑会中脘脏章门，髓会绝骨筋阳陵，血会膈俞骨大杼，气会膻中脉太渊。', note: '八会穴：中脘、章门、绝骨、阳陵泉、膈俞、大杼、膻中、太渊。' },
  { id: 's3', title: '十二经流注歌', content: '肺寅大卯胃辰宫，脾巳心午小未中，申膀酉肾心包戌，亥焦子胆丑肝通。', note: '十二经气血流注时辰：肺寅、大肠卯、胃辰、脾巳、心午、小肠未、膀胱申、肾酉、心包戌、三焦亥、胆子、肝丑。' },
  { id: 's4', title: '四关穴歌', content: '四关穴，即两合谷、两太冲是也。', note: '四关：双侧合谷、双侧太冲，调理气机之要穴。' },
]

export function acupointSongs(): AcupointSong[] {
  return ACUPOINT_SONGS
}

// ============================================================
// 收藏持久化
// ============================================================

const FAV_KEY = 'hf:tcm_favorites'

const favoriteIds = ref<string[]>(loadFavorites())

function loadFavorites(): string[] {
  try {
    return storage.getKV<string[]>(FAV_KEY, [])
  } catch {
    return []
  }
}

function persistFavorites() {
  storage.setKV(FAV_KEY, favoriteIds.value)
}

export function useTcmFavorites() {
  function toggleFavorite(id: string) {
    const idx = favoriteIds.value.indexOf(id)
    if (idx >= 0) favoriteIds.value.splice(idx, 1)
    else favoriteIds.value.push(id)
    persistFavorites()
  }

  function isFavorite(id: string): boolean {
    return favoriteIds.value.includes(id)
  }

  return {
    favoriteIds,
    toggleFavorite,
    isFavorite,
  }
}

// ============================================================
// 洞察
// ============================================================

/** 温和洞察：当前流注经络 / 收藏穴位 / 歌诀提示 */
export function tcmInsights(hour?: number): string[] {
  const lines: string[] = []
  const h = hour ?? new Date().getHours()
  const active = activeMeridianSlot(h)
  if (active) {
    lines.push(`此刻为${active.period}，气血流注「${active.meridian.name}」。`)
  }
  if (favoriteIds.value.length > 0) {
    const names = favoriteIds.value
      .map((id) => acupointById(id)?.name)
      .filter(Boolean)
      .join('、')
    lines.push(`你收藏了 ${favoriteIds.value.length} 个穴位：${names}。`)
  } else {
    lines.push('可以从收藏几个常用穴位开始，慢慢熟悉经络。')
  }
  lines.push('以上为传统文化知识整理，不构成医疗建议。')
  return lines
}
