#!/usr/bin/env python3
"""
Renders the ad creatives. The field is drawn in CSS rather than
photographed — a stock football photo we don't own is a copyright
problem in a paid ad, and a field is mostly stripes and straight lines.
"""
import subprocess, sys, pathlib

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
HERE = pathlib.Path(__file__).parent

TEMPLATE = open(HERE / "field.tmpl.html").read()

VARIANTS = [
    # name,                 w,    h,   headline lines,                   sub,                        scale
    ("gw-field-square",     1080, 1080, ["Build", "your squad"],          "<b>Free to join.</b> No card, ever.", 1.00),
    ("gw-field-wide",       1200,  628, ["Build your squad"],             "<b>Free to join.</b> No card, ever.", 0.62),
    ("gw-meet-square",      1080, 1080, ["The group chat", "for sports"], "<b>Free to join.</b> No card, ever.", 0.74),
]

for name, w, h, lines, sub, scale in VARIANTS:
    html = (TEMPLATE
            .replace("{{W}}", str(w)).replace("{{H}}", str(h))
            .replace("{{SCALE}}", str(scale))
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
