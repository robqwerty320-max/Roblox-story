# usage: python scripts/sheet.py out.jpg cols img1 img2 ...  -> contact sheet (frame order as given), labels = file names
import sys
from PIL import Image, ImageDraw
out, cols, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
ims = [Image.open(f).convert("RGB") for f in files]
w = 300; h = int(ims[0].height * w / ims[0].width)
rows = (len(ims) + cols - 1) // cols
S = Image.new("RGB", (cols * w, rows * h), "black")
for i, (im, f) in enumerate(zip(ims, files)):
    x, y = (i % cols) * w, (i // cols) * h
    S.paste(im.resize((w, h)), (x, y))
    ImageDraw.Draw(S).text((x + 6, y + 6), f.split("/")[-1], fill="yellow")
S.save(out, quality=88)
