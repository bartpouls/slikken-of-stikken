// Zet per moment de tutorial (links) en race 1 (rechts) naast elkaar in één afbeelding.
import { chromium, MATEN, HIER } from './lib.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const browser = await chromium.launch(); const page = await (await browser.newContext()).newPage();
for (const maat of MATEN) for (const m of ['m1a-voor', 'm1b-gekozen', 'm1c-na-poortje', 'm2a-voor', 'm2b-gekozen', 'm2c-na-poortje', 'm3a-voor', 'm3b-gekozen', 'm3c-na-poortje', 'm4a-voor', 'm4b-gekozen', 'm4c-na-poortje', 'm5a-voor', 'm5b-gekozen', 'm5c-na-poortje', 'm6-uur15']) {
  const b64 = (f) => 'data:image/png;base64,' + readFileSync(f).toString('base64');
  const uit = await page.evaluate(async ([a, b]) => {
    const laad = (u) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = u; });
    const [ia, ib] = [await laad(a), await laad(b)];
    const c = document.createElement('canvas'); c.width = ia.width * 2 + 20; c.height = ia.height; const x = c.getContext('2d');
    x.fillStyle = '#f0f'; x.fillRect(0, 0, c.width, c.height); x.drawImage(ia, 0, 0); x.drawImage(ib, ia.width + 20, 0);
    return c.toDataURL('image/png').split(',')[1];
  }, [b64(`${HIER}/${maat.naam}/c2-tut-${m}.png`), b64(`${HIER}/${maat.naam}/c2-race-${m}.png`)]);
  writeFileSync(`${HIER}/${maat.naam}/c2-paar-${m}.png`, Buffer.from(uit, 'base64'));
}
await browser.close();
