"""Check generated blog navigation, article anchors, feeds and local resources."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.urls, self.ids, self.tags = [], [], []
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append((tag, attrs))
        if 'id' in attrs:
            assert attrs['id'] not in self.ids, ('duplicate ID', attrs['id'])
            self.ids.append(attrs['id'])
        for key in ('href', 'src'):
            if key in attrs: self.urls.append(attrs[key])

pages = [ROOT / 'blog.html', *sorted(ROOT.glob('blog-*.html'))]
for path in pages:
    parsed = Page(path.read_text())
    for url in parsed.urls:
        parts = urlsplit(url)
        if parts.scheme or parts.netloc: continue
        target = ROOT / (unquote(parts.path) or path.name)
        assert target.is_file(), (path.name, 'broken link', url)
        if parts.fragment and target.suffix == '.html':
            assert unquote(parts.fragment) in Page(target.read_text()).ids, (path.name, 'broken anchor', url)
    if path.name != 'blog.html':
        assert any(tag == 'h2' and a.get('id','').startswith('section-') for tag,a in parsed.tags), path.name
        assert any(tag == 'a' and a.get('href') == 'blog.html#articles' for tag,a in parsed.tags), path.name
for path in ROOT.glob('*.html'):
    assert 'href="blog.html"' in path.read_text(), (path.name, 'missing blog navigation')
feed = ET.parse(ROOT / 'blog-feed.xml')
assert len(feed.findall('./channel/item')) == len(pages) - 1
for item in feed.findall('./channel/item'):
    assert (ROOT / urlsplit(item.findtext('link')).path.lstrip('/')).exists()
print(f'PASS: {len(pages)} blog pages; local links, anchors, IDs, site navigation, RSS')
