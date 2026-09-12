#!/usr/bin/env python3
"""
Renders the Reddit creatives.

The field is a photograph (`field.jpg`) — an earlier version drew it in
CSS and it read as a cartoon, which is exactly what a feed full of real
photographs does to a vector. Confirm the stock licence covers
advertising before any of these run.
"""
import subprocess, pathlib

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
HERE = pathlib.Path(__file__).parent
TEMPLATE = (HERE / "field.tmpl.html").read_text()

SUB = "<b>Free to join.</b> No card, ever."

# Phase 2 — a basketball court, a rink, a pitch — is one row each, paired
# with its own sport's ad group. Shipping football alone first is a budget
# decision, not a design one: see CAMPAIGN-sports-social-sep.md.
VARIANTS = [
    # name, photo, w, h, headline, sub, scale, object-position, headline top
    ("gw-field-square", "field.jpg", 1080, 1080, ["Build", "your squad"],
     SUB, 1.00, "50% 58%", "20%"),
    ("gw-field-wide", "field.jpg", 1200, 628, ["Build your squad"],
     SUB, 0.66, "50% 46%", "26%"),
    ("gw-meet-square", "field.jpg", 1080, 1080, ["The group chat", "for sports"],
     SUB, 0.80, "50% 58%", "20%"),
]

for name, photo, w, h, lines, sub, scale, pos, top in VARIANTS:
    html = (TEMPLATE
            .replace("{{W}}", str(w)).replace("{{H}}", str(h))
            .replace("{{SCALE}}", str(scale)).replace("{{POS}}", pos).replace("{{PHOTO}}", photo)
            .replace("{{TOP}}", top)
            .replace("{{HEAD}}", "".join(f"<em>{l}</em>" for l in lines))
            .replace("{{SUB}}", sub))
    src = HERE / f".{name}.html"
    src.write_text(html)
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                    "--force-device-scale-factor=1",
                    f"--screenshot={HERE / (name + '.png')}",
                    f"--window-size={w},{h}", str(src)],
                   stderr=subprocess.DEVNULL, check=False)
    src.unlink()
    print(f"{name}.png  {w}x{h}")
