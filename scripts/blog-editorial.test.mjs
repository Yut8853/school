import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { pickIdeas, seededRandom } from './blog-idea.mjs';
const {topics}=JSON.parse(await readFile(new URL('../data/blog-topics.json',import.meta.url),'utf8'));
test('catalog contains 30 distinct themes across 5 categories',()=>{
  assert.equal(topics.length,30);assert.equal(new Set(topics.map(t=>t.id)).size,30);assert.equal(new Set(topics.map(t=>t.category)).size,5);
  for(const t of topics)assert.ok(t.question && t.exercise && t.audiences.length && t.formats.length);
});
test('seed reproduces selection; different seeds vary selection',()=>{
  assert.deepEqual(pickIdeas(topics,[],seededRandom('same')),pickIdeas(topics,[],seededRandom('same')));
  const unique=new Set(Array.from({length:50},(_,i)=>pickIdeas(topics,[],seededRandom(String(i)))[0].id));
  assert.ok(unique.size>15);
});
test('used and reserved draft topics are excluded',()=>{
  const articles=topics.slice(0,28).map((t,i)=>({topicId:t.id,category:t.category,date:'2026-10-08',slug:t.id,draft:i%2===0}));
  const ideas=pickIdeas(topics,articles,seededRandom('reserve'));
  assert.equal(ideas.length,2);for(const idea of ideas)assert.ok(!articles.some(a=>a.topicId===idea.id));
  assert.deepEqual(pickIdeas(topics,topics.map(t=>({topicId:t.id,draft:true}))),[]);
});
test('candidate categories differ when enough categories are available',()=>{
  const ideas=pickIdeas(topics,[],seededRandom('variety'));
  assert.equal(ideas.length,3);assert.equal(new Set(ideas.map(i=>i.category)).size,3);
});
test('less-covered categories are sampled more frequently',()=>{
  const articles=Array.from({length:18},(_,i)=>({category:'学習ガイド',date:'2026-10-08',slug:String(i)}));
  let crowded=0;
  for(let i=0;i<500;i++)if(pickIdeas(topics,articles,seededRandom(String(i)))[0].category==='学習ガイド')crowded++;
  assert.ok(crowded<25,`crowded category selected ${crowded} times`);
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
