// Criticus C ronde 2 — is index.html precies de build van src/ ? (schrijft niets in de repo)
import { readFileSync } from 'node:fs';
const root = new URL('../../../../', import.meta.url).pathname;
const lees = (p) => readFileSync(root + p, 'utf8');
const CSS = ['src/style.css', 'src/einde.css'];
const JS = ['src/model.js', 'src/score.js', 'src/sound.js', 'src/tutorial.js', 'src/einde.js', 'src/app.js'];
const veiligJS = (s) => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const veiligCSS = (s) => s.replace(/<\/style/gi, '<\\/style');
const css = CSS.map((p) => `<style data-bron="${p}">\n${veiligCSS(lees(p))}\n</style>`).join('\n');
const js = JS.map((p) => `<script data-bron="${p}">\n${veiligJS(lees(p))}\n</script>`).join('\n');
let html = lees('src/index.template.html');
for (const [t, i] of [['<!-- @@CSS -->', css], ['<!-- @@JS -->', js]]) html = html.replace(t, () => i);
console.log('index.html identiek aan build van src/:', html === lees('index.html'), html.length);
