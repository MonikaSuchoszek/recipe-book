"""Generate all flat SVG artwork for the site: category placeholders, logo,
favicon, home page hero, empty states and the 404 image.

The art is intentionally flat and graphic (no gradients, no realism) so it can
never be mistaken for a real dish photo. Category placeholders use a 4:3 canvas
(card thumbnail) with the subject inside the central 16:9 band so a header crop
keeps it intact.

Usage: python3 scripts/make_artwork.py src/assets/illustrations
"""
from pathlib import Path
import sys

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "illustrations")

PALETTE = {
    "leaf": "#2F9E6E", "herb": "#5E8C3A", "avocado": "#8DB63C", "teal": "#2BA3A0",
    "sky": "#4AA8D8", "plum": "#8E6CC9", "berry": "#E8546B", "tomato": "#E4583A",
    "carrot": "#F28C38", "citrus": "#F6B73C", "oat": "#C9A46A",
    "rose": "#D9609B",
}
WHITE = "#FFFFFF"
CREAM = "#FFFDF7"


def mix(hex_a, hex_b, weight_b):
    a = [int(hex_a[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(hex_b[i:i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{round(x + (y - x) * weight_b):02X}" for x, y in zip(a, b))


def shades(color_name):
    accent = PALETTE[color_name]
    return {
        "accent": accent,
        "tint": mix(accent, WHITE, 0.86),
        "mid": mix(accent, WHITE, 0.62),
        "ink": mix(accent, "#000000", 0.45),
    }


def leaf(x, y, angle, scale, fill, vein=WHITE):
    return (
        f'<g transform="translate({x} {y}) rotate({angle}) scale({scale})">'
        f'<path d="M0 0 C10 -13 30 -13 42 0 C30 13 10 13 0 0Z" fill="{fill}"/>'
        f'<path d="M3 0 H36" stroke="{vein}" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>'
        "</g>"
    )


def background(c):
    # Scattered dots and corner leaves make the "illustration" style obvious at small sizes
    dots = [(38, 48, 4), (70, 262, 3), (352, 40, 3), (368, 250, 5), (320, 90, 2.5), (60, 150, 2.5), (345, 170, 2.5)]
    dot_svg = "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c["accent"]}" opacity=".35"/>' for x, y, r in dots)
    return (
        f'<rect width="400" height="300" fill="{c["tint"]}"/>'
        f'<circle cx="200" cy="152" r="112" fill="{c["mid"]}" opacity=".55"/>'
        f"{dot_svg}"
        + leaf(22, 20, 35, 0.9, c["accent"])
        + leaf(378, 282, 215, 0.9, c["accent"])
    )


def bowl(c, top_y=158, width=190, depth=78, fill=WHITE, band=None):
    left, right = 200 - width / 2, 200 + width / 2
    band = band or c["accent"]
    return (
        f'<ellipse cx="200" cy="{top_y + depth + 6}" rx="{width * 0.3}" ry="7" fill="{c["ink"]}" opacity=".15"/>'
        f'<path d="M{left} {top_y} H{right} A{width / 2} {depth} 0 0 1 {left} {top_y}Z" fill="{fill}"/>'
        f'<path d="M{left + 12} {top_y + 26} H{right - 12}" stroke="{band}" stroke-width="7" stroke-linecap="round" opacity=".85"/>'
    )


def breakfast(c):
    berries = [(172, 150, "berry"), (186, 144, "plum"), (230, 147, "berry"), (243, 152, "plum")]
    return (
        f'<circle cx="200" cy="112" r="58" fill="{PALETTE["citrus"]}" opacity=".9"/>'
        + "".join(f'<path d="M200 112 L{200 + 82 * dx} {112 + 82 * dy}" stroke="{PALETTE["citrus"]}" stroke-width="6" stroke-linecap="round" opacity=".6"/>'
                  for dx, dy in [(-1, 0), (1, 0), (-.7, -.7), (.7, -.7), (0, -1)])
        + f'<ellipse cx="200" cy="158" rx="95" ry="16" fill="#F3E3C3"/>'
        + bowl(c)
        + "".join(f'<circle cx="{x}" cy="{y}" r="8" fill="{PALETTE[k]}"/>' for x, y, k in berries)
        + "".join(f'<circle cx="{x}" cy="{y}" r="9" fill="#FBEBA8" stroke="#E8CF6E" stroke-width="2"/>' for x, y in [(203, 150), (152, 155), (262, 157)])
        + leaf(208, 138, -30, 0.45, PALETTE["leaf"])
    )


def main_dish(c):
    return (
        f'<ellipse cx="200" cy="252" rx="92" ry="7" fill="{c["ink"]}" opacity=".12"/>'
        f'<circle cx="200" cy="152" r="96" fill="{WHITE}"/>'
        f'<circle cx="200" cy="152" r="74" fill="none" stroke="{c["mid"]}" stroke-width="3"/>'
        f'<rect x="80" y="70" width="10" height="160" rx="5" fill="{c["ink"]}" opacity=".55"/>'
        f'<path d="M72 70 v34 q0 10 13 10 q13 0 13 -10 v-34" fill="none" stroke="{c["ink"]}" stroke-width="5" opacity=".55" stroke-linecap="round"/>'
        f'<path d="M312 70 q16 20 0 80 v80" stroke="{c["ink"]}" stroke-width="10" fill="none" opacity=".55" stroke-linecap="round"/>'
        f'<g transform="rotate(-18 190 160)"><rect x="150" y="138" width="92" height="44" rx="16" fill="{PALETTE["carrot"]}"/>'
        + "".join(f'<path d="M{x} 142 q6 18 0 36" stroke="{WHITE}" stroke-width="3" fill="none" opacity=".75"/>' for x in (172, 192, 212, 230))
        + "</g>"
        + leaf(150, 116, -40, 0.8, PALETTE["leaf"]) + leaf(158, 118, -85, 0.7, PALETTE["herb"])
        + leaf(236, 196, 20, 0.7, PALETTE["avocado"]) + leaf(232, 200, 70, 0.6, PALETTE["leaf"])
        + f'<path d="M250 120 a22 22 0 0 1 -30 30 Z" fill="{PALETTE["citrus"]}"/>'
    )


def soup(c):
    steam = "".join(
        f'<path d="M{x} 128 q-10 -14 0 -28 t0 -28" stroke="{WHITE}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".9"/>'
        for x in (170, 200, 230)
    )
    return (
        steam
        + f'<ellipse cx="200" cy="160" rx="98" ry="15" fill="{PALETTE["carrot"]}"/>'
        + bowl(c, top_y=160, width=200, depth=80, band=c["ink"])
        + f'<rect x="262" y="100" width="12" height="80" rx="6" fill="{c["ink"]}" opacity=".6" transform="rotate(32 268 140)"/>'
        + leaf(160, 158, -10, 0.35, PALETTE["leaf"]) + leaf(206, 162, 20, 0.35, PALETTE["herb"]) + leaf(232, 156, -30, 0.3, PALETTE["leaf"])
        + "".join(f'<circle cx="{x}" cy="{y}" r="3" fill="{WHITE}" opacity=".7"/>' for x, y in [(180, 160), (222, 158), (145, 162)])
    )


def salad(c):
    leaves = [
        (120, 158, -40, 1.3, "leaf"), (150, 150, -70, 1.3, "avocado"), (178, 150, -95, 1.2, "herb"),
        (218, 150, -85, 1.3, "leaf"), (248, 156, -115, 1.2, "avocado"), (270, 166, -150, 1.2, "herb"),
        (140, 160, -20, 1.0, "herb"), (196, 148, -60, 1.1, "avocado"),
    ]
    return (
        "".join(leaf(x, y, a, s, PALETTE[k]) for x, y, a, s, k in leaves)
        + "".join(f'<circle cx="{x}" cy="{y}" r="13" fill="{PALETTE["tomato"]}"/><circle cx="{x - 4}" cy="{y - 4}" r="3" fill="{WHITE}" opacity=".6"/>'
                  for x, y in [(170, 140), (236, 136)])
        + "".join(f'<circle cx="{x}" cy="{y}" r="12" fill="#D8EFC0" stroke="{PALETTE["herb"]}" stroke-width="3"/>'
                  for x, y in [(206, 132), (146, 146)])
        + bowl(c, top_y=160, width=200, depth=78)
    )


def side(c):
    sticks = [(172, "carrot", -12), (190, "avocado", -4), (208, "carrot", 5), (226, "herb", 13)]
    return (
        "".join(f'<rect x="{x}" y="72" width="16" height="110" rx="7" fill="{PALETTE[k]}" transform="rotate({a} {x + 8} 180)"/>' for x, k, a in sticks)
        + f'<ellipse cx="200" cy="240" rx="62" ry="7" fill="{c["ink"]}" opacity=".15"/>'
        + f'<path d="M150 150 H250 L238 238 H162Z" fill="{WHITE}"/>'
        + f'<path d="M156 176 H244" stroke="{c["accent"]}" stroke-width="7" stroke-linecap="round"/>'
        + f'<ellipse cx="292" cy="224" rx="40" ry="12" fill="{WHITE}"/><ellipse cx="292" cy="220" rx="30" ry="7" fill="{PALETTE["citrus"]}" opacity=".6"/>'
    )


def snack(c):
    nuts = [(270, 222, 20), (296, 214, -15), (285, 236, 60), (118, 226, -30)]
    return (
        f'<ellipse cx="200" cy="244" rx="80" ry="8" fill="{c["ink"]}" opacity=".15"/>'
        f'<path d="M200 118 C170 92 116 104 118 162 C120 214 164 244 200 230 C236 244 280 214 282 162 C284 104 230 92 200 118Z" fill="{PALETTE["berry"]}"/>'
        f'<path d="M150 140 q-10 24 0 48" stroke="{WHITE}" stroke-width="7" fill="none" opacity=".4" stroke-linecap="round"/>'
        f'<path d="M200 120 q4 -22 14 -34" stroke="{c["ink"]}" stroke-width="6" fill="none" stroke-linecap="round"/>'
        + leaf(212, 92, -30, 1.0, PALETTE["leaf"])
        + "".join(f'<ellipse cx="{x}" cy="{y}" rx="15" ry="9" fill="{PALETTE["oat"]}" transform="rotate({a} {x} {y})"/>' for x, y, a in nuts)
    )


def baking(c):
    return (
        f'<ellipse cx="200" cy="232" rx="110" ry="8" fill="{c["ink"]}" opacity=".15"/>'
        f'<path d="M96 224 V168 C96 110 150 92 200 92 C250 92 304 110 304 168 V224Z" fill="{PALETTE["oat"]}"/>'
        f'<path d="M96 206 H304 V224 H96Z" fill="{c["ink"]}" opacity=".25"/>'
        + "".join(f'<path d="M{x} 118 q18 20 30 40" stroke="{c["ink"]}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".5"/>' for x in (138, 180, 222))
        + f'<path d="M318 230 Q322 150 334 88" stroke="{PALETTE["citrus"]}" stroke-width="4" fill="none"/>'
        + "".join(f'<ellipse cx="{334 - i * 3 + s * 8}" cy="{96 + i * 18}" rx="5" ry="11" fill="{PALETTE["citrus"]}" transform="rotate({s * 30} {334 - i * 3 + s * 8} {96 + i * 18})"/>'
                  for i in range(4) for s in (-1, 1))
    )


def cake(c):
    drips = [(122, 22), (146, 34), (172, 18), (196, 30), (222, 20), (246, 36), (268, 24)]
    sprinkles = [(150, 122, 30, "citrus"), (178, 118, -20, "sky"), (212, 124, 60, WHITE), (240, 119, -40, "leaf"), (262, 125, 15, "citrus")]
    return (
        f'<ellipse cx="200" cy="254" rx="100" ry="8" fill="{c["ink"]}" opacity=".15"/>'
        f'<path d="M184 230 H216 L226 250 H174Z" fill="{WHITE}" opacity=".9"/>'
        f'<rect x="92" y="222" width="216" height="11" rx="5.5" fill="{WHITE}"/>'
        f'<rect x="118" y="124" width="164" height="98" rx="10" fill="{PALETTE["oat"]}"/>'
        f'<rect x="118" y="172" width="164" height="10" fill="#FFF4F4"/>'
        f'<rect x="118" y="182" width="164" height="5" fill="{c["accent"]}" opacity=".8"/>'
        f'<path d="M118 206 H282 V212 Q282 222 272 222 H128 Q118 222 118 212Z" fill="{c["ink"]}" opacity=".2"/>'
        f'<rect x="112" y="110" width="176" height="28" rx="12" fill="{c["accent"]}"/>'
        + "".join(f'<rect x="{x}" y="126" width="16" height="{d}" rx="8" fill="{c["accent"]}"/>' for x, d in drips)
        + "".join(f'<rect x="{x - 5}" y="{y - 1.5}" width="10" height="3" rx="1.5" fill="{PALETTE.get(k, k)}" transform="rotate({a} {x} {y})"/>' for x, y, a, k in sprinkles)
        + f'<path d="M200 98 q4 -18 16 -26" stroke="{PALETTE["herb"]}" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
        + leaf(212, 76, -20, 0.45, PALETTE["leaf"])
        + f'<circle cx="200" cy="100" r="13" fill="{PALETTE["tomato"]}"/><circle cx="195" cy="95" r="3.5" fill="{WHITE}" opacity=".6"/>'
    )


def dessert(c):
    return (
        f'<ellipse cx="200" cy="250" rx="60" ry="7" fill="{c["ink"]}" opacity=".15"/>'
        f'<path d="M142 108 H258 L240 246 H160Z" fill="{WHITE}" opacity=".9"/>'
        f'<path d="M150 214 H250 L242 244 H158Z" fill="{PALETTE["oat"]}"/>'
        f'<path d="M154 182 H246 L250 214 H150Z" fill="#FFF4F4"/>'
        f'<path d="M150 158 H250 L246 182 H154Z" fill="{PALETTE["berry"]}"/>'
        f'<path d="M146 130 H254 L250 158 H150Z" fill="#FFF4F4"/>'
        + "".join(f'<circle cx="{x}" cy="{y}" r="4" fill="{c["ink"]}" opacity=".35"/>' for x, y in [(170, 228), (200, 232), (228, 226)])
        + f'<path d="M200 84 C184 84 176 104 188 124 Q200 138 212 124 C224 104 216 84 200 84Z" fill="{PALETTE["tomato"]}"/>'
        + leaf(196, 86, -60, 0.5, PALETTE["leaf"]) + leaf(204, 86, -120, 0.5, PALETTE["leaf"])
        + "".join(f'<circle cx="{x}" cy="{y}" r="7" fill="{PALETTE["plum"]}"/>' for x, y in [(168, 126), (232, 126)])
    )


def drink(c):
    return (
        f'<ellipse cx="200" cy="252" rx="56" ry="7" fill="{c["ink"]}" opacity=".15"/>'
        f'<path d="M258 60 L226 150" stroke="{PALETTE["berry"]}" stroke-width="9" stroke-linecap="round"/>'
        f'<path d="M150 96 H250 L238 246 H162Z" fill="{WHITE}" opacity=".85"/>'
        f'<path d="M154 128 H246 L238 242 H162Z" fill="{c["accent"]}" opacity=".7"/>'
        + "".join(f'<rect x="{x}" y="{y}" width="26" height="26" rx="5" fill="{WHITE}" opacity=".75" transform="rotate({a} {x + 13} {y + 13})"/>'
                  for x, y, a in [(166, 136, 12), (200, 150, -10)])
        + "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{WHITE}" opacity=".8"/>' for x, y, r in [(180, 200, 4), (214, 214, 3), (196, 226, 5), (224, 188, 3)])
        + f'<circle cx="152" cy="100" r="30" fill="{PALETTE["citrus"]}"/><circle cx="152" cy="100" r="23" fill="#FCE6A6"/>'
        + "".join(f'<path d="M152 100 L{152 + 21 * dx} {100 + 21 * dy}" stroke="{PALETTE["citrus"]}" stroke-width="2.5"/>'
                  for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1), (.7, .7), (-.7, .7), (.7, -.7), (-.7, -.7)])
        + leaf(244, 92, -40, 0.7, PALETTE["leaf"])
    )


def sauce(c):
    return (
        f'<ellipse cx="200" cy="248" rx="70" ry="8" fill="{c["ink"]}" opacity=".15"/>'
        f'<rect x="146" y="120" width="108" height="126" rx="22" fill="{WHITE}" opacity=".9"/>'
        f'<rect x="152" y="136" width="96" height="104" rx="18" fill="{c["accent"]}" opacity=".8"/>'
        f'<rect x="140" y="96" width="120" height="30" rx="8" fill="{c["ink"]}" opacity=".75"/>'
        f'<rect x="166" y="170" width="68" height="40" rx="8" fill="{CREAM}"/>'
        + leaf(186, 190, -20, 0.6, PALETTE["leaf"])
        + f'<path d="M296 222 Q300 150 262 104" stroke="{PALETTE["herb"]}" stroke-width="4" fill="none"/>'
        + "".join(leaf(296 - i * 9, 212 - i * 26, a, 0.75, PALETTE["leaf"] if i % 2 else PALETTE["herb"])
                  for i, a in enumerate([-20, -160, -40, -150]))
        + f'<circle cx="118" cy="226" r="9" fill="{PALETTE["citrus"]}"/><circle cx="102" cy="236" r="6" fill="{PALETTE["tomato"]}"/>'
    )


def plate(c):
    return (
        f'<ellipse cx="200" cy="252" rx="92" ry="7" fill="{c["ink"]}" opacity=".12"/>'
        f'<circle cx="200" cy="152" r="96" fill="{WHITE}"/>'
        f'<circle cx="200" cy="152" r="72" fill="none" stroke="{c["mid"]}" stroke-width="3"/>'
        f'<rect x="80" y="70" width="10" height="160" rx="5" fill="{c["ink"]}" opacity=".55"/>'
        f'<path d="M72 70 v34 q0 10 13 10 q13 0 13 -10 v-34" fill="none" stroke="{c["ink"]}" stroke-width="5" opacity=".55" stroke-linecap="round"/>'
        f'<path d="M312 70 q16 20 0 80 v80" stroke="{c["ink"]}" stroke-width="10" fill="none" opacity=".55" stroke-linecap="round"/>'
        + leaf(186, 150, -30, 0.9, PALETTE["leaf"]) + leaf(192, 152, -80, 0.8, PALETTE["avocado"])
    )


# file name -> (palette colour, drawing); names match the category entries in taxonomy.js
ILLUSTRATIONS = {
    "breakfast.svg": ("citrus", breakfast, "Illustration of a porridge bowl with berries"),
    "main.svg": ("tomato", main_dish, "Illustration of a plate with fish and greens"),
    "soup.svg": ("carrot", soup, "Illustration of a steaming bowl of soup"),
    "salad.svg": ("leaf", salad, "Illustration of a salad bowl"),
    "side.svg": ("teal", side, "Illustration of vegetable sticks with a dip"),
    "snack.svg": ("plum", snack, "Illustration of an apple and nuts"),
    "baking.svg": ("oat", baking, "Illustration of a loaf of bread and wheat"),
    "cake.svg": ("rose", cake, "Illustration of a layer cake with a cherry on a cake stand"),
    "dessert.svg": ("berry", dessert, "Illustration of a yoghurt parfait with a strawberry"),
    "drink.svg": ("sky", drink, "Illustration of a glass with lemon and a straw"),
    "sauce.svg": ("herb", sauce, "Illustration of a jar of sauce with herbs"),
    "plate.svg": ("leaf", plate, "Illustration of an empty plate"),
}


# ---------------------------------------------------------------- site artwork

def svg_doc(view_box, title, body):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}" role="img" aria-label="{title}">'
        f"<title>{title}</title>{body}</svg>\n"
    )


def placed(draw, color, cx, cy, scale, subject_center=(200, 160)):
    # Reuse a category drawing (made for the 400x300 canvas) at another position and size
    sx, sy = subject_center
    return f'<g transform="translate({cx - sx * scale} {cy - sy * scale}) scale({scale})">{draw(shades(color))}</g>'


def logo_mark():
    # Also used as the header logo; the site name next to it is HTML text in the heading font
    return (
        leaf(32, 30, -58, 0.62, PALETTE["avocado"])
        + leaf(31, 30, -122, 0.5, PALETTE["herb"])
        + f'<circle cx="47" cy="17" r="4.5" fill="{PALETTE["berry"]}"/>'
        + f'<path d="M6 32 H58 A26 22 0 0 1 6 32Z" fill="{PALETTE["leaf"]}"/>'
        + f'<path d="M14 40 H50" stroke="{WHITE}" stroke-width="3" stroke-linecap="round" opacity=".55"/>'
    )


def favicon():
    # Solid tile and fewer details so it stays recognisable at 16 px
    return (
        f'<rect width="64" height="64" rx="14" fill="{PALETTE["leaf"]}"/>'
        + leaf(32, 33, -58, 0.55, PALETTE["citrus"], vein=PALETTE["leaf"])
        + leaf(31, 33, -122, 0.45, "#D8EFC0", vein=PALETTE["leaf"])
        + f'<path d="M11 34 H53 A21 18 0 0 1 11 34Z" fill="{WHITE}"/>'
    )


def carrot(x, y, angle, scale=1.0):
    return (
        f'<g transform="translate({x} {y}) rotate({angle}) scale({scale})">'
        + leaf(-4, 0, 200, 0.5, PALETTE["leaf"]) + leaf(-4, 0, 160, 0.45, PALETTE["herb"])
        + f'<path d="M0 -11 Q70 -6 96 0 Q70 6 0 11 Q-5 0 0 -11Z" fill="{PALETTE["carrot"]}"/>'
        + "".join(f'<path d="M{x2} -6 v5" stroke="{WHITE}" stroke-width="2" stroke-linecap="round" opacity=".6"/>' for x2 in (22, 42, 62))
        + "</g>"
    )


def lemon_half(x, y, r):
    spokes = "".join(
        f'<path d="M{x} {y} L{x + (r - 6) * dx} {y + (r - 6) * dy}" stroke="{PALETTE["citrus"]}" stroke-width="2.5"/>'
        for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1), (.7, .7), (-.7, .7), (.7, -.7), (-.7, -.7)]
    )
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{PALETTE["citrus"]}"/><circle cx="{x}" cy="{y}" r="{r - 6}" fill="#FCE6A6"/>{spokes}'


