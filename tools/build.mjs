// Slikken of Stikken — build: `node tools/build.mjs` schrijft index.html (repo-root).
// Alle CSS en JS worden inline gezet: geen externe bestanden, fonts of CDN.
// Volgorde JS: model, score, sound, tutorial, einde, app (app gebruikt de rest).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lees = (p) => readFileSync(join(root, p), 'utf8');

const CSS = ['src/style.css', 'src/tutorial.css', 'src/einde.css'];
const JS = ['src/model.js', 'src/score.js', 'src/sound.js', 'src/tutorial.js', 'src/einde.js', 'src/app.js'];

// Voorkom dat inhoud de omringende tag afsluit.
const veiligJS = (s) => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const veiligCSS = (s) => s.replace(/<\/style/gi, '<\\/style');

const css = CSS.map((p) => `<style data-bron="${p}">\n${veiligCSS(lees(p))}\n</style>`).join('\n');
const js = JS.map((p) => `<script data-bron="${p}">\n${veiligJS(lees(p))}\n</script>`).join('\n');

let html = lees('src/index.template.html');
for (const [teken, inhoud] of [['<!-- @@CSS -->', css], ['<!-- @@JS -->', js]]) {
  if (!html.includes(teken)) throw new Error(`build: ${teken} ontbreekt in src/index.template.html`);
  html = html.replace(teken, () => inhoud);
}

// Controle: geen externe verwijzingen.
const extern = html.match(/\b(?:src|href)\s*=\s*["'](?!data:|#)[^"']+["']/gi);
if (extern) throw new Error('build: externe verwijzing gevonden: ' + extern.join(', '));
if (/@import|url\(\s*["']?https?:/i.test(html)) throw new Error('build: externe CSS-verwijzing gevonden');

writeFileSync(join(root, 'index.html'), html);
console.log(`index.html geschreven (${(html.length / 1024).toFixed(1)} kB)`);
