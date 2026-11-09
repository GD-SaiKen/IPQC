#!/usr/bin/env python3
"""按原型 .brand .mark（QA + 蓝青渐变）生成 favicon.ico。"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

GRAD_A = (29, 78, 216)
GRAD_B = (14, 165, 233)
HERE = Path(__file__).resolve().parent.parent


def _rounded_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def render(size: int) -> Image.Image:
    radius = max(2, round(size * 9 / 32))
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    grad = Image.new("RGB", (size, size))
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * max(1, size - 1))
            grad.putpixel(
                (x, y),
                tuple(round(GRAD_A[i] + (GRAD_B[i] - GRAD_A[i]) * t) for i in range(3)),
            )
    mask = _rounded_mask(size, radius)
    img.paste(grad, mask=mask)

    draw = ImageDraw.Draw(img)
    font_size = max(7, round(size * 13 / 32))
    try:
        font = ImageFont.truetype("arialbd.ttf", font_size)
    except OSError:
        font = ImageFont.load_default()

    text = "QA"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(
        ((size - tw) / 2 - bbox[0], (size - th) / 2 - bbox[1] - size * 0.05),
        text,
        fill="#ffffff",
        font=font,
    )
    return img


def main() -> None:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "public" / "favicon.ico"
    img32 = render(32)
    img16 = render(16)
    img32.save(out, format="ICO", sizes=[(16, 16), (32, 32)], append_images=[img16])
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
