"""Turn raw generated images into game assets.

  floor:  process_art.py floor RAW.png OUT.webp   -> a seamless, darkened 640px floor tile
  bg:     process_art.py bg    RAW.png OUT.webp   -> a darkened 1280px-wide backdrop

Run with a Python that has Pillow and numpy (e.g. ~/LocalModels/bg/bin/python).
"""
import sys
import numpy as np
from PIL import Image, ImageEnhance


def seamless(img, band=96):
    """Cross-fade each edge into the opposite one so the tile wraps without a seam."""
    a = np.asarray(img.convert("RGB")).astype(np.float32)
    h, w = a.shape[:2]
    ramp = np.linspace(0.0, 1.0, band, dtype=np.float32)
    out = a[:, : w - band].copy()
    out[:, :band] = a[:, w - band :] * (1 - ramp)[None, :, None] + a[:, :band] * ramp[None, :, None]
    a, out = out, out[: h - band].copy()
    out[:band] = a[h - band :] * (1 - ramp)[:, None, None] + a[:band] * ramp[:, None, None]
    return Image.fromarray(out.clip(0, 255).astype(np.uint8))


def tone(img, brightness, saturation):
    return ImageEnhance.Color(ImageEnhance.Brightness(img).enhance(brightness)).enhance(saturation)


kind, src, dst = sys.argv[1:4]
im = Image.open(src)
if kind == "floor":
    # Floors sit under the action, so every one is brought to the same dark level and muted a little.
    # Normalising (rather than a fixed multiplier) keeps a pale marble floor as dark as a cave floor.
    im = seamless(im).resize((640, 640), Image.LANCZOS)
    mean = np.asarray(im.convert("L")).mean()
    im = tone(im, min(1.0, 36.0 / max(mean, 1.0)), 0.85)
else:
    im = tone(im.convert("RGB").resize((1280, round(1280 * im.height / im.width)), Image.LANCZOS), 0.7, 1.0)
im.save(dst, "WEBP", quality=82, method=6)
print(dst, im.size)
