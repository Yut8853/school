"""Check generated blog navigation, article anchors, feeds and local resources."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import xml.etree.ElementTree as ET
import json

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
articles = {}
for source in (ROOT / 'content/blog').glob('*.md'):
    if source.name.startswith('_'): continue
    meta = json.loads(source.read_text().split('---', 2)[1])
    if not meta.get('draft'):
        articles[f'blog-{source.stem}.html'] = meta
categories = {
    'learning': '学習ガイド', 'html-css': 'HTML / CSS', 'javascript': 'JavaScript',
    'accessibility': 'アクセシビリティ', 'design': 'デザイン',
    'publishing': '公開・運用', 'workflow': '制作の進め方',
}
category_pages = {f'blog-category-{slug}.html': name for slug, name in categories.items()}
assert {p.name for p in pages} == {'blog.html', *articles, *category_pages}
for path in pages:
    parsed = Page(path.read_text())
    for url in parsed.urls:
        parts = urlsplit(url)
        if parts.scheme or parts.netloc: continue
        local_path = unquote(parts.path)
        if not local_path:
            target = path
        else:
            target = ROOT / local_path.lstrip('/')
            if local_path.endswith('/'):
                target = target / 'index.html'
        assert target.resolve().is_relative_to(ROOT), (path.name, 'outside site', url)
        assert target.is_file(), (path.name, 'broken link', url)
        if parts.fragment and target.suffix == '.html':
            assert unquote(parts.fragment) in Page(target.read_text()).ids, (path.name, 'broken anchor', url)
    if path.name in articles:
        assert any(tag == 'h2' and a.get('id','').startswith('section-') for tag,a in parsed.tags), path.name
        assert any(tag == 'a' and a.get('href') == 'blog.html#articles' for tag,a in parsed.tags), path.name
    elif path.name in category_pages:
        category = category_pages[path.name]
        cards = [a for tag, a in parsed.tags if tag == 'article' and 'data-post' in a]
        expected = {name[5:-5] for name, meta in articles.items() if meta['category'] == category}
        assert len(cards) == len(expected), (path.name, 'category card count')
        assert {a['data-slug'] for a in cards} == expected, (path.name, 'category articles')
        assert all(a['data-category'] == category for a in cards), path.name
for path in ROOT.glob('*.html'):
    assert 'href="blog.html"' in path.read_text(), (path.name, 'missing blog navigation')
feed = ET.parse(ROOT / 'blog-feed.xml')
assert len(feed.findall('./channel/item')) == len(articles)
assert {urlsplit(item.findtext('link')).path.lstrip('/') for item in feed.findall('./channel/item')} == set(articles)
for item in feed.findall('./channel/item'):
    assert (ROOT / urlsplit(item.findtext('link')).path.lstrip('/')).exists()
print(f'PASS: {len(pages)} blog pages; local links, anchors, IDs, site navigation, RSS')
