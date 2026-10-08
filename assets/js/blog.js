// Progressive enhancement: articles and navigation remain readable without JS.
export function normalize(value) {
  return String(value).normalize('NFKC').toLocaleLowerCase('ja').replace(/\s+/g, ' ').trim();
}
export function matchesPost(post, query, category) {
  return (!category || post.category === category) && normalize(query).split(' ').filter(Boolean).every(term => normalize(post.search).includes(term));
}
if (typeof document !== 'undefined') {
  const search = document.querySelector('#blog-search');
  if (search) {
    const cards = [...document.querySelectorAll('[data-post]')];
    const filters = [...document.querySelectorAll('[data-filter]')];
    const known = filters.map(b => b.dataset.filter);
    let category = '';
    document.querySelector('[data-blog-tools]').hidden = false;
    function update(writeUrl = true) {
      let total = 0;
      cards.forEach(card => {
        const match = matchesPost(card.dataset, search.value, category);
        card.hidden = !match;
        if(match) total++;
      });
      filters.forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.filter === category)));
      document.querySelector('#blog-count').textContent = `${total}件の記事`;
      document.querySelector('#blog-empty').hidden = total !== 0;
      if(writeUrl) {
        const url = new URL(location.href);
        if(search.value.trim()) url.searchParams.set('q', search.value.trim()); else url.searchParams.delete('q');
        if(category) url.searchParams.set('category', category); else url.searchParams.delete('category');
        history.replaceState(null, '', url);
      }
    }
    function readUrl() {
      const params = new URLSearchParams(location.search);
      search.value = params.get('q') || '';
      category = known.includes(params.get('category')) ? params.get('category') : '';
      update(false);
    }
    filters.forEach(b => b.addEventListener('click', () => { category=b.dataset.filter; update(); }));
    search.addEventListener('input', () => update());
    document.querySelector('[data-reset]').addEventListener('click', () => { category=''; search.value=''; update(); search.focus(); });
    window.addEventListener('popstate', readUrl);
    readUrl();
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
