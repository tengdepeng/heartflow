#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成「家 · 1:1 3D 复刻」占位资产（.glb）。

纯标准库实现：不依赖 trimesh / numpy / pygltflib。
每个房间 = 地面 + 四面墙 + 若干基础家具盒（轴对齐 AABB），
每盒作为一个独立 primitive + 独立 material（baseColorFactor 配色）。

输出目录：<frontend>/public/home-replica/
文件名：<room-id>.glb

GLB 二进制结构（glTF 2.0）：
  [12B header][JSON chunk][BIN chunk]
  JSON chunk:  length(4) + type 'JSON'(4) + data(4-align, 空格补齐)
  BIN  chunk:  length(4) + type 'BIN\0'(4) + data(4-align, 0 补齐)
"""
import json
import struct
import os

# ---------------------------------------------------------------------------
# 几何：轴对齐盒 → 24 顶点（每面 4 顶点，平面法线）+ 36 索引
# ---------------------------------------------------------------------------
# 6 个面：(法线, 4 角点相对偏移)。角点按 (bmin,bmax) 展开。
_FACES = [
    # +X
    ((1, 0, 0), [(1, 0, 0), (1, 1, 0), (1, 1, 1), (1, 0, 1)]),
    # -X
    ((-1, 0, 0), [(0, 0, 1), (0, 1, 1), (0, 1, 0), (0, 0, 0)]),
    # +Y (顶)
    ((0, 1, 0), [(0, 1, 0), (0, 1, 1), (1, 1, 1), (1, 1, 0)]),
    # -Y (底)
    ((0, -1, 0), [(0, 0, 1), (0, 0, 0), (1, 0, 0), (1, 0, 1)]),
    # +Z
    ((0, 0, 1), [(1, 0, 1), (1, 1, 1), (0, 1, 1), (0, 0, 1)]),
    # -Z
    ((0, 0, -1), [(0, 0, 0), (0, 1, 0), (1, 1, 0), (1, 0, 0)]),
]


def add_box(positions, normals, indices, bmin, bmax, color):
    """追加一个 AABB 盒：24 顶点（每面 4，平面法线）+ 36 索引。"""
    (x0, y0, z0), (x1, y1, z1) = bmin, bmax
    start = len(positions) // 3
    for (nx, ny, nz), corners in _FACES:
        for (cu, cv, cw) in corners:
            px = x0 if cu == 0 else x1
            py = y0 if cv == 0 else y1
            pz = z0 if cw == 0 else z1
            positions.extend([px, py, pz])
            normals.extend([nx, ny, nz])
    for f in range(6):
        o = start + f * 4
        indices.extend([o + 0, o + 1, o + 2, o + 0, o + 2, o + 3])
    return color


def build_glb(boxes):
    """boxes: list of (bmin, bmax, color[r,g,b,a 0-1]) → 合法 .glb bytes。"""
    positions = []
    normals = []
    indices = []
    primitives = []  # (start_index, count_index, material_index)
    materials = []   # baseColorFactor

    for bmin, bmax, color in boxes:
        mat_idx = len(materials)
        materials.append([color[0], color[1], color[2], color[3] if len(color) > 3 else 1.0])
        start_idx = len(indices)
        add_box(positions, normals, indices, bmin, bmax, color)
        # 修正：add_box 已把 24 顶点与 36 索引入列，但 start_idx 在 add 前记录
        # 上面 add_box 内部用 base=len(positions)//3 时 positions 已含之前盒，正确。
        count_idx = len(indices) - start_idx
        primitives.append((start_idx, count_idx, mat_idx))

    # ---- 组装二进制 buffer ----
    # 布局：POSITION(f32×3) | NORMAL(f32×3) | indices(u16)
    pos_bytes = struct.pack('<%df' % len(positions), *positions)
    nrm_bytes = struct.pack('<%df' % len(normals), *normals)
    # 索引用 u16（顶点数 < 65536 必然成立）
    idx_bytes = struct.pack('<%dH' % len(indices), *indices)

    # 4 字节对齐偏移
    def align4(n):
        return (n + 3) & ~3

    off_pos = 0
    len_pos = len(pos_bytes)
    off_nrm = align4(off_pos + len_pos)
    pad1 = off_nrm - (off_pos + len_pos)
    len_nrm = len(nrm_bytes)
    off_idx = align4(off_nrm + len_nrm)
    pad2 = off_idx - (off_nrm + len_nrm)
    len_idx = len(idx_bytes)
    bin_len = off_idx + len_idx
    bin_data = (
        pos_bytes
        + b'\x00' * (off_nrm - off_pos - len_pos)
        + nrm_bytes
        + b'\x00' * pad2
        + idx_bytes
    )
    assert len(bin_data) == bin_len, (len(bin_data), bin_len)

    # ---- accessor min/max（POSITION 必填）----
    xs = positions[0::3]
    ys = positions[1::3]
    zs = positions[2::3]
    pos_min = [min(xs), min(ys), min(zs)]
    pos_max = [max(xs), max(ys), max(zs)]

    # ---- GLTF JSON ----
    bufferViews = []
    # 0: POSITION
    bufferViews.append({"buffer": 0, "byteOffset": off_pos, "byteLength": len_pos,
                        "target": 34962})
    # 1: NORMAL
    bufferViews.append({"buffer": 0, "byteOffset": off_nrm, "byteLength": len_nrm,
                        "target": 34962})
    # 2: indices
    bufferViews.append({"buffer": 0, "byteOffset": off_idx, "byteLength": len_idx,
                        "target": 34963})

    accessors = [
        {  # POSITION
            "bufferView": 0, "componentType": 5126, "count": len(xs),
            "type": "VEC3", "min": pos_min, "max": pos_max,
        },
        {  # NORMAL
            "bufferView": 1, "componentType": 5126, "count": len(positions) // 3,
            "type": "VEC3",
        },
        {  # indices
            "bufferView": 2, "componentType": 5123, "count": len(indices),
            "type": "SCALAR",
        },
    ]

    meshes = []
    for (start_idx, count_idx, mat_idx) in primitives:
        meshes.append({
            "primitives": [{
                "attributes": {"POSITION": 0, "NORMAL": 1},
                "indices": 2,
                "material": mat_idx,
                "mode": 4,  # TRIANGLES
            }]
        })

    gltf = {
        "asset": {"version": "2.0", "generator": "heartflow-home-replica-placeholder"},
        "scene": 0,
        "scenes": [{"nodes": list(range(len(meshes)))}],
        "nodes": [{"mesh": i, "name": "box%d" % i} for i in range(len(meshes))],
        "meshes": meshes,
        "materials": [
            {"name": "m%d" % i, "doubleSided": True,
             "pbrMetallicRoughness": {"baseColorFactor": m, "metallicFactor": 0.0,
                                      "roughnessFactor": 0.9}}
            for i, m in enumerate(materials)
        ],
        "buffers": [{"byteLength": bin_len}],
        "bufferViews": bufferViews,
        "accessors": accessors,
    }

    # ---- 打包 GLB ----
    json_bytes = json.dumps(gltf, separators=(',', ':')).encode('utf-8')
    # JSON chunk 4 对齐（空格 0x20）。注意：data 段不含 'JSON' 类型前缀（类型已在 header）
    json_pad = (4 - (len(json_bytes) % 4)) % 4
    json_chunk = json_bytes + b' ' * json_pad
    # BIN chunk 4 对齐（0x00）。data 段不含 'BIN\0' 类型前缀
    bin_pad = (4 - (len(bin_data) % 4)) % 4
    bin_chunk = bin_data + b'\x00' * bin_pad

    total = 12 + 8 + len(json_chunk) + 8 + len(bin_chunk)
    header = struct.pack('<III', 0x46546C67, 2, total)
    json_header = struct.pack('<II', len(json_bytes) + json_pad, 0x4E4F534A)
    bin_header = struct.pack('<II', len(bin_data) + bin_pad, 0x004E4942)
    return header + json_header + json_chunk + bin_header + bin_chunk


# ---------------------------------------------------------------------------
# 房间定义：地面 + 4 墙 + 家具（单位：米，1:1 真实比例）
# ---------------------------------------------------------------------------
ROOM_W = 8.0
ROOM_D = 8.0
ROOM_H = 3.0
WALL_T = 0.12

# 颜色（r,g,b,a 0-1）
C_FLOOR = (0.82, 0.76, 0.66, 1.0)
C_WALL = (0.90, 0.88, 0.84, 1.0)
C_BED = (0.55, 0.62, 0.78, 1.0)
C_SOFA = (0.78, 0.55, 0.50, 1.0)
C_TABLE = (0.62, 0.50, 0.40, 1.0)
C_PLANT = (0.42, 0.62, 0.42, 1.0)
C_KITCHEN = (0.78, 0.78, 0.80, 1.0)
C_BOOK = (0.45, 0.40, 0.55, 1.0)
C_RUG = (0.70, 0.60, 0.45, 1.0)


def room_boxes(palette, furniture):
    """通用房间几何。palette=(floor,wall)，furniture=list of (bmin,bmax,color)。"""
    boxes = []
    # 地面（薄片）
    boxes.append(((0, -0.05, 0), (ROOM_W, 0, ROOM_D), palette[0]))
    # 四面墙（薄盒，留开口不画以简化）
    boxes.append(((0, 0, -WALL_T), (ROOM_W, ROOM_H, 0), palette[1]))          # 背墙
    boxes.append(((0, 0, ROOM_D), (ROOM_W, ROOM_H, ROOM_D + WALL_T), palette[1]))  # 前墙
    boxes.append(((-WALL_T, 0, 0), (0, ROOM_H, ROOM_D), palette[1]))         # 左墙
    boxes.append(((ROOM_W, 0, 0), (ROOM_W + WALL_T, ROOM_H, ROOM_D), palette[1]))  # 右墙
    boxes.extend(furniture)
    return boxes


def make_living_room():
    return room_boxes(
        (C_FLOOR, C_WALL),
        [
            ((ROOM_W/2 - 1.1, 0, 1.0), (ROOM_W/2 + 1.1, 0.5, 3.0), C_SOFA),   # 沙发
            ((1.2, 0, 1.2), (3.2, 0.45, 2.6), C_TABLE),                      # 茶几
            ((0.4, 0, ROOM_D - 1.2), (1.2, 1.8, ROOM_D - 0.4), C_PLANT),     # 绿植
            ((ROOM_W/2 - 2.0, 0, ROOM_D - 1.0), (ROOM_W/2 + 2.0, 0.02, ROOM_D - 0.2), C_RUG),  # 地毯(薄)
        ],
    )


def make_bedroom():
    return room_boxes(
        ((0.80, 0.74, 0.70), C_WALL),
        [
            ((1.0, 0, 1.0), (4.0, 0.6, 3.2), C_BED),                         # 床
            ((4.2, 0, 1.0), (5.4, 0.55, 1.8), C_TABLE),                     # 床头柜/桌
            ((0.4, 0, ROOM_D - 1.0), (1.0, 1.6, ROOM_D - 0.4), C_PLANT),     # 绿植
        ],
    )


def make_kitchen():
    return room_boxes(
        ((0.78, 0.78, 0.74), (0.86, 0.86, 0.84)),
        [
            ((0.2, 0, 0.2), (ROOM_W - 0.2, 0.9, 0.8), C_KITCHEN),            # 操作台
            ((0.2, 0, ROOM_D - 0.8), (ROOM_W - 0.2, 0.9, ROOM_D - 0.2), C_KITCHEN),  # 对面台
            ((ROOM_W/2 - 0.6, 0, ROOM_D/2 - 0.6), (ROOM_W/2 + 0.6, 0.75, ROOM_D/2 + 0.6), C_TABLE),  # 餐桌
        ],
    )


def make_study():
    return room_boxes(
        ((0.74, 0.70, 0.66), (0.88, 0.86, 0.84)),
        [
            ((1.0, 0, 1.0), (4.0, 0.78, 1.6), C_TABLE),                     # 书桌
            ((4.2, 0, 1.0), (5.6, 2.0, 3.0), C_BOOK),                       # 书架
            ((0.4, 0, ROOM_D - 1.2), (1.2, 0.5, ROOM_D - 0.4), C_SOFA),     # 阅读椅位
        ],
    )


def make_balcony():
    return room_boxes(
        ((0.70, 0.74, 0.72), (0.82, 0.88, 0.86)),
        [
            ((0.3, 0, 0.3), (ROOM_W - 0.3, 0.05, ROOM_D - 0.3), C_FLOOR),   # 仅地板(阳台无家具)
            ((0.4, 0, ROOM_D - 1.0), (1.0, 1.4, ROOM_D - 0.4), C_PLANT),    # 盆栽
        ],
    )


ROOMS = {
    "living-room": make_living_room,
    "bedroom": make_bedroom,
    "kitchen": make_kitchen,
    "study": make_study,
    "balcony": make_balcony,
}


def main():
    out_dir = os.path.join(os.path.dirname(__file__), "..", "public", "home-replica")
    out_dir = os.path.abspath(out_dir)
    os.makedirs(out_dir, exist_ok=True)
    for rid, fn in ROOMS.items():
        boxes = fn()
        data = build_glb(boxes)
        path = os.path.join(out_dir, rid + ".glb")
        with open(path, "wb") as f:
            f.write(data)
        print("wrote %s (%d bytes, %d boxes)" % (path, len(data), len(boxes)))
    print("OK ->", out_dir)


if __name__ == "__main__":
    main()
