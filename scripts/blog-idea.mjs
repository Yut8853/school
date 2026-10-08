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
export function pickIdeas(topics, articles, random = () => randomInt(0x100000000) / 0x100000000) {
  const used = new Set(articles.map(a=>a.topicId).filter(Boolean));
  const counts = new Map();
  articles.filter(a=>!a.draft).forEach(a=>counts.set(a.category,(counts.get(a.category)||0)+1));
  const recent = articles.filter(a=>!a.draft).slice().sort((a,b)=>b.date.localeCompare(a.date)||a.slug.localeCompare(b.slug)).slice(0,2).map(a=>a.category);
  let available = topics.filter(t=>!used.has(t.id));
  const result = [];
  while(available.length && result.length<3) {
    const weights=available.map(t=>(recent.includes(t.category)?0.3:1)/(1+(counts.get(t.category)||0)));
    let value=random()*weights.reduce((a,b)=>a+b,0), index=weights.length-1;
    for(let i=0;i<weights.length;i++){value-=weights[i];if(value<0){index=i;break;}}
    const [topic]=available.splice(index,1);
    result.push({...topic,audience:topic.audiences[Math.floor(random()*topic.audiences.length)],format:topic.formats[Math.floor(random()*topic.formats.length)]});
    // Prefer variety in the candidate set; don't repeat a category while alternatives remain.
    const others=available.filter(t=>!result.some(r=>r.category===t.category));
    if(others.length) available=others;
  }
  return result;
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
