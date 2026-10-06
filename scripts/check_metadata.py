"""Validate the static site's metadata and locally supplied sharing assets."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
import json
import re
import struct
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://school.junkbranding.com'
NOINDEX = {'confirm.html', 'thanks.html'}

class Head(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = {}
        self.counts = Counter()
        self.canonicals = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta':
            key = attrs.get('name', attrs.get('property', ''))
            if key:
                self.tags[key] = attrs.get('content', '')
                self.counts[key] += 1
        elif tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonicals.append(attrs['href'])


def local_urls(value):
    if isinstance(value, dict):
        for child in value.values():
            local_urls(child)
    elif isinstance(value, list):
        for child in value:
            local_urls(child)
    elif isinstance(value, str) and value.startswith(BASE):
        parsed = urlparse(value)
        assert parsed.netloc == 'school.junkbranding.com', value
        assert (ROOT / (parsed.path.lstrip('/') or 'index.html')).is_file(), value


def png_size(filename):
    data = (ROOT / filename).read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    return struct.unpack('>II', data[16:24])


def main():
    descriptions, titles, indexed = [], [], set()
    pages = sorted(ROOT.glob('*.html'))
    for path in pages:
        head = path.read_text().split('</head>', 1)[0]
        assert 'https://example.com' not in head, path.name
        parser = Head()
        parser.feed(head)
        tags = parser.tags
        url = BASE + ('/' if path.name == 'index.html' else '/' + path.name)
        assert parser.canonicals == [url], path.name
        for key in ['viewport', 'description', 'robots', 'og:type', 'og:site_name', 'og:title', 'og:description', 'og:url', 'og:image', 'og:image:type', 'og:image:width', 'og:image:height', 'og:image:alt', 'og:locale', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:image:alt']:
            assert parser.counts[key] == 1 and tags[key].strip(), (path.name, key)
        assert len(re.findall(r'<title>', head)) == 1, path.name
        title = re.search(r'<title>(.*?)</title>', head).group(1)
        assert title == tags['og:title'] == tags['twitter:title'], path.name
        assert tags['description'] == tags['og:description'] == tags['twitter:description']
        assert tags['og:url'] == url
        assert tags['og:image'] == tags['twitter:image'] == BASE + '/ogp.png'
        assert (int(tags['og:image:width']), int(tags['og:image:height'])) == png_size('ogp.png')
        assert ('noindex' in tags['robots']) == (path.name in NOINDEX), path.name
        if path.name not in NOINDEX:
            indexed.add(url)
        titles.append(title)
        descriptions.append(tags['description'])
        schemas = re.findall(r'<script type="application/ld\+json">(.*?)</script>', head, re.S)
        assert schemas, path.name
        for source in schemas:
            schema = json.loads(source)
            local_urls(schema)
            page = next(n for n in schema['@graph'] if n.get('@id') == url + '#webpage')
            assert page['description'] == tags['description']
    assert len(set(titles)) == len(pages), 'Duplicate page titles'
    assert len(set(descriptions)) == len(pages), 'Duplicate page descriptions'
    entries = ET.parse(ROOT / 'sitemap.xml').findall('{*}url/{*}loc')
    assert {e.text for e in entries} == indexed
    assert len(entries) == len(indexed)
    assert 'Sitemap: ' + BASE + '/sitemap.xml' in (ROOT / 'robots.txt').read_text()
    assert png_size('logo.png') == (512, 512)
    print(f'PASS: {len(pages)} pages; unique titles/descriptions; OGP/X; canonical; JSON-LD; {len(indexed)} sitemap URLs; noindex; PNG assets')

if __name__ == '__main__':
    main()
