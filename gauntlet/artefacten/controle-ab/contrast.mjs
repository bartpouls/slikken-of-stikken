import { readFileSync, readdirSync } from 'node:fs';
const uit = {}; const alle = {};
for (const f of readdirSync('.').filter((x) => /^steekproef-.*\.json$/.test(x))) {
  const u = JSON.parse(readFileSync(f, 'utf8'));
  for (const m of u.metingen) for (const c of m.contrast) {
    if (c.op < 0.99) continue;
    const k = `${m.fase} | "${c.tekst}" | ${c.px}px | ${c.kleur} op ${c.bg} (${c.bgBron})${c.beeld ? ' [achtergrondbeeld]' : ''}`;
    alle[k] = c.ratio;
    if (c.ratio < (c.groot ? 3 : 4.5)) uit[k] = c.ratio;
  }
}
console.log('stabiele tekstmetingen (opacity ≥ 0,99):', Object.keys(alle).length, '| onder norm:', Object.keys(uit).length);
Object.entries(uit).sort((a, b) => a[1] - b[1]).forEach(([k, v]) => console.log(v, k));
console.log('\nlaagste 25 die wél voldoen:'); Object.entries(alle).filter(([k]) => !(k in uit)).sort((a, b) => a[1] - b[1]).slice(0, 25).forEach(([k, v]) => console.log(v, k));