def hero():
    mint = shades("leaf")
    dots = [(60, 60, 5), (120, 360, 4), (740, 70, 4), (760, 330, 6), (560, 40, 3), (250, 40, 3), (690, 210, 3), (40, 230, 3)]
    return (
        f'<rect width="800" height="400" fill="{mint["tint"]}"/>'
        f'<circle cx="400" cy="215" r="185" fill="{mint["mid"]}" opacity=".5"/>'
        f'<circle cx="165" cy="275" r="105" fill="{shades("citrus")["mid"]}" opacity=".45"/>'
        f'<circle cx="640" cy="215" r="110" fill="{shades("sky")["mid"]}" opacity=".45"/>'
        + "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{PALETTE["leaf"]}" opacity=".3"/>' for x, y, r in dots)
        + leaf(26, 24, 35, 1.1, PALETTE["leaf"]) + leaf(60, 30, 80, 0.8, PALETTE["avocado"])
        + leaf(774, 376, 215, 1.1, PALETTE["leaf"]) + leaf(740, 380, 260, 0.8, PALETTE["herb"])
        + placed(snack, "plum", 165, 250, 0.72)
        + placed(drink, "sky", 640, 215, 0.8)
        + placed(salad, "leaf", 400, 215, 1.2)
        + carrot(250, 352, -12, 1.0)
        + lemon_half(560, 345, 26)
        + "".join(f'<circle cx="{x}" cy="{y}" r="9" fill="{PALETTE[k]}"/>' for x, y, k in [(470, 360, "berry"), (488, 350, "plum"), (482, 368, "berry")])
    )


