import { cp, rm, mkdir, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
// Only explicitly approved site artifacts go to Vercel. Never copy source,
// .git, editorial notes, booking scripts, private data or node_modules.
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
const rootFiles = new Set(['robots.txt', 'sitemap.xml', 'blog-feed.xml', 'ogp.png', 'logo.png', 'favicon.ico', 'site.webmanifest', 'manifest.webmanifest', 'apple-touch-icon.png']);
for (const f of await readdir('.')) {
  if (/^[a-zA-Z0-9][a-zA-Z0-9_-]*\.html$/.test(f) || rootFiles.has(f)) {
    if ((await stat(f)).isFile()) await cp(f, join('dist', f));
  }
}
// Assets are publicly served by design; prevent accidental private files in assets.
for (const directory of ['assets', 'reports']) {
  const excluded = name => /(^\.|\.(?:md|json|map|gs|mjs|ts|log|env|bak|orig|swp)$)/i.test(name);
  await cp(directory, join('dist',directory), { recursive: true, filter: async path => {
    const relative = path.slice(directory.length).replace(/^\//,'');
    if (!relative) return true;
    return !relative.split('/').some(excluded);
  }});
}
// Search index is intentionally public and contains only published article text.
await cp('blog-search-index.json', 'dist/blog-search-index.json');
console.log('Safe public dist created.');
