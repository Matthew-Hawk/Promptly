"""Render Promptly's vector favicon to PNG and ICO. Requires Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent.parent / 'dist'
scale = 8
image = Image.new('RGBA', (64 * scale, 64 * scale))
draw = ImageDraw.Draw(image)
draw.rounded_rectangle((0, 0, 64 * scale - 1, 64 * scale - 1), radius=14 * scale, fill='#157F1F')
for y in (14, 27, 40):
    for x in (14, 27, 40):
        draw.rounded_rectangle((x * scale, y * scale, (x + 10) * scale - 1, (y + 10) * scale - 1), radius=2 * scale, fill='#A0EADE' if (x, y) == (40, 14) else '#FFFEF8')
image.resize((180, 180), Image.Resampling.LANCZOS).save(root / 'apple-touch-icon.png')
image.resize((64, 64), Image.Resampling.LANCZOS).save(root / 'favicon.png')
image.save(root / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