def empty_planner():
    c = shades("sky")
    cells = []
    for row in range(2):
        for col in range(3):
            x, y = 146 + col * 38, 128 + row * 42
            cells.append(f'<rect x="{x}" y="{y}" width="30" height="32" rx="7" fill="{c["tint"]}"/>')
    return (
        background(c)
        + f'<ellipse cx="200" cy="246" rx="80" ry="7" fill="{c["ink"]}" opacity=".15"/>'
        + f'<rect x="126" y="74" width="148" height="166" rx="18" fill="{WHITE}"/>'
        + f'<path d="M126 110 V92 a18 18 0 0 1 18 -18 H256 a18 18 0 0 1 18 18 V110Z" fill="{c["accent"]}"/>'
        + "".join(f'<rect x="{x}" y="62" width="10" height="26" rx="5" fill="{c["ink"]}" opacity=".7"/>' for x in (156, 234))
        + "".join(cells)
        + f'<rect x="146" y="212" width="106" height="12" rx="6" fill="{c["tint"]}"/>'
        + f'<circle cx="199" cy="186" r="12" fill="{WHITE}" stroke="{c["mid"]}" stroke-width="2.5"/>'
        + leaf(193, 187, -40, 0.28, PALETTE["leaf"])
        + f'<circle cx="274" cy="232" r="24" fill="{PALETTE["leaf"]}"/>'
        + f'<path d="M274 220 V244 M262 232 H286" stroke="{WHITE}" stroke-width="5" stroke-linecap="round"/>'
    )


