import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { pickIdeas, seededRandom } from './blog-idea.mjs';
const {topics}=JSON.parse(await readFile(new URL('../data/blog-topics.json',import.meta.url),'utf8'));
test('catalog contains distinct themes across all seven categories',()=>{
  assert.ok(topics.length>=30);assert.equal(new Set(topics.map(t=>t.id)).size,topics.length);assert.deepEqual(new Set(topics.map(t=>t.category)),new Set(['学習ガイド','HTML / CSS','JavaScript','アクセシビリティ','デザイン','公開・運用','制作の進め方']));
  for(const t of topics)assert.ok(t.question && t.exercise && t.audiences.length && t.formats.length);
});
test('editorial priorities select the first three topics regardless of seed',()=>{
  const expected=['web-school-selection','web-production-roadmap','self-study-vs-school'];
  for(const seed of ['same','different']) {
    const ideas=pickIdeas([...topics].reverse(),[],seededRandom(seed));
    assert.deepEqual(ideas.map(t=>t.id),expected);
    for(const idea of ideas) {
      assert.equal(idea.audience,idea.audiences[0]);
      assert.equal(idea.format,idea.formats[0]);
    }
  }
});
test('used and reserved draft topics are excluded',()=>{
  const articles=topics.slice(0,-2).map((t,i)=>({topicId:t.id,category:t.category,date:'2026-10-08',slug:t.id,draft:i%2===0}));
  const ideas=pickIdeas(topics,articles,seededRandom('reserve'));
  assert.equal(ideas.length,2);for(const idea of ideas)assert.ok(!articles.some(a=>a.topicId===idea.id));
  assert.deepEqual(pickIdeas(topics,topics.map(t=>({topicId:t.id,draft:true}))),[]);
});
test('published and draft priority topics yield to the next editorial priorities',()=>{
  const articles=[{topicId:'web-school-selection'},{topicId:'web-production-roadmap',draft:true}];
  assert.deepEqual(pickIdeas(topics,articles).map(t=>t.id),[
    'self-study-vs-school','web-school-pricing','web-sidejob-start'
  ]);
});
test('category frequency does not override explicit editorial priority',()=>{
  const articles=Array.from({length:18},(_,i)=>({category:'学習ガイド',date:'2026-10-08',slug:String(i)}));
  assert.deepEqual(pickIdeas(topics,articles),pickIdeas(topics,[]));
});
test('priority ties use topic ids and missing priorities sort last without mutating input',()=>{
  const make=(id,priority)=>({id,priority,audiences:['beginner'],formats:['guide']});
  const input=[make('fallback'),make('beta',2),make('alpha',2),make('first',1)];
  assert.deepEqual(pickIdeas(input,[]).map(t=>t.id),['first','alpha','beta']);
  assert.deepEqual(pickIdeas(input,[{topicId:'first'}]).map(t=>t.id),['alpha','beta','fallback']);
  assert.deepEqual(input.map(t=>t.id),['fallback','beta','alpha','first']);
});

async function fixture() {
  const dir=await mkdtemp(join(tmpdir(),'school-editorial-'));
  for(const sub of ['scripts','content/blog/reviews','assets/img/blog'])await mkdir(join(dir,sub),{recursive:true});
  await copyFile(new URL('./lint-blog.mjs',import.meta.url),join(dir,'scripts/lint-blog.mjs'));
  const meta={editorialVersion:1,topicId:'fixture',audience:'完全未経験',format:'手順解説',primaryQuestion:'何を確認するか',outcome:'確認手順を作れる',title:'制作の手順を整理して、次に確認することを決める',description:'初めての制作で迷う場面を整理し、確認する順番とその理由を具体例から考えます。自分の制作物でも同じ手順を試し、修正箇所を記録するためのノートです。',date:'2026-10-08',sources:[]};
  const body=['## 一つ目','本文を確認して具体的な修正手順を整理します。'.repeat(22),'## 二つ目','制作した内容を比較して判断した理由を記録します。'.repeat(22),'## 三つ目','[関連記事](blog-first-website.html)','[レッスン](lesson.html)'].join('\n\n');
  const save=async(m=meta,b=body)=>writeFile(join(dir,'content/blog/fixture.md'),'---\n'+JSON.stringify(m)+'\n---\n'+b);
  await save();await writeFile(join(dir,'assets/img/blog/fixture.svg'),'<svg xmlns="http://www.w3.org/2000/svg"/>');
  await writeFile(join(dir,'content/blog/reviews/fixture.json'),JSON.stringify({slug:'fixture',reviewedOn:'2026-10-08',topicReason:'独立した問い',factCheck:'編集上の提案のみ',codeCheck:'コードなし',visualCheck:'未実施：単体テスト',limitations:[]}));
  return {dir,meta,body,save,run:()=>spawnSync(process.execPath,[join(dir,'scripts/lint-blog.mjs')],{encoding:'utf8'})};
}
test('editorial lint accepts complete article and rejects missing review',async()=>{
  const f=await fixture();try{
    let r=f.run();assert.equal(r.status,0,r.stderr);
    await rm(join(f.dir,'content/blog/reviews/fixture.json'));r=f.run();assert.notEqual(r.status,0);assert.match(r.stderr,/ENOENT/);
  }finally{await rm(f.dir,{recursive:true,force:true});}
});
test('editorial lint rejects missing source links, placeholders and short content',async()=>{
  const f=await fixture();try{
    await f.save({...f.meta,sources:[{url:'https://developer.mozilla.org/',checkedOn:'2026-10-08',claim:'仕様'}]},'## 一つ\nTODO\n## 二つ\n短文\n## 三つ');
    const r=f.run();assert.notEqual(r.status,0);assert.match(r.stderr,/仮置き/);assert.match(r.stderr,/本文は/);assert.match(r.stderr,/出典は本文にも/);
  }finally{await rm(f.dir,{recursive:true,force:true});}
});
