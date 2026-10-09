import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const code = readFileSync(new URL('../assets/js/blog.js', import.meta.url), 'utf8');
const { normalize, matchesPost } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const post = { category: 'HTML / CSS', search: 'リンクとボタン HTML CSS キーボード アクセシビリティ' };
test('empty search displays all articles', () => assert.equal(matchesPost(post, '', ''), true));
test('category and query must both match', () => {
  assert.equal(matchesPost(post, 'html', 'HTML / CSS'), true);
  assert.equal(matchesPost(post, 'html', 'デザイン'), false);
});
test('Japanese search and full-width Latin normalize', () => {
  assert.equal(matchesPost(post, 'ＨＴＭＬ　キーボード', ''), true);
  assert.equal(normalize('  ＣＳＳ　 '), 'css');
});
test('all query terms are required regardless of order', () => {
  assert.equal(matchesPost(post, 'キーボード html', ''), true);
  assert.equal(matchesPost(post, 'html WordPress', ''), false);
});
test('HTML and regular expressions are treated as literal search text', () => {
  assert.equal(matchesPost(post, '<img onerror=alert(1)>', ''), false);
  assert.equal(matchesPost(post, '.*', ''), false);
});
test('whitespace-only queries do not hide cards', () => assert.equal(matchesPost(post, '\n　 ', ''), true));

const { paginatePosts } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const ninePosts = Array.from({ length: 9 }, (_, id) => ({ id, category: id % 2 ? 'デザイン' : 'HTML / CSS', search: `記事 ${id}` }));
test('nine articles paginate into six and three without omissions or duplicates', () => {
  const first = paginatePosts(ninePosts);
  const second = paginatePosts(ninePosts, '2');
  assert.deepEqual([first.items.length, second.items.length], [6, 3]);
  assert.deepEqual([...first.items, ...second.items], ninePosts);
  assert.deepEqual([second.start, second.end, second.total, second.pageCount], [7, 9, 9, 2]);
});
test('empty results and exact page boundaries do not create extra pages', () => {
  assert.deepEqual(paginatePosts([]), { items: [], total: 0, page: 1, pageCount: 1, start: 0, end: 0 });
  assert.equal(paginatePosts(ninePosts.slice(0, 6)).pageCount, 1);
  assert.equal(paginatePosts([...ninePosts, ...ninePosts.slice(0, 3)]).pageCount, 2);
});
test('invalid page numbers fall back safely and excessive pages clamp to the last page', () => {
  for (const value of ['abc', '-1', '0', '1.5', 'Infinity', '9007199254740992']) assert.equal(paginatePosts(ninePosts, value).page, 1);
  assert.equal(paginatePosts(ninePosts, '99').page, 2);
});
test('filtering happens across all articles before pagination', () => {
  const filtered = ninePosts.filter(p => matchesPost(p, '記事', 'HTML / CSS'));
  const result = paginatePosts(filtered, 2);
  assert.deepEqual(result.items.map(p => p.id), [0, 2, 4, 6, 8]);
  assert.equal(result.page, 1);
});

test('pagination UI restores URL state, resets filters, and supports browser history', async () => {
  const { runInNewContext } = await import('node:vm');
  class Element {
    constructor(dataset = {}) { this.dataset = dataset; this.listeners = {}; this.attributes = {}; this.children = []; this.value = ''; }
    addEventListener(type, fn) { this.listeners[type] = fn; }
    setAttribute(name, value) { this.attributes[name] = value; }
    replaceChildren() { this.children = []; }
    append(child) { this.children.push(child); }
    focus() { this.focused = true; }
    scrollIntoView() { this.scrolled = true; }
    closest() { return this; }
  }
  const cards = ninePosts.map(p => new Element(p));
  const filters = ['', 'デザイン', 'HTML / CSS'].map(category => new Element({ filter: category }));
  const nodes = Object.fromEntries(['#blog-search', '#blog-pagination', '#articles-title', '#articles', '[data-blog-tools]', '#blog-count', '#blog-empty', '[data-reset]'].map(key => [key, new Element()]));
  const location = { href: 'https://example.test/blog.html?page=2', search: '?page=2' };
  const states = [];
  const setUrl = url => { const value = new URL(url); location.href = value.href; location.search = value.search; };
  const listeners = {};
  runInNewContext(code.replace(/^export /gm, ''), {
    document: {
      querySelector: selector => nodes[selector] || null,
      querySelectorAll: selector => selector === '[data-post]' ? cards : selector === '[data-filter]' ? filters : [],
      createElement: () => new Element(),
    },
    window: { addEventListener: (type, fn) => { listeners[type] = fn; } },
    location, URL, URLSearchParams,
    history: { replaceState: (_, __, url) => setUrl(url), pushState: (_, __, url) => { states.push(location.href); setUrl(url); } },
  });
  const visible = () => cards.filter(c => !c.hidden).map(c => c.dataset.id);
  const nav = nodes['#blog-pagination'];
  assert.deepEqual(visible(), [6, 7, 8]);
  assert.equal(nodes['#blog-count'].textContent, '9件中 7–9件');
  assert.equal(nav.children.find(c => c.textContent === '2').attributes['aria-current'], 'page');
  const clickPage = label => nav.listeners.click({ target: nav.children.find(c => c.textContent === label), button: 0, preventDefault() {} });
  clickPage('前へ');
  assert.equal(visible().length, 6);
  assert.equal(nodes['#articles-title'].focused, true);
  assert.equal(nodes['#articles'].scrolled, true);
  setUrl(states.pop()); listeners.popstate();
  assert.deepEqual(visible(), [6, 7, 8]);
  nodes['#blog-search'].value = '記事 8'; nodes['#blog-search'].listeners.input();
  assert.deepEqual(visible(), [8]);
  assert.equal(nav.hidden, true);
  assert.equal(new URL(location.href).searchParams.has('page'), false);
  nodes['#blog-search'].value = '見つからない語'; nodes['#blog-search'].listeners.input();
  assert.equal(visible().length, 0);
  assert.equal(nodes['#blog-empty'].hidden, false);
  nodes['[data-reset]'].listeners.click();
  clickPage('次へ');
  filters[1].listeners.click();
  assert.deepEqual(visible(), [1, 3, 5, 7]);
  assert.equal(new URL(location.href).searchParams.get('category'), 'デザイン');
  assert.equal(new URL(location.href).searchParams.has('page'), false);
});
