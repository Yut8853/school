import { readFile, readdir } from 'node:fs/promises';
import { randomInt, createHash } from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';

export function seededRandom(seed) {
  let state = createHash('sha256').update(seed).digest().readUInt32LE(0);
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function pickIdeas(topics, articles, random = Math.random) {
  const used = new Set(articles.map(a => a.topicId).filter(Boolean));
  return topics.filter(t => !used.has(t.id))
    .sort((a,b) => (a.priority ?? 1000)-(b.priority ?? 1000) || a.id.localeCompare(b.id))
    .slice(0,3).map(t => ({...t,audience:t.audiences[0],format:t.formats[0]}));
}
async function main() {
  process.chdir(fileURLToPath(new URL('../',import.meta.url)));
  const {topics}=JSON.parse(await readFile('data/blog-topics.json','utf8'));
  const articles=[];
  for(const file of (await readdir('content/blog')).filter(f=>f.endsWith('.md')&&!f.startsWith('_'))) {
    const source=await readFile(`content/blog/${file}`,'utf8');
    articles.push({...JSON.parse(source.match(/^---\n([\s\S]*?)\n---/)[1]),slug:file.slice(0,-3)});
  }
  const seed=process.argv.find(a=>a.startsWith('--seed='))?.slice(7);
  const candidates=pickIdeas(topics,articles,seed===undefined?undefined:seededRandom(seed));
  if(!candidates.length) throw new Error('未使用テーマがありません。編集ルールに従い重複しない候補を追加してください。');
  console.log(JSON.stringify({instruction:'既存記事の本文と意味上の重複を確認し、最初の適切な候補を採用。docs/BLOG_EDITORIAL_RULES.mdに従って執筆からプッシュまで実行。',seed:seed??null,existingArticles:articles.map(a=>({slug:a.slug,title:a.title,category:a.category,topicId:a.topicId??null})),candidates},null,2));
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) await main();
