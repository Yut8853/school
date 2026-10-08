import { readFile, readdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
// These six originals predate the AI policy. Never add new slugs to this exception.
const legacy=new Set(['first-website','html-link-button','design-spacing','responsive-check','publish-checklist','portfolio-process']);
const formats=new Set(['手順解説','失敗の直し方','判断基準の比較','小さな制作課題','確認チェックリスト','制作過程の解説']);
const seen=new Set();
const errors=[];
let checked=0;
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
for(const filename of (await readdir('content/blog')).filter(f=>f.endsWith('.md')&&!f.startsWith('_'))) {
  const slug=filename.slice(0,-3), raw=await readFile(`content/blog/${filename}`,'utf8');
  const assert=(condition,message)=>{if(!condition)errors.push(`${slug}: ${message}`);};
  try {
    const [,json,body]=raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)||[];
    const meta=JSON.parse(json);
    if(meta.topicId){assert(!seen.has(meta.topicId),'topicIdが重複');seen.add(meta.topicId);}
    if(meta.draft) continue;
    assert(validDate(meta.date),'公開日が不正');
    if(legacy.has(slug)&&meta.editorialVersion!==1)continue;
    checked++;
    assert(meta.editorialVersion===1,'editorialVersion: 1が必要');
    for(const key of ['topicId','audience','primaryQuestion','outcome'])assert(typeof meta[key]==='string'&&meta[key].trim().length>0,`${key}が必要`);
    assert(formats.has(meta.format),'記事の型が不正');
    assert(meta.date<=today,'未来日の記事を公開しない');
    if(meta.updated)assert(validDate(meta.updated)&&meta.updated>=meta.date&&meta.updated<=today,'更新日が不正');
    assert(meta.title?.length>=15&&meta.title?.length<=65,'タイトルは15〜65文字');
    assert(meta.description?.length>=50&&meta.description?.length<=140,'descriptionは50〜140文字');
    const text=body.replace(/```[\s\S]*?```/g,'').replace(/https?:\/\/[^\s)]+/g,'').replace(/\s/g,'');
    assert(text.length>=900&&text.length<=3600,`本文は900〜3600文字（現在${text.length}）`);
    const headings=(body.match(/^## /gm)||[]).length;
    assert(headings>=3&&headings<=7,'h2は3〜7個');
    assert(!/^# /m.test(body),'本文にh1を置かない');
    assert(!/\[記載してください|TODO|TBD|○月○日|ここに本文/.test(body),'仮置きが残っている');
    assert(/\]\(blog-[a-z0-9-]+\.html(?:#[^)]+)?\)/.test(body),'関連ブログ記事へのリンクが必要');
    assert(/\]\((?:lesson(?:-[a-z0-9-]+)?|curriculum|case|capstone)\.html(?:#[^)]+)?\)/.test(body),'関連レッスン等へのリンクが必要');
    assert(Array.isArray(meta.sources),'sources配列が必要（編集上の提案のみなら空配列可）');
    for(const ref of meta.sources||[]) {
      assert(typeof ref.url==='string'&&ref.url.startsWith('https://'),'出典はHTTPS URL');
      assert(validDate(ref.checkedOn)&&ref.checkedOn<=today,'出典の確認日が必要');
      assert(typeof ref.claim==='string'&&ref.claim.trim().length>0,'出典が裏付ける内容が必要');
      assert(body.includes(`](${ref.url})`),'出典は本文にもリンクする');
    }
    await access(`assets/img/blog/${slug}.svg`);
    const review=JSON.parse(await readFile(`content/blog/reviews/${slug}.json`,'utf8'));
    assert(review.slug===slug,'レビューのslug不一致');
    assert(validDate(review.reviewedOn)&&review.reviewedOn<=today,'レビュー日が不正');
    for(const key of ['topicReason','factCheck','codeCheck','visualCheck'])assert(typeof review[key]==='string'&&review[key].trim().length>0,`レビューの${key}が必要`);
    assert(Array.isArray(review.limitations),'レビューのlimitations配列が必要');
  }catch(error){errors.push(`${slug}: ${error.message}`);}
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log(`PASS: editorial rules for ${checked} AI articles (6 initial articles may use legacy metadata).`);
