// Progressive enhancement: articles and navigation remain readable without JS.
export function normalize(value) {
  return String(value).normalize('NFKC').toLocaleLowerCase('ja').replace(/\s+/g, ' ').trim();
}
export function matchesPost(post, query, category) {
  return (!category || post.category === category) && normalize(query).split(' ').filter(Boolean).every(term => normalize(post.search).includes(term));
}
export function paginatePosts(posts, requestedPage = 1) {
  const total = posts.length;
  const pageCount = Math.max(1, Math.ceil(total / 6));
  const value = Number(requestedPage);
  const page = Number.isSafeInteger(value) && value > 0 ? Math.min(value, pageCount) : 1;
  const offset = (page - 1) * 6;
  return { items: posts.slice(offset, offset + 6), total, page, pageCount, start: total ? offset + 1 : 0, end: Math.min(offset + 6, total) };
}
export function paginationItems(page, pageCount) {
  if (pageCount <= 5) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const visible = new Set([1, pageCount]);
  const start = Math.max(2, Math.min(page - 1, pageCount - 2));
  const end = Math.min(pageCount - 1, Math.max(page + 1, 3));
  for (let i = start; i <= end; i++) visible.add(i);
  const items = [];
  for (const value of [...visible].sort((a, b) => a - b)) {
    if (items.length && value - items.at(-1) > 1) items.push('…');
    items.push(value);
  }
  return items;
}
if (typeof document !== 'undefined') {
  const search = document.querySelector('#blog-search');
  if (search) {
    const cards = [...document.querySelectorAll('[data-post]')];
    const filters = [...document.querySelectorAll('[data-filter]')];
    const known = filters.map(b => b.dataset.filter);
    let category = '';
    let indexPromise;
    function loadIndex() {
      if(!indexPromise) indexPromise=fetch('blog-search-index.json').then(r=>{if(!r.ok)throw new Error('Search index unavailable');return r.json();}).then(rows=>{const lookup=new Map(rows.map(row=>[row.slug,row.search]));cards.forEach(card=>card.dataset.search=lookup.get(card.dataset.slug)||card.textContent);}).catch(()=>{cards.forEach(card=>card.dataset.search ||= card.textContent || '');});
      return indexPromise;
    }
    cards.forEach(card=>card.dataset.search ||= card.textContent || '');
    let page = 1;
    const pagination = document.querySelector('#blog-pagination');
    const heading = document.querySelector('#articles-title');
    document.querySelector('[data-blog-tools]').hidden = false;
    function pageUrl(targetPage) {
      const url = new URL(location.href);
      if(search.value.trim()) url.searchParams.set('q', search.value.trim()); else url.searchParams.delete('q');
      if(category) url.searchParams.set('category', category); else url.searchParams.delete('category');
      if(targetPage > 1) url.searchParams.set('page', targetPage); else url.searchParams.delete('page');
      return url;
    }
    function update(writeUrl = true) {
      const result = paginatePosts(cards.filter(card => matchesPost(card.dataset, search.value, category)), page);
      page = result.page;
      const visible = new Set(result.items);
      cards.forEach(card => { card.hidden = !visible.has(card); });
      filters.forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.filter === category)));
      document.querySelector('#blog-count').textContent = result.total ? `${result.total}件中 ${result.start}–${result.end}件` : '0件の記事';
      document.querySelector('#blog-empty').hidden = result.total !== 0;
      pagination.replaceChildren();
      pagination.hidden = result.pageCount <= 1;
      if (!pagination.hidden) {
        const numbers = document.createElement('div');
        numbers.className = 'blog-pagination-numbers';
        function addLink(label, targetPage, current = false) {
          const unavailable = targetPage < 1 || targetPage > result.pageCount;
          const control = document.createElement(unavailable || current ? 'span' : 'a');
          control.textContent = label;
          control.className = /^\d+$/.test(label) ? 'blog-page-number' :
            `blog-page-direction ${targetPage < page ? 'blog-page-prev' : 'blog-page-next'}`;
          if (current) control.setAttribute('aria-current', 'page');
          else if (unavailable) control.setAttribute('aria-disabled', 'true');
          else {
            const url = pageUrl(targetPage);
            url.hash = 'articles';
            control.href = url.href;
            control.dataset.page = targetPage;
          }
          if (/^\d+$/.test(label)) control.setAttribute('aria-label', `${label}ページ目`);
          (/^\d+$/.test(label) ? numbers : pagination).append(control);
        }
        addLink('前へ', page - 1);
        for (const item of paginationItems(page, result.pageCount)) {
          if (typeof item === 'number') addLink(String(item), item, item === page);
          else {
            const gap = document.createElement('span');
            gap.className = 'blog-page-gap';
            gap.textContent = item;
            gap.setAttribute('aria-hidden', 'true');
            numbers.append(gap);
          }
        }
        pagination.append(numbers);
        addLink('次へ', page + 1);
      }
      if(writeUrl) history.replaceState(null, '', pageUrl(page));
    }
    function readUrl() {
      const params = new URLSearchParams(location.search);
      search.value = params.get('q') || '';
      category = known.includes(params.get('category')) ? params.get('category') : '';
      page = params.get('page') || 1;
      update(false);
    }
    pagination.addEventListener('click', event => {
      const link = event.target.closest('a[data-page]');
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      page = Number(link.dataset.page);
      history.pushState(null, '', link.href);
      update(false);
      heading.focus({ preventScroll: true });
      document.querySelector('#articles').scrollIntoView({ block: 'start' });
    });
    filters.forEach(b => b.addEventListener('click', () => { category=b.dataset.filter; page=1; update(); }));
    search.addEventListener('input', () => { const query=search.value; page=1; update(); if(query.trim() && typeof fetch === 'function')loadIndex().then(()=>{if(search.value===query)update(false);}); });
    document.querySelector('[data-reset]').addEventListener('click', () => { category=''; search.value=''; page=1; update(); search.focus(); });
    window.addEventListener('popstate', readUrl);
    readUrl();
    if(search.value.trim() && typeof fetch === 'function')loadIndex().then(()=>update(false));
  }
  const status = document.querySelector('#blog-copy-status');
  async function copy(text, button) {
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = 'コピーしました';
      if(status) status.textContent = 'クリップボードにコピーしました。';
    } catch {
      button.textContent = 'コピーできませんでした';
      if(status) status.textContent = 'コピーできませんでした。文字を選択してコピーしてください。';
    }
    setTimeout(()=>{button.textContent=original;},2400);
  }
  document.querySelectorAll('[data-copy-code]').forEach(button=>{
    button.hidden=false;
    button.addEventListener('click',()=>copy(button.parentElement.querySelector('code').textContent,button));
  });
  document.querySelectorAll('[data-copy-link]').forEach(button=>{
    button.hidden=false;
    button.addEventListener('click',()=>copy(document.querySelector('link[rel="canonical"]').href,button));
  });
}
