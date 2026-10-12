"""Crop the homepage screenshot into a shared-link image. Requires Pillow."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
with Image.open(root / 'ReadME_Assets' / 'home.png') as source:
    width, height = source.size
    crop_height = round(width * 630 / 1200)
    if crop_height > height:
        raise ValueError('Homepage screenshot is too short for the preview crop')
    preview = source.crop((0, 0, width, crop_height)).convert('RGB')
    preview.resize((1200, 630), Image.Resampling.LANCZOS).save(
        root / 'dist' / 'social-preview.png', optimize=True
    )
