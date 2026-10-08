import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PurgeCSS } from 'purgecss';
import CleanCSS from 'clean-css';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const manifest = JSON.parse(await readFile('scripts/css-pages.json', 'utf8'));
const pages = (await readdir('.')).filter(name => name.endsWith('.html')).sort();
if (JSON.stringify(pages) !== JSON.stringify(Object.keys(manifest).sort())) {
  throw new Error('Update scripts/css-pages.json for added or removed HTML pages.');
}
const check = process.argv.includes('--check');
if (!check) await mkdir('assets/css/generated', { recursive: true });
for (const [page, sources] of Object.entries(manifest)) {
  const css = (await Promise.all(sources.map(path => readFile(path, 'utf8')))).join('\n');
  const [result] = await new PurgeCSS().purge({
    content: [page, 'assets/js/*.js'],
    css: [{ raw: css }],
    // Preserve runtime states, browser pseudo-classes, variables and keyframes.
    safelist: ['on', 'done', 'busy', 'is-err', 'is-dragging'],
    keyframes: false,
    variables: false,
    fontFace: false,
  });
  const minified = new CleanCSS({ level: 1, rebase: false }).minify(result.css);
  if (minified.errors.length) throw new Error(`${page}: ${minified.errors.join('\n')}`);
  const output = `assets/css/generated/${page.replace('.html', '.min.css')}`;
  const styles = minified.styles + '\n';
  if (!(await readFile(page, 'utf8')).includes(`href="${output}"`)) {
    throw new Error(`${page} must link to ${output}`);
  }
  if (check) {
    if (await readFile(output, 'utf8') !== styles) throw new Error(`Run npm run build: ${output} is stale`);
  } else {
    await writeFile(output, styles);
  }
  console.log(`${page}: ${Buffer.byteLength(css)} → ${Buffer.byteLength(styles)} bytes`);
}