def no_results():
    c = shades("teal")
    return (
        background(c)
        + bowl(c, top_y=168, width=180, depth=70)
        + leaf(178, 166, -20, 0.55, PALETTE["leaf"])
        + f'<circle cx="228" cy="164" r="4" fill="{PALETTE["oat"]}"/>'
        + f'<path d="M270 136 L308 176" stroke="{c["ink"]}" stroke-width="14" stroke-linecap="round" opacity=".8"/>'
        + f'<circle cx="244" cy="110" r="40" fill="{WHITE}" opacity=".6" stroke="{c["ink"]}" stroke-width="10"/>'
        + f'<path d="M224 96 q10 -14 26 -12" stroke="{WHITE}" stroke-width="5" fill="none" stroke-linecap="round"/>'
    )


def four(x, y, color):
    # Drawn as a stroke path so the digits do not depend on fonts being available
    return (
        f'<path d="M{x + 52} {y + 104} V{y} L{x} {y + 70} H{x + 74}" fill="none" stroke="{color}" '
        f'stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>'
    )


def not_found():
    c = shades("leaf")
    return (
        background(c)
        + four(62, 96, PALETTE["leaf"])
        + four(264, 96, PALETTE["leaf"])
        + f'<ellipse cx="200" cy="222" rx="54" ry="6" fill="{c["ink"]}" opacity=".15"/>'
        + f'<circle cx="200" cy="150" r="58" fill="{WHITE}"/>'
        + f'<circle cx="200" cy="150" r="42" fill="none" stroke="{c["mid"]}" stroke-width="3"/>'
        + leaf(186, 150, -20, 0.5, PALETTE["avocado"])
        # a stray pea and tomato "rolled off the plate"
        + f'<circle cx="300" cy="238" r="12" fill="{PALETTE["tomato"]}"/><circle cx="296" cy="234" r="3" fill="{WHITE}" opacity=".6"/>'
        + f'<circle cx="328" cy="244" r="6" fill="{PALETTE["avocado"]}"/>'
        + f'<path d="M262 236 h16 M252 244 h14" stroke="{c["ink"]}" stroke-width="3" stroke-linecap="round" opacity=".35"/>'
    )


