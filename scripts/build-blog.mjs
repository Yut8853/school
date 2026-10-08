import { readFile, writeFile, readdir, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const check = process.argv.includes('--check');
const base = 'https://school.junkbranding.com';
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plain = s => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const categories = ['学習ガイド', 'HTML / CSS', 'デザイン', '公開・運用', '制作の進め方'];
const source = await readFile('lesson.html', 'utf8');
const shared = JSON.parse(source.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'].filter(n => ['EducationalOrganization','WebSite'].includes(n['@type']));
const header = source.match(/<header class="hd">[\s\S]*?<\/header>/)[0];
const footer = source.match(/<footer class="ft2">[\s\S]*?<\/footer>/)[0];
const posts = [];
const covers = new Set(await readdir('assets/img/blog'));
for (const filename of (await readdir('content/blog')).filter(f => f.endsWith('.md') && !f.startsWith('_')).sort()) {
  const raw = await readFile(`content/blog/${filename}`, 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`Missing JSON frontmatter: ${filename}`);
  const meta = JSON.parse(match[1]);
  if (meta.draft === true) continue;
  const slug = filename.replace(/\.md$/, '');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`Invalid slug: ${slug}`);
  if (!meta.title || !meta.description || !categories.includes(meta.category) || !/^\d{4}-\d{2}-\d{2}$/.test(meta.date) || !Array.isArray(meta.tags)) throw new Error(`Invalid metadata: ${filename}`);
  let content = marked.parse(match[2]);
  if (/<h1\b/i.test(content)) throw new Error(`Use h2 or deeper in ${filename}`);
  const headings = [];
  content = content.replace(/<h2>([\s\S]*?)<\/h2>/g, (_, title) => {
    const id = `section-${headings.length + 1}`;
    headings.push({ id, title: plain(title) });
    return `<h2 id="${id}">${title}</h2>`;
  });
  // Code is escaped by marked. Copy controls are only shown when JavaScript runs.
  content = content.replace(/<pre>([\s\S]*?)<\/pre>/g, (_, code) => `<div class="blog-code"><button type="button" class="blog-copy" data-copy-code hidden>コードをコピー</button><pre tabindex="0" aria-label="コード例">${code}</pre></div>`);
  posts.push({ ...meta, cover: covers.has(slug + '.svg') ? slug : 'first-website', slug, href: `blog-${slug}.html`, content, headings, minutes: Math.max(1, Math.ceil(plain(content).length / 500)) });
}
posts.sort((a,b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
if (!posts.length) throw new Error('At least one published blog article is required.');
const featured = posts.find(p => p.featured) || posts[0];
const date = p => `<time datetime="${esc(p.date)}">${esc(p.date.replaceAll('-', '.'))}</time>`;
const meta = p => `<div class="blog-meta"><span class="blog-category">${esc(p.category)}</span>${date(p)}<span>約${p.minutes}分</span></div>`;
const arrow = '<span aria-hidden="true">↗</span>';
function card(p) {
  const search = plain(`${p.title} ${p.description} ${p.tags.join(' ')} ${p.category} ${p.content}`);
  return `<article class="blog-card" data-post data-category="${esc(p.category)}" data-search="${esc(search)}"><a class="blog-card-link" href="${p.href}"><div class="blog-card-image"><img src="assets/img/blog/${p.cover}.svg" width="960" height="600" alt="" loading="lazy"></div><div class="blog-card-body">${meta(p)}<h3>${esc(p.title)}</h3><p>${esc(p.description)}</p><div class="blog-card-bottom"><span>${p.tags.map(t=>'#'+esc(t)).join('　')}</span>${arrow}</div></div></a></article>`;
}
const profile = `<section class="blog-profile" aria-labelledby="blog-profile-title"><p class="blog-eyebrow">ABOUT THE SCHOOL</p><img src="assets/img/yutaka-kizaki.webp" width="72" height="72" loading="lazy" alt="講師 木崎 有貴"><h2 id="blog-profile-title">一つのサイトを、<br>自分の手で完成させる。</h2><p>0→1は、ホームページ制作の専門スクールです。企画からデザイン、実装、公開・運用までを学びます。</p><p class="blog-profile-name">講師：木崎 有貴<small>Yutaka Kizaki / JUNKBRANDING</small></p><a href="instructor.html">講師について ${arrow}</a></section>`;
const learning = `<section class="blog-learning" aria-labelledby="blog-learning-title"><p class="blog-eyebrow">TRY A LESSON</p><h2 id="blog-learning-title">読んだら、<br>少し作ってみよう。</h2><p>課題とレビューで学ぶ、<br>11本の無料レッスン。</p><a href="lesson.html">無料レッスンを見る ${arrow}</a></section>`;
const subnav = `<div class="blog-bar"><div class="w"><a class="blog-wordmark" href="blog.html"><span>0→1</span> JOURNAL<span class="blog-wordmark-jp">スクールブログ</span></a><a class="blog-rss" href="blog-feed.xml">RSS <span aria-hidden="true">↗</span></a></div></div>`;
const crumbs = p => `<nav class="blog-breadcrumb" aria-label="パンくずリスト"><ol><li><a href="index.html">TOP</a></li>${p ? `<li><a href="blog.html">ブログ</a></li><li aria-current="page">${esc(p.title)}</li>` : '<li aria-current="page">ブログ</li>'}</ol></nav>`;
function page(filename, title, description, body, post) {
  const url = `${base}/${filename}`;
  const breadcrumb = {'@type':'BreadcrumbList','@id':`${url}#breadcrumb`,itemListElement:[{name:'TOP',item:base+'/'},{name:'ブログ',item:base+'/blog.html'},...(post?[{name:post.title,item:url}]:[])].map((n,i)=>({'@type':'ListItem',position:i+1,...n}))};
  const webpage = {'@type':'WebPage','@id':url+'#webpage',url,name:title,description,inLanguage:'ja',isPartOf:{'@id':base+'/#website'},breadcrumb:{'@id':url+'#breadcrumb'}};
  const graph = [...shared,breadcrumb,webpage];
  if(post) graph.push({'@type':'BlogPosting','@id':url+'#article',headline:post.title,description,datePublished:post.date+'T09:00:00+09:00',dateModified:(post.updated || post.date)+'T09:00:00+09:00',mainEntityOfPage:{'@id':url+'#webpage'},author:{'@type':'Organization',name:'0→1 編集部',url:base+'/company.html'},publisher:{'@id':base+'/#org'},image:base+'/ogp.png',articleSection:post.category,inLanguage:'ja'});
  const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index, follow, max-image-preview:large"><meta name="author" content="JUNKBRANDING"><meta name="theme-color" content="#FBFAF8"><link rel="canonical" href="${url}"><meta property="og:type" content="${post?'article':'website'}"><meta property="og:site_name" content="0→1 HP制作専門スクール"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${base}/ogp.png"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="0→1 HP制作専門スクール｜スクールブログ"><meta property="og:locale" content="ja_JP"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${base}/ogp.png"><meta name="twitter:image:alt" content="0→1 HP制作専門スクール｜スクールブログ"><link rel="icon" href="logo.png" type="image/png"><link rel="alternate" type="application/rss+xml" title="0→1 スクールブログ" href="blog-feed.xml"><link rel="stylesheet" href="assets/css/generated/${filename.replace('.html','.min.css')}"><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':graph},null,2).replaceAll('<','\\u003c')}</script><script type="module" src="assets/js/blog.js"></script>`;
  return `<!doctype html>\n<!-- Generated by scripts/build-blog.mjs; edit content/blog instead. -->\n<html lang="ja">\n<head>\n${head}\n</head>\n<body><div class="r" id="top" style="--accent: #FF4A1C"><a class="skip" href="#main">本文へスキップ</a>${header.replace('<a href="blog.html">','<a href="blog.html" aria-current="'+(post?'true':'page')+'">')}${subnav}<main id="main">${body}</main>${footer}</div></body></html>\n`;
}
const categoryLinks = categories.map(c=>`<li><a href="blog.html?category=${encodeURIComponent(c)}#articles"><span>${esc(c)}</span><span>${posts.filter(p=>p.category===c).length}</span></a></li>`).join('');
const indexBody = `<div class="w">${crumbs()}<section class="blog-intro" aria-labelledby="blog-title"><div><p class="blog-eyebrow">LEARN. MAKE. PUBLISH.</p><h1 id="blog-title">つくる途中に、<br>役立つノート。</h1></div><p>ホームページ制作の「どうしよう」を、<br class="blog-desktop-break">一つずつ。学び方からデザイン、コード、<br class="blog-desktop-break">公開後のことまで。</p></section><section class="blog-feature" aria-labelledby="featured-title"><a class="blog-feature-art" href="${featured.href}" tabindex="-1" aria-hidden="true"><img src="assets/img/blog/${featured.cover}.svg" width="960" height="600" alt="" fetchpriority="high"></a><div class="blog-feature-copy"><p class="blog-eyebrow"><span class="blog-dot"></span> FIRST STEP / はじめに読みたい</p>${meta(featured)}<h2 id="featured-title"><a href="${featured.href}">${esc(featured.title)}</a></h2><p>${esc(featured.description)}</p><a class="blog-read" href="${featured.href}">記事を読む ${arrow}</a></div></section><div class="blog-layout"><section id="articles" class="blog-index" aria-labelledby="articles-title"><div class="blog-section-head"><div><p class="blog-eyebrow">LATEST NOTES</p><h2 id="articles-title">記事一覧</h2></div><span id="blog-count" role="status" aria-live="polite">${posts.length}件の記事</span></div><div class="blog-tools" data-blog-tools hidden><label class="blog-search"><span aria-hidden="true">⌕</span><span class="sr">記事を検索</span><input type="search" id="blog-search" placeholder="キーワードで記事を探す" autocomplete="off"></label><div class="blog-filters" role="group" aria-label="カテゴリで絞り込む"><button type="button" data-filter="" aria-pressed="true">すべて</button>${categories.map(c=>`<button type="button" data-filter="${esc(c)}" aria-pressed="false">${esc(c)}</button>`).join('')}</div></div><div class="blog-grid">${posts.map(card).join('')}</div><div class="blog-empty" id="blog-empty" hidden><h3>記事が見つかりませんでした</h3><p>別のキーワードやカテゴリで探してみてください。</p><button type="button" data-reset>検索条件をクリア</button></div></section><aside class="blog-sidebar" aria-label="ブログのご案内"><section class="blog-categories"><p class="blog-eyebrow">CATEGORIES</p><h2>テーマから探す</h2><ul>${categoryLinks}</ul></section>${profile}${learning}</aside></div></div><section class="blog-bottom"><div class="w"><span class="blog-eyebrow">FROM READING TO MAKING</span><h2>読む、その先の一歩へ。</h2><p>企画から公開まで。スクールで学ぶ32のカリキュラムをご紹介します。</p><a class="btn" href="curriculum.html">カリキュラムを見る ${arrow}</a></div></section>`;
const outputs = new Map([['blog.html',page('blog.html','ブログ｜0→1 HP制作専門スクール','ホームページ制作の学習ガイド、HTML/CSS、デザイン、公開・運用のノート。0→1のスクールブログです。',indexBody)]]);
for(const p of posts) {
  const related = posts.filter(q=>q!==p).sort((a,b)=>Number(b.category===p.category)-Number(a.category===p.category)).slice(0,3);
  const toc = `<ol>${p.headings.map(h=>`<li><a href="#${h.id}">${esc(h.title)}</a></li>`).join('')}</ol>`;
  const body = `<div class="w">${crumbs(p)}<header class="blog-article-head">${meta(p)}<h1>${esc(p.title)}</h1><p class="blog-article-lead">${esc(p.description)}</p><div class="blog-byline"><span class="blog-avatar" aria-hidden="true">0→1</span><span>0→1 編集部<small>JUNKBRANDING</small></span><button type="button" class="blog-share" data-copy-link hidden>リンクをコピー ${arrow}</button></div></header><div class="blog-article-layout"><article class="blog-article" aria-label="記事本文"><img class="blog-article-cover" src="assets/img/blog/${p.cover}.svg" width="960" height="600" alt=""><details class="blog-mobile-toc"><summary>この記事の目次</summary>${toc}</details><div class="blog-prose">${p.content}</div><div class="blog-tags">${p.tags.map(t=>`<a href="blog.html?q=${encodeURIComponent(t)}#articles">#${esc(t)}</a>`).join('')}</div><div class="blog-article-end"><b>記事についてのお問い合わせ</b><p>記載内容へのご質問や訂正のご連絡は、<a href="mailto:hello@junkbranding.com">hello@junkbranding.com</a>までお願いします。</p></div><a class="blog-back" href="blog.html#articles">← 記事一覧に戻る</a></article><aside class="blog-article-sidebar" aria-label="記事の目次と学習案内"><nav class="blog-toc" aria-label="目次"><p class="blog-eyebrow">CONTENTS</p><h2>この記事の目次</h2>${toc}</nav>${learning}</aside></div><section class="blog-related" aria-labelledby="related-title"><div class="blog-section-head"><div><p class="blog-eyebrow">KEEP READING</p><h2 id="related-title">あわせて読みたい</h2></div><a href="blog.html">記事一覧 ${arrow}</a></div><div class="blog-related-grid">${related.map(card).join('')}</div></section><p class="sr" id="blog-copy-status" role="status" aria-live="polite"></p></div>`;
  outputs.set(p.href,page(p.href,`${p.title}｜0→1 スクールブログ`,p.description,body,p));
}
const feed = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>0→1 スクールブログ</title><link>${base}/blog.html</link><description>ホームページ制作の学びと実践のノート</description><language>ja</language>${posts.map(p=>`<item><title>${esc(p.title)}</title><link>${base}/${p.href}</link><guid>${base}/${p.href}</guid><description>${esc(p.description)}</description><pubDate>${new Date(p.date+'T09:00:00+09:00').toUTCString()}</pubDate><category>${esc(p.category)}</category></item>`).join('')}</channel></rss>\n`;
outputs.set('blog-feed.xml',feed);
const manifestPath = 'scripts/css-pages.json';
const manifest = JSON.parse(await readFile(manifestPath,'utf8'));
for(const key of Object.keys(manifest)) if(key==='blog.html'||key.startsWith('blog-')) delete manifest[key];
for(const filename of outputs.keys()) if(filename.endsWith('.html')) manifest[filename]=['assets/css/fonts.css','assets/css/site.css','assets/css/responsive.css','assets/css/blog.css'];
outputs.set(manifestPath,JSON.stringify(manifest,null,2)+'\n');
let sitemap = (await readFile('sitemap.xml','utf8')).replace(/\s*<url><loc>https:\/\/school\.junkbranding\.com\/blog(?:-[a-z0-9-]+)?\.html<\/loc>[\s\S]*?<\/url>/g,'');
sitemap = sitemap.replace('</urlset>',`  <url><loc>${base}/blog.html</loc><lastmod>${posts[0].updated||posts[0].date}</lastmod></url>\n${posts.map(p=>`  <url><loc>${base}/${p.href}</loc><lastmod>${p.updated||p.date}</lastmod></url>`).join('\n')}\n</urlset>`);
outputs.set('sitemap.xml',sitemap);
for(const [filename,data] of outputs) {
  if(check) {
    if(await readFile(filename,'utf8')!==data) throw new Error(`Run npm run build: ${filename} is stale`);
  } else await writeFile(filename,data);
}
// Only remove pages owned by this generator when an article is deleted or made draft.
for(const filename of (await readdir('.')).filter(f=>/^blog-[a-z0-9-]+\.html$/.test(f))) {
  if(!outputs.has(filename)) {
    const stale = await readFile(filename, 'utf8');
    if(check || !stale.includes('Generated by scripts/build-blog.mjs')) throw new Error(`Remove stale generated article page: ${filename}`);
    await unlink(filename);
    const bundle = `assets/css/generated/${filename.replace('.html','.min.css')}`;
    await unlink(bundle).catch(error => { if(error.code !== 'ENOENT') throw error; });
  }
}
console.log(`Blog: ${posts.length} articles, index, RSS and sitemap ${check?'checked':'generated'}.`);
