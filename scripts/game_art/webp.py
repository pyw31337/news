"""build.mjs가 만든 PNG를 WebP로 바꾸고 PNG는 지움: python3 scripts/game_art/webp.py"""
import glob, os
from PIL import Image
for f in glob.glob(os.path.join(os.path.dirname(__file__), '..', '..', 'games', 'assets', '*', '*.png')):
    im = Image.open(f); q = 80 if os.path.basename(f).startswith('bg') else 88
    im.save(f[:-4] + '.webp', quality=q, method=4); os.remove(f)
