#!/usr/bin/env python3
"""Ravenof — statusų žetonų perspalvinimas (duotone) + apskritimo iškirpimas + 96px WebP.
Šaltinis: token-art/<name>.png  ->  public/icons/status/<name>.webp
Paleisti: pip install Pillow numpy --break-system-packages ; python3 scripts/recolor-tokens.py
"""
import numpy as np
from PIL import Image
import os

SRC = 'token-art'; OUT = 'public/icons/status'
CREAM = (243, 234, 211)
# name -> (dark shadow, mid)
PAL = {
    'burning':      ((38, 10, 6),  (188, 64, 42)),
    'frozen':       ((9, 24, 40),  (56, 130, 196)),
    'poison':       ((10, 30, 8),  (95, 170, 58)),
    'stunned':      ((40, 32, 6),  (212, 168, 42)),
    'silenced':     ((22, 22, 28), (140, 140, 150)),
    'light':        ((42, 33, 6),  (217, 185, 74)),
    'shield_magic': ((42, 34, 6),  (224, 194, 74)),
    'taunt':        ((36, 20, 5),  (169, 116, 47)),
    'sprint':       ((8, 34, 15),  (76, 170, 106)),
    'stealth':      ((26, 15, 42), (138, 92, 192)),
}

def duotone(L, dark, mid, cream):
    out = np.empty(L.shape + (3,), dtype=float)
    lo = L < 0.5
    f_lo = np.clip(L / 0.5, 0, 1); f_hi = np.clip((L - 0.5) / 0.5, 0, 1)
    for i in range(3):
        out[..., i] = np.where(lo, dark[i] + (mid[i] - dark[i]) * f_lo, mid[i] + (cream[i] - mid[i]) * f_hi)
    return out

os.makedirs(OUT, exist_ok=True)
for name, (dark, mid) in PAL.items():
    fp = os.path.join(SRC, name + '.png')
    if not os.path.exists(fp):
        print('MISSING', fp); continue
    arr = np.asarray(Image.open(fp).convert('RGBA')).astype(float)
    R, G, B, A = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    L = (0.299 * R + 0.587 * G + 0.114 * B) / 255.0
    rgb = duotone(L, dark, mid, CREAM)
    h, w = L.shape
    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy = (w - 1) / 2, (h - 1) / 2; rad = min(cx, cy) - 1
    mask = np.clip(rad - np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) + 0.5, 0, 1.0)
    out = np.dstack([np.clip(rgb, 0, 255), (A / 255.0) * mask * 255]).astype(np.uint8)
    Image.fromarray(out, 'RGBA').resize((96, 96), Image.LANCZOS).save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=88, method=6)
    print('ok', name)