# file name -> (viewBox, title, drawing)
SITE_ARTWORK = {
    "logo.svg": ("0 0 64 64", "Recipe Book logo", logo_mark),
    "favicon.svg": ("0 0 64 64", "Recipe Book", favicon),
    "hero.svg": ("0 0 800 400", "Illustration of a salad bowl, an apple, a drink and fresh produce", hero),
    "empty-planner.svg": ("0 0 400 300", "Illustration of an empty weekly calendar", empty_planner),
    "no-results.svg": ("0 0 400 300", "Illustration of a magnifying glass over an empty bowl", no_results),
    "404.svg": ("0 0 400 300", "Illustration of the number 404 with a plate as the zero", not_found),
}


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    for file_name, (color, draw, title) in ILLUSTRATIONS.items():
        c = shades(color)
        svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" role="img" aria-label="{title}">'
            f"<title>{title}</title>{background(c)}{draw(c)}</svg>\n"
        )
        (OUT / file_name).write_text(svg, encoding="utf-8")
    for file_name, (view_box, title, draw) in SITE_ARTWORK.items():
        (OUT / file_name).write_text(svg_doc(view_box, title, draw()), encoding="utf-8")
    print(f"wrote {len(ILLUSTRATIONS) + len(SITE_ARTWORK)} files to {OUT}")


if __name__ == "__main__":
    build()
