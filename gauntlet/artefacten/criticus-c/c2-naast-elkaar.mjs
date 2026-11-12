// Criticus C2 — legt elke tutorial-schermafbeelding naast die van race 1 en telt afwijkende pixels per schermdeel.
// Uitvoer: <maat>/paar-<stap>.png = [tutorial | race 1 | verschil (rood)] op halve resolutie, en c2-pixels.txt.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, HIER, MATEN } from './lib.mjs';
const browser = await chromium.launch();
const page = await browser.newPage();
const paren = [];
for (const n of [1, 2, 3, 4, 5]) for (const m of ['a', 'b', 'c']) paren.push([`T${n}${m}`, `R${n}${m}`, `stap${n}${m}`]);
paren.push(['T6-eindkaartje', 'R6-eindkaartje', 'eindkaartje']);
let uit = '';
for (const maat of MATEN) {
  // schermdelen in CSS-px (gemeten in c2-metingen.json): kop 0-56, rij 56-90, canvas-aslabels 90-150, knoppen onderaan
  const H = maat.height, kn = maat.naam === '375x667' ? 571 : 740;
  const delen = [['racekop (klok, QALY)', 0, 56], ['rij (dagteller, levermeter, patiënt)', 56, 90], ['aslabels boven in canvas', 90, 150], ['uitlegzin-vlak', 150, 300], ['tijdlijn/curve/poortjes', 300, kn - 30], ['keuzeregel', kn - 30, kn + 6], ['knoppen', kn + 6, H]];
  for (const [a, b, naam] of paren) {
    const A = 'data:image/png;base64,' + readFileSync(join(HIER, maat.naam, a + '.png')).toString('base64');
    const B = 'data:image/png;base64,' + readFileSync(join(HIER, maat.naam, b + '.png')).toString('base64');
    const res = await page.evaluate(async ({ A, B, delen }) => {
      const laad = (s) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = s; });
      const [ia, ib] = await Promise.all([laad(A), laad(B)]);
      const w = ia.width, h = ia.height;
      const px = (im) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, w, h); };
      const da = px(ia), db = px(ib);
      const masker = new ImageData(w, h);
      const tel = delen.map(() => 0), opp = delen.map((d) => (d[2] - d[1]) * 2 * w);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const d = Math.max(Math.abs(da.data[i] - db.data[i]), Math.abs(da.data[i + 1] - db.data[i + 1]), Math.abs(da.data[i + 2] - db.data[i + 2]));
        const anders = d > 48;
        masker.data[i] = anders ? 255 : da.data[i] * 0.25; masker.data[i + 1] = anders ? 40 : da.data[i + 1] * 0.25; masker.data[i + 2] = anders ? 40 : da.data[i + 2] * 0.25; masker.data[i + 3] = 255;
        if (anders) { const cy = y / 2; delen.forEach((dl, k) => { if (cy >= dl[1] && cy < dl[2]) tel[k]++; }); }
      }
      const mc = document.createElement('canvas'); mc.width = w; mc.height = h; mc.getContext('2d').putImageData(masker, 0, 0);
      const c = document.createElement('canvas'); c.width = Math.round(w * 1.5) + 20; c.height = h / 2;
      const x = c.getContext('2d'); x.fillStyle = '#444'; x.fillRect(0, 0, c.width, c.height);
      x.drawImage(ia, 0, 0, w / 2, h / 2); x.drawImage(ib, w / 2 + 10, 0, w / 2, h / 2); x.drawImage(mc, w + 20, 0, w / 2, h / 2);
      return { png: c.toDataURL('image/png'), tel, opp };
    }, { A, B, delen });
    writeFileSync(join(HIER, maat.naam, `paar-${naam}.png`), Buffer.from(res.png.split(',')[1], 'base64'));
    uit += `${maat.naam} ${naam}: ` + delen.map((d, k) => `${d[0]} ${(100 * res.tel[k] / res.opp[k]).toFixed(2)}%`).join(' | ') + '\n';
  }
}
writeFileSync(join(HIER, 'c2-pixels.txt'), uit);
console.log(uit);
await browser.close();
