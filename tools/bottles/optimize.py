#!/usr/bin/env python3
"""Shrink the designed bottle SVGs for the app.

The Claude Design export embeds three complete web fonts (~150 KB) in every bottle. This keeps
each @font-face but subsets it to the characters the bottle actually prints, so the SVG stays
self-contained (fonts + SMIL animations work inside <img>) at a few KB.

    python3 tools/bottles/optimize.py [src_dir] [out_dir]
    (needs: pip install fonttools brotli)
"""
import base64, io, re, sys, html
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else 'docs/pilsbuddy-mobile-app-design/bottles')
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else 'public/bottles')

FACE = re.compile(r"@font-face\s*\{(?P<body>.*?)\}", re.S)
FAMILY = re.compile(r"font-family:\s*'([^']+)'")
DATA = re.compile(r"url\(data:font/woff2;base64,([A-Za-z0-9+/=]+)\)")
TEXT = re.compile(r"<text\b([^>]*)>(.*?)</text>", re.S)


def used_chars(svg: str) -> dict[str, str]:
    """family → characters printed with it (every <text> names its family)."""
    out: dict[str, set[str]] = {}
    for attrs, body in TEXT.findall(svg):
        fam = re.search(r"font-family=\"'?([^',\"]+)", attrs)
        if not fam:
            continue
        txt = html.unescape(re.sub(r'<[^>]+>', '', body))
        out.setdefault(fam.group(1), set()).update(txt + txt.upper() + txt.lower())
    return {k: ''.join(sorted(v)) for k, v in out.items()}


def subset_woff2(b64: str, chars: str) -> str:
    font = TTFont(io.BytesIO(base64.b64decode(b64)))
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['kern', 'liga']
    opts.name_IDs = []
    opts.notdef_outline = True
    s = subset.Subsetter(opts)
    s.populate(text=chars + ' ')
    s.subset(font)
    buf = io.BytesIO()
    font.flavor = 'woff2'
    font.save(buf)
    return base64.b64encode(buf.getvalue()).decode()


def optimize(svg: str) -> str:
    chars = used_chars(svg)

    def face(m: re.Match) -> str:
        body = m.group('body')
        fam = FAMILY.search(body).group(1)
        if fam not in chars:
            return ''  # font never used on this bottle
        body = DATA.sub(lambda d: f"url(data:font/woff2;base64,{subset_woff2(d.group(1), chars[fam])})", body)
        body = re.sub(r"\s*unicode-range:[^;]*;", '', body)
        body = re.sub(r"\s*font-display:[^;]*;", '', body)
        return '@font-face{' + re.sub(r'\s*\n\s*', '', body) + '}'

    svg = FACE.sub(face, svg)
    svg = re.sub(r'<style>\s*', '<style>', svg)
    svg = re.sub(r'\s*</style>', '</style>', svg)
    svg = re.sub(r'(\d+\.\d{2})\d+', r'\1', svg)  # 752.7460317 → 752.74
    return svg


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    before = after = 0
    for src in sorted(SRC.glob('*.svg')):
        raw = src.read_text()
        small = optimize(raw)
        (OUT / src.name).write_text(small)
        before += len(raw)
        after += len(small)
        print(f'{src.stem:24} {len(raw) // 1024:4} KB → {len(small) / 1024:5.1f} KB')
    print(f'total {before // 1024} KB → {after // 1024} KB')


if __name__ == '__main__':
    main()
