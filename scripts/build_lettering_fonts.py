"""Build the offline, outlined Latin lettering library from SIL OFL fonts.

Requires fontTools. Downloads official Google Fonts sources into a temporary
directory; no network or font server is needed by the app. Outlines retain all
contours (including counters such as B/8/O), never rectangular approximations.
"""
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.request import urlopen
from urllib.parse import quote
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
FONT_SPECS = [
    ('clara', 'Clara', 'Figtree', 'figtree/Figtree[wght].ttf'),
    ('elegante', 'Elegante', 'Bodoni Moda', 'bodonimoda/BodoniModa[opsz,wght].ttf'),
    ('manuscrita', 'Manuscrita', 'Pacifico', 'pacifico/Pacifico-Regular.ttf'),
    ('mono', 'Monoespaciada', 'IBM Plex Mono', 'ibmplexmono/IBMPlexMono-Regular.ttf'),
    ('comic', 'Cómic', 'Bangers', 'bangers/Bangers-Regular.ttf'),
]
CHARS = ''.join(dict.fromkeys('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ÁÉÍÓÚÜÑáéíóúüñ¿?¡!.,:;+-_/&@#()\'"'))


def main():
    fonts = []
    licenses = ROOT / 'public' / 'licencias' / 'bordado'
    licenses.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(prefix='hilvana-fonts-') as cache:
        for key, label, family, relative in FONT_SPECS:
            url = 'https://raw.githubusercontent.com/google/fonts/main/ofl/' + quote(relative)
            data = urlopen(url).read()
            source = Path(cache) / (key + '.ttf')
            source.write_bytes(data)
            font = TTFont(source)
            units = font['head'].unitsPerEm
            glyph_set = font.getGlyphSet()
            cmap = font.getBestCmap()
            glyphs = {}
            for char in CHARS:
                name = cmap.get(ord(char))
                if not name:
                    continue
                pen = SVGPathPen(glyph_set, ntos=lambda value: f'{value:.3f}'.rstrip('0').rstrip('.') if value else '0')
                glyph_set[name].draw(TransformPen(pen, (100 / units, 0, 0, -100 / units, 0, 0)))
                glyphs[char] = {'d': pen.getCommands(), 'advance': round(font['hmtx'][name][0] / units * 100, 5)}
            license_url = 'https://raw.githubusercontent.com/google/fonts/main/ofl/' + relative.split('/')[0] + '/OFL.txt'
            (licenses / (key + '-OFL.txt')).write_bytes(urlopen(license_url).read())
            fonts.append({'id': key, 'name': label, 'family': family, 'sourceUrl': url,
                          'sha256': hashlib.sha256(data).hexdigest(), 'license': 'SIL OFL 1.1',
                          'licensePath': 'licencias/bordado/' + key + '-OFL.txt', 'glyphs': glyphs})
            print(f'{family}: {len(glyphs)} glyphs')
    target = ROOT / 'src' / 'data' / 'letteringFonts.json'
    target.write_text(json.dumps(fonts, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(target, target.stat().st_size, 'bytes')


if __name__ == '__main__':
    main()
