"""
Renders the app icons from the shapes in public/favicon.svg (a melon slice on a dark tile).

    python scripts/make-icons.py

Writes:
  public/icons/icon-192.png, icon-512.png   installable web app icons
  public/icons/icon-maskable-512.png        Android adaptive icon (art inside the safe zone)
  public/icons/apple-touch-icon.png         iPhone / iPad home screen (180 px)
  build/icon.png, build/icon.ico            Windows app and installer icon

Needs Pillow (pip install pillow). Re-run it if favicon.svg changes.
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
BG = (0x14, 0x0E, 0x12, 255)


def cubic(p0, p1, p2, p3, steps=48):
    out = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        out.append((
            u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
            u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1],
        ))
    return out


def wedge(x0, y, dx1, dy1, dx2, dx3, tip):
    """A slice: curved top from (x0, y) to (x0 + dx3, y), straight sides down to `tip`."""
    top = cubic((x0, y), (x0 + dx1, y + dy1), (x0 + dx2, y + dy1), (x0 + dx3, y))
    return top + [tip]


# The three layers of the slice and the seeds, in favicon.svg's 32-unit space.
RIND = wedge(5, 12.5, 3.2, -6.2, 18.8, 22, (16, 27.5))
PITH = wedge(7.4, 13.2, 2.4, -4.2, 14.8, 17.2, (16, 24.6))
FLESH = wedge(9.2, 13.7, 1.9, -3, 11.7, 13.6, (16, 22.6))
SEEDS = [(13.2, 16.2, 1.15), (16.6, 18.4, 1.05), (18.4, 15.4, 1.05)]


def render(size, *, art_scale=1.0, rounded=True):
    big = size * 4  # draw large, then shrink, for smooth edges
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle((0, 0, big - 1, big - 1), radius=big * 7 / 32, fill=BG)
    else:
        d.rectangle((0, 0, big, big), fill=BG)
    k = big / 32 * art_scale
    off = big * (1 - art_scale) / 2

    def pt(p):
        return (off + p[0] * k, off + p[1] * k)

    d.polygon([pt(p) for p in RIND], fill=(0x3F, 0x9A, 0x5C, 255))
    d.polygon([pt(p) for p in PITH], fill=(0xF3, 0xE2, 0xC4, 255))
    d.polygon([pt(p) for p in FLESH], fill=(0xE2, 0x3B, 0x4A, 255))
    for x, y, r in SEEDS:
        cx, cy = pt((x, y))
        d.ellipse((cx - r * k, cy - r * k, cx + r * k, cy + r * k), fill=BG)
    return img.resize((size, size), Image.LANCZOS)


def main():
    icons = ROOT / "public" / "icons"
    build = ROOT / "build"
    icons.mkdir(parents=True, exist_ok=True)
    build.mkdir(parents=True, exist_ok=True)
    render(192).save(icons / "icon-192.png")
    render(512).save(icons / "icon-512.png")
    # Maskable: full-bleed background, art kept inside the central 80% safe zone.
    render(512, art_scale=0.72, rounded=False).save(icons / "icon-maskable-512.png")
    render(180, art_scale=0.86, rounded=False).save(icons / "apple-touch-icon.png")
    render(512).save(build / "icon.png")
    render(256).save(build / "icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print("icons written")


if __name__ == "__main__":
    main()
