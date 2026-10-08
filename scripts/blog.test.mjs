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
