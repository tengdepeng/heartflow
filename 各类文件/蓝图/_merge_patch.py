# -*- coding: utf-8 -*-
"""蓝图18 补丁合并脚本：宪法21条 + APK 2.201~2.212 + 头部清理 + 129→136 修正"""
import re

MAIN = "蓝图/蓝图18-主蓝图全文与APK规格合订.txt"
CONST = "蓝图/_patch_宪法21条.md"
APK_A = "蓝图/_patch_apk201_206.md"
APK_B = "蓝图/_patch_apk207_212.md"

with open(MAIN, encoding="utf-8") as f:
    text = f.read()

def sub(old, new, name, expect=1):
    global text
    n = text.count(old)
    assert n == expect, f"[{name}] 期望 {expect} 处，实际 {n} 处: {old[:60]}"
    text = text.replace(old, new)
    print(f"  OK {name}")

# ---------- 1. 宪法 21 条插入 ----------
with open(CONST, encoding="utf-8") as f:
    const_lines = f.readlines()
const_map = {}
for ln in const_lines:
    ln = ln.rstrip("\n")
    m = re.match(r"^\*\*第(\d+)条「", ln)
    if m:
        const_map[int(m.group(1))] = ln
missing = [6,9,11,14,17,19,20,22,23,24,26,27,29,30,31,32,36,37,38,40,41]
assert all(n in const_map for n in missing), "产物条款不全"
lines = text.split("\n")
for n in missing:
    anchor = f"**第{n-1}条「"
    idxs = [i for i, l in enumerate(lines) if l.startswith(anchor)]
    assert len(idxs) == 1, f"锚点不唯一 #{n-1}: {idxs}"
    lines.insert(idxs[0] + 1, const_map[n])
    lines.insert(idxs[0] + 2, "")
text = "\n".join(lines)
print(f"  OK 宪法 {len(missing)} 条插入完成")

# ---------- 2. APK 2.201 ~ 2.212 并入 ----------
def apk_body(path, start_marker):
    with open(path, encoding="utf-8") as f:
        content = f.read()
    idx = content.index(start_marker)
    body = content[idx:]
    body = body.rstrip("\n")
    if body.endswith("---"):
        body = body[: body.rstrip().rfind("---")].rstrip()
    return body

body_a = apk_body(APK_A, "## 2.201")
body_b = apk_body(APK_B, "## 2.207")
body = body_a.rstrip() + "\n\n---\n\n" + body_b.rstrip()
sub("继续输出 2.213 ~ 2.237。", body, "APK 12条并入")

# ---------- 3. 头部对话外壳清理 ----------
sub(
    "现在开始输出**主蓝图正文逐节完整展开**，并将主蓝图全文与APK规格合并为一份**真正完整的、不遗漏任何内容的最终文档**。\n\n"
    "> 由于完整文档体量极大（远超单次回复限制），本次回复将包含：\n"
    "> 1. **完整结构目录**（您可一目了然所有内容位置）\n"
    "> 2. **正文第一章至第三章完整展开**（基础层、空间模型、宪法）\n"
    "> 3. 后续章节（架构、幕僚、家、环境、38模块、安全、数据主权、路线图等）将在后续回复中继续输出\n\n",
    "", "头部对话外壳删除")
sub(
    "> 本文件为 `融合版 · 心流工坊完整蓝图17 · 唯一主蓝图.txt` 的完全展开版，将所有引用的APK规格全部内联展开，消除所有指向外部文件的引用，形成一份真正可独立阅读、无需跳转的完整文档。",
    "> 本文件为主蓝图全文与全部 APK 规格的内联合订版（完整展开终版），将所有引用的 APK 规格全部内联展开，消除所有指向外部文件的引用，形成一份真正可独立阅读、无需跳转的完整文档。",
    "版本自述改写")

# ---------- 4. 目录顺序对调：补三十二 在前 ----------
sub(
    "补三十三 · APK设计哲学的深层织入\n\n补三十二 · 深度整合决策与矛盾消解（9ADR+5拒绝+验证矩阵）",
    "补三十二 · 深度整合决策与矛盾消解（9ADR+5拒绝+验证矩阵）\n\n补三十三 · APK设计哲学的深层织入",
    "目录补三十二/补三十三顺序对调")
sub("（已在之前多轮回复中全部输出，此处做完整索引汇总）", "（2.102 ~ 2.237 全部编号已在本文件内联展开）", "目录索引说明改写")

# ---------- 5. “继续输出”残留删除 ----------
sub("\n继续输出第三部分·核心架构。\n", "\n", "行371残留删除")
sub("\n继续输出模块三十至三十八、第八至第十三部分、补三十二、补三十三、开放项清单。\n", "\n", "行1469残留删除")

# ---------- 6. 129 → 136 统计修正 ----------
sub("129APK完整规格", "136APK完整规格", "头部包含声明")
sub("附录 · 129 APK 完整规格", "附录 · 136 APK 完整规格", "目录附录标题")
sub("ADR-2 · 129个APK设计哲学的两种吸收方式", "ADR-2 · 136个APK设计哲学的两种吸收方式", "ADR-2")
sub("（129→38模块全量核对）", "（136→38模块全量核对）", "验证矩阵标题")
sub("129个APK全部完成设计哲学吸收，四重宪法过滤全部通过。", "136个APK全部完成设计哲学吸收，四重宪法过滤全部通过。", "验证矩阵结论")
sub("> 129个APK被消化后，在殿堂肌理中长出的新纹路。", "> 136个APK被消化后，在殿堂肌理中长出的新纹路。", "补三十三引言")
sub("但129个APK的哲学全部经过宪法四重过滤", "但136个APK的哲学全部经过宪法四重过滤", "补三十三正文")
sub("# 附录 · 129 APK 设计规格完整展开", "# 附录 · 136 APK 设计规格完整展开", "附录大标题")
sub("至此，**129个APK（2.102 ~ 2.237）的完整规格已全部输出完毕**。", "至此，**136个APK（2.102 ~ 2.237）的完整规格已全部输出完毕**。", "汇总句")

# ---------- 7. 输出统计重写 ----------
sub(
    "- **2.102 ~ 2.160**：第一轮输出（约59个）\n- **2.161 ~ 2.185**：第二轮输出（约25个）\n- **2.186 ~ 2.212**：第三轮输出（约27个）\n- **2.213 ~ 2.237**：第四轮输出（约25个）",
    "- **2.102 ~ 2.160**：第一轮输出（59个）\n- **2.161 ~ 2.185**：第二轮输出（25个）\n- **2.186 ~ 2.200**：第三轮输出（15个）\n- **2.201 ~ 2.212**：补全输出（12个）\n- **2.213 ~ 2.237**：第四轮输出（25个）",
    "输出统计重写")

with open(MAIN, "w", encoding="utf-8") as f:
    f.write(text)
print("写入完成")