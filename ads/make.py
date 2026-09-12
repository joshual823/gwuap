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

VARIANTS = [
    # name, w, h, headline, sub, scale, object-position, headline top
    ("gw-field-square", 1080, 1080, ["Build", "your squad"],
     "<b>Free to join.</b> No card, ever.", 1.00, "50% 58%", "20%"),
    ("gw-field-wide", 1200, 628, ["Build your squad"],
     "<b>Free to join.</b> No card, ever.", 0.66, "50% 46%", "26%"),
    ("gw-meet-square", 1080, 1080, ["The group chat", "for sports"],
     "<b>Free to join.</b> No card, ever.", 0.80, "50% 58%", "20%"),
]

for name, w, h, lines, sub, scale, pos, top in VARIANTS:
    html = (TEMPLATE
            .replace("{{W}}", str(w)).replace("{{H}}", str(h))
            .replace("{{SCALE}}", str(scale)).replace("{{POS}}", pos)
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
