"""Subset official Zen Kaku Gothic New TTFs for the site's text.

Usage: python scripts/build-fonts.py /path/to/source-directory
Requires fonttools and brotli; see assets/fonts/README.md.
"""
from pathlib import Path
import sys
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
sources = Path(sys.argv[1])
text = ''.join(p.read_text() for pattern in ('*.html', 'assets/js/*.js', 'assets/css/*.css')
               for p in ROOT.glob(pattern))
characters = set(map(ord, text)) | set(range(32, 127))
for weight, name in [(400, 'regular'), (500, 'medium'), (700, 'bold'), (900, 'black')]:
    font = TTFont(sources / f'{name}.ttf', recalcTimestamp=False)
    options = subset.Options()
    options.flavor = 'woff2'
    options.recalc_timestamp = False
    job = subset.Subsetter(options=options)
    job.populate(unicodes=characters)
    job.subset(font)
    font.flavor = 'woff2'
    output = ROOT / f'assets/fonts/zen-kaku-{weight}.woff2'
    font.save(output)
    print(f'{output.name}: {output.stat().st_size} bytes')
