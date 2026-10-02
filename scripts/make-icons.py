# Nutrimi app icon: a tilted leaf whose ribs curve like a real one.
from PIL import Image, ImageDraw
import math

S = 1024
SS = 4                      # supersample for smooth edges
W = S * SS
TILT = math.radians(-18)
CREAM = (0xF5, 0xEF, 0xE2, 255)
GREEN = (0x1A, 0x5C, 0x3F, 255)


def rot(x, y, cx, cy, a):
    dx, dy = x - cx, y - cy
    return cx + dx * math.cos(a) - dy * math.sin(a), cy + dx * math.sin(a) + dy * math.cos(a)


def leaf_outline(cx, cy, w, h, a):
    """Pointed at both ends, widest in the middle."""
    pts = []
    for side in (1, -1):
        steps = 140
        for i in range(steps + 1):
            t = i / steps if side == 1 else 1 - i / steps
            y = cy - h / 2 + h * t
            x = cx + side * (w / 2) * math.sin(math.pi * t) ** 0.78
            pts.append(rot(x, y, cx, cy, a))
    return pts


def draw_mark(draw, cx, cy, w, h, a, body, vein):
    if body is not None:
        draw.polygon(leaf_outline(cx, cy, w, h, a), fill=body)

    # Midrib, from base to tip.
    rib = []
    for i in range(61):
        t = i / 60
        rib.append(rot(cx, cy - h / 2 + h * t, cx, cy, a))
    draw.line(rib, fill=vein, width=int(W * 0.016), joint='curve')

    # Side ribs sweeping up and out towards the tip.
    for t0 in (0.34, 0.50, 0.66, 0.82):
        for side in (1, -1):
            curve = []
            for i in range(31):
                u = i / 30
                # Rise towards the tip while bowing outwards, staying inside the
                # outline by measuring the leaf's width at the rib's own height.
                t = t0 - 0.13 * u - 0.035 * math.sin(math.pi * u)
                local_half = (w / 2) * math.sin(math.pi * t) ** 0.78
                x = cx + side * local_half * 0.80 * u
                y = cy - h / 2 + h * t
                curve.append(rot(x, y, cx, cy, a))
            draw.line(curve, fill=vein, width=int(W * 0.011), joint='curve')


# ---- App icon: cream leaf on a green field -------------------------------
img = Image.new('RGB', (W, W), '#1F6B4A')
d = ImageDraw.Draw(img)
for i in range(90, 0, -1):
    r = int(W * 1.5 * i / 90)
    t = i / 90
    d.ellipse(
        [W * 0.08 - r / 2, W * 0.0 - r / 2, W * 0.08 + r / 2, W * 0.0 + r / 2],
        fill=(
            int(0x1F + (0x34 - 0x1F) * (1 - t)),
            int(0x6B + (0x90 - 0x6B) * (1 - t)),
            int(0x4A + (0x66 - 0x4A) * (1 - t)),
        ),
    )
draw_mark(d, W * 0.5, W * 0.5, W * 0.44, W * 0.66, TILT, CREAM, GREEN)
icon = img.resize((S, S), Image.LANCZOS)
icon.save('assets/icon.png')
icon.resize((512, 512), Image.LANCZOS).save('assets/favicon.png')

# ---- Splash / adaptive foreground: mark only, transparent ground ---------
fg = Image.new('RGBA', (W, W), (0, 0, 0, 0))
draw_mark(ImageDraw.Draw(fg), W * 0.5, W * 0.5, W * 0.46, W * 0.70, TILT, CREAM, GREEN)
fg_small = fg.resize((S, S), Image.LANCZOS)
fg_small.save('assets/splash-icon.png')
fg_small.resize((432, 432), Image.LANCZOS).save('assets/android-icon-foreground.png')
Image.new('RGB', (432, 432), '#1F6B4A').save('assets/android-icon-background.png')

mono = Image.new('RGBA', (W, W), (0, 0, 0, 0))
ImageDraw.Draw(mono).polygon(
    leaf_outline(W * 0.5, W * 0.5, W * 0.46, W * 0.70, TILT), fill=(255, 255, 255, 255)
)
mono.resize((432, 432), Image.LANCZOS).save('assets/android-icon-monochrome.png')
print('icons written')
