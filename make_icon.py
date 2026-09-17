# -*- coding: utf-8 -*-
"""纯标准库生成 ScholarTrack 图标 icon.ico（墨绿圆角方块 + 金色对勾）"""
import zlib, struct, os, math

S = 256

def make_png_rgba(px):  # px: list of rows, each row list of (r,g,b,a)
    def chunk(t, data):
        c = struct.pack('>I', len(data)) + t + data
        c += struct.pack('>I', zlib.crc32(t + data) & 0xffffffff)
        return c
    raw = b''
    for row in px:
        raw += b'\x00' + b''.join(struct.pack('BBBB', *p) for p in row)
    ihdr = struct.pack('>IIBBBBB', S, S, 8, 6, 0, 0, 0)
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr)
            + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))

def make_ico(png_bytes):
    # ICONDIR(6) + ICONDIRENTRY(16)
    header = struct.pack('<HHH', 0, 1, 1)
    w = 0 if S >= 256 else S
    entry = struct.pack('<BBBBHHII', w, w, 0, 0, 1, 32, len(png_bytes), 22)
    return header + entry + png_bytes

# --- 绘制 ---
BG = (18, 51, 44, 255)      # 深墨绿 #12332C
BG_TOP = (26, 74, 63, 255)  # 顶部略亮，模拟渐变
GOLD = (232, 196, 138, 255) # 金 #E8C48A
R = 52                       # 圆角半径

def inside_round(x, y):
    # 圆角矩形判定
    if R <= x < S - R or R <= y < S - R:
        return True
    cx = R if x < R else (S - 1 - R if x >= S - R else x)
    cy = R if y < R else (S - 1 - R if y >= S - R else y)
    return (x - cx) ** 2 + (y - cy) ** 2 <= R * R

def line_dist(px, py, x1, y1, x2, y2):
    dx, dy = x2 - x1, y2 - y1
    l2 = dx * dx + dy * dy
    if l2 == 0:
        return math.hypot(px - x1, py - y1)
    t = max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / l2))
    return math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))

# 对勾折线点（在圆角矩形内居中）
CHK = [(72, 132), (112, 172), (184, 84)]
W = 17.0  # 对勾笔画宽度（含抗锯齿范围）

rows = []
for y in range(S):
    row = []
    t = y / (S - 1)
    for x in range(S):
        if not inside_round(x, y):
            row.append((0, 0, 0, 0))
            continue
        # 纵向渐变
        base = tuple(int(BG[i] + (BG_TOP[i] - BG[i]) * (1 - t)) for i in range(3))
        # 顶部高光
        if y < S * 0.5 and x > S * 0.08 and x < S * 0.92:
            hl = max(0.0, 1.0 - (y / (S * 0.5))) * max(0.0, 1.0 - abs(x - S * 0.5) / (S * 0.44))
            base = tuple(min(255, int(c + 10 * hl)) for c in base)
        # 对勾
        d = min(line_dist(x, y, *CHK[0], *CHK[1]), line_dist(x, y, *CHK[1], *CHK[2]))
        a = 255
        if d <= W / 2:
            a = 255
        elif d <= W / 2 + 1.5:
            a = int(255 * (1 - (d - W / 2) / 1.5))
        if a > 0:
            # 金色，边缘略深
            shade = 1.0 if d < W / 2 - 1 else max(0.86, 1.0 - (d - W / 2 + 1) * 0.05)
            row.append((int(GOLD[0] * shade), int(GOLD[1] * shade), int(GOLD[2] * shade), a))
        else:
            row.append((*base, 255))
    rows.append(row)

png = make_png_rgba(rows)
out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build')
os.makedirs(out_dir, exist_ok=True)
with open(os.path.join(out_dir, 'icon.ico'), 'wb') as f:
    f.write(make_ico(png))
with open(os.path.join(out_dir, 'icon.png'), 'wb') as f:
    f.write(png)
print('icon.ico / icon.png 已生成 ->', out_dir)
