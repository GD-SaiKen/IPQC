#!/usr/bin/env python3
"""从 admin-shell 品牌几何生成 favicon.ico（16px + 32px）。仅需 Pillow。"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw

BRAND = "#3b6fe0"
HERE = Path(__file__).resolve().parent

# admin-shell-brand-mark.svg 折线路径（32×32 坐标）
STROKES = [
    [(9, 22), (9, 14), (12, 14), (12, 22)],
    [(12, 22), (12, 11), (15, 11), (15, 22)],
    [(15, 22), (15, 17), (21, 17), (21, 22)],
]


def render(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    radius = max(1, round(size * 4 / 32))
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=BRAND)
    sw = max(1, round(size * 2 / 32))
    scale = size / 32

    def pt(x: float, y: float) -> tuple[int, int]:
        return (round(x * scale), round(y * scale))

    for stroke in STROKES:
        draw.line([pt(x, y) for x, y in stroke], fill="#ffffff", width=sw, joint="curve")
    return img


def main() -> None:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "favicon.ico"
    img32 = render(32)
    img16 = render(16)
    img32.save(
        out,
        format="ICO",
        sizes=[(16, 16), (32, 32)],
        append_images=[img16],
    )
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
