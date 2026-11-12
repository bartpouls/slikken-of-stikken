// Onafhankelijke narekening §4 / §5 (eigen RK4-integratie, niets uit src/model.js) + vergelijking met src/model.js
import { createRequire } from 'node:module';
const M = createRequire(import.meta.url)('../../../src/model.js');
const LN2 = Math.log(2);
let fouten = 0;
const chk = (naam, ok, extra='') => { if (!ok) fouten++; console.log((ok?'ok   ':'FOUT ') + naam + ' ' + extra); };

// eigen integrator: toestand C + lijst depots; RK4 met stap h
function mijnSim({Vd, Thalf, duur, doses, kFactor = () => 1, C0 = 0, A0 = [], h = 0.005, lo, hi = Infinity, tox = null}) {
  const k0 = LN2 / Thalf;
  let C = C0; let dep = A0.map(d => ({...d}));
  const n = Math.round(duur / h);
  const ds = doses.slice().sort((a,b)=>a.t-b.t); let j = 0;
  let inZ=0, boven=0, onder=0, toxT=0, piek=0, tPiek=0, ldMin=Infinity, ldMax=-Infinity; const Cs=[];
  for (let i=0;i<=n;i++){
    const t=i*h;
    while (j<ds.length && ds[j].t <= t+1e-9){ const d=ds[j++]; if(d.route==='iv') C+=d.D/Vd; else dep.push({A:d.F*d.D, ka:d.ka}); }
    Cs.push(C);
    if (C>piek){piek=C;tPiek=t;}
    if (t>=duur-24-1e-9){ ldMin=Math.min(ldMin,C); ldMax=Math.max(ldMax,C); }
    if (i<n){ if (C<lo) onder+=h; else if (C>hi) boven+=h; else inZ+=h; if(tox!=null&&C>tox) toxT+=h; }
    // RK4 over [t,t+h]; k stuksgewijs constant (wissel valt op rasterpunt)
    const k = k0*kFactor(t+h/2);
    const f = (Cx, As) => As.reduce((s,d,ix)=>s+d.ka*As[ix].A/Vd,0) - k*Cx;
    // depots exact-vrij: ook via RK4
    const dA = (As)=>As.map(d=>-d.ka*d.A);
    const add=(As,dAs,m)=>As.map((d,ix)=>({A:d.A+m*dAs[ix],ka:d.ka}));
    const k1c=f(C,dep), k1a=dA(dep);
    const d2=add(dep,k1a,h/2); const k2c=f(C+h/2*k1c,d2), k2a=dA(d2);
    const d3=add(dep,k2a,h/2); const k3c=f(C+h/2*k2c,d3), k3a=dA(d3);
    const d4=add(dep,k3a,h); const k4c=f(C+h*k3c,d4), k4a=dA(d4);
    C += h/6*(k1c+2*k2c+2*k3c+k4c);
    dep = dep.map((d,ix)=>({A:d.A+h/6*(k1a[ix]+2*k2a[ix]+2*k3a[ix]+k4a[ix]),ka:d.ka}));
  }
  return {Cs, h, inZ:inZ/duur, boven:boven/duur, onder:onder/duur, tox:toxT/duur, piek, tPiek, ldMin, ldMax};
}
const iv=(D,Vd,k,t)=>D/Vd*Math.exp(-k*t);
const or=(F,D,ka,Vd,k,t)=>F*D*ka/(Vd*(ka-k))*(Math.exp(-k*t)-Math.exp(-ka*t));

console.log('== A1: één dosis, model.js (maakSim, stap 0.1 én simuleer) tegen eigen analytische formule');
const P = {Vd:63, Th:2.5}; const kP=LN2/2.5;
const tijden=[0.1,0.25,0.5,1,1.38,2,2.5,3,4,5,6,8,10,12,16,20,24];
function modelC(casus, route, opt, t, stap){ const s=M.maakSim(casus,{blokkades:false, steadyState:false}); s.geef(route,opt); if(stap){ while(s.t<t-1e-9) s.stap(Math.min(stap,t-s.t)); } else s.naar(t); return s.C; }
for (const [naam, route, opt, fn] of [
  ['iv 1 g', 'spuit', {}, t=>iv(1000,63,kP,t)],
  ['slik 1 g F0.85 ka1.5', 'slik', {}, t=>or(0.85,1000,1.5,63,kP,t)],
  ['zetpil F0.6 ka0.6', 'zetpil', {F:0.6,ka:0.6}, t=>or(0.6,1000,0.6,63,kP,t)],
  ['zetpil F0.3 ka0.3', 'zetpil', {F:0.3,ka:0.3}, t=>or(0.3,1000,0.3,63,kP,t)],
  ['zetpil index 13 (0.35/0.3)', 'zetpil', {index:13}, t=>or(0.35,1000,0.3,63,kP,t)],
  ['zetpil index 3 (0.9/1.0)', 'zetpil', {index:3}, t=>or(0.9,1000,1.0,63,kP,t)],
]) {
  let mx=0;
  for (const t of tijden){ const a=fn(t); for (const st of [0, 0.1, 1/30, 0.0137]) { const m=modelC('paracetamol',route,opt,t,st); mx=Math.max(mx,Math.abs(m-a)/a); } }
  chk(naam+' ('+tijden.length+' tijdstippen, 4 stapgroottes)', mx<0.01, 'max rel. afw. '+mx.toExponential(2));
}
// lithium slik, zonder steady state
{ const kL=LN2/24; let mx=0; for (const t of [0.5,1,2,3.5,5,8,12,24,48,72,96]) { const a=or(1,10.8,1,56,kL,t); const m=modelC('lithium','slik',{},t,0.1); mx=Math.max(mx,Math.abs(m-a)/a);} chk('lithium slik 10,8 mmol (11 tijdstippen, t<120)', mx<0.01, mx.toExponential(2)); }
// ook simuleer-batch tegen analytisch
{ const u=M.simuleer('paracetamol',[{t:0,route:'slik'}],{blokkades:false}); let mx=0; for(let i=1;i<u.t.length;i+=37){const a=or(0.85,1000,1.5,63,kP,u.t[i]); mx=Math.max(mx,Math.abs(u.C[i]-a)/a);} chk('simuleer slik hele curve', mx<0.01, mx.toExponential(2));
  // piek en tijd boven 5
  let pk=0,tp=0,t1=null,t2=null; for(let t=0;t<=24;t+=0.0005){const c=or(0.85,1000,1.5,63,kP,t); if(c>pk){pk=c;tp=t;} if(c>=5&&t1==null)t1=t; if(c>=5)t2=t;}
  console.log('   eigen: piek', pk.toFixed(3),'na',tp.toFixed(3),'u; boven 5 van',t1.toFixed(3),'tot',t2.toFixed(3),' (casusblad 9,21 / 1,38 / 0,33 / 4,29)');
  chk('piek 9,21 na 1,38; ≥5 van 0,33 tot 4,29', Math.abs(pk-9.21)<0.005&&Math.abs(tp-1.38)<0.005&&Math.abs(t1-0.33)<0.005&&Math.abs(t2-4.29)<0.005);
  chk('model piek', Math.abs(u.samenvatting.piek-pk)/pk<0.001, u.samenvatting.piek.toFixed(4)+' @'+u.samenvatting.tPiek);
  chk('iv piek 1000/63=15,87→15,9', Math.abs(1000/63-15.9)<0.05 && Math.abs(modelC('paracetamol','spuit',{},0,0)-1000/63)<1e-9, (1000/63).toFixed(3));
  // lithium tmax
  const kL=LN2/24; const tmax=Math.log(1/kL)/(1-kL); console.log('   lithium tmax analytisch', tmax.toFixed(2),'u (casusblad ±3,5)'); chk('lithium tmax ±3,5', Math.abs(tmax-3.5)<0.2);
}

console.log('== A2: halvering in T½ zonder opname');
for (const [c,Th,D] of [['paracetamol',2.5,'spuit'],]) {
  const s=M.maakSim(c,{blokkades:false}); s.geef('spuit'); const C0=s.C; for(let i=0;i<25;i++) s.stap(0.1); chk('paracetamol iv: C(2,5)/C(0)', Math.abs(s.C/C0-0.5)<0.005, (s.C/C0).toFixed(6));
  for(let i=0;i<75;i++) s.stap(1/30); chk('paracetamol iv: C(5)/C(0)', Math.abs(s.C/C0-0.25)<0.0025, (s.C/C0).toFixed(6));
}
{ // lithium: steady-state start zonder depot? neem late fase: geen dosis, depot leeg na 40 u; C(64)/C(40) = 0.5
  const s=M.maakSim('lithium'); s.naar(40); const a=s.C, dep=s.depot; s.naar(64); chk('lithium zonder dosis: C(64)/C(40), depot '+dep.toExponential(1), Math.abs(s.C/a-0.5)<0.005,(s.C/a).toFixed(6));
  // na ibuprofen: T½ = 24/0.7 = 34,29 u
  s.naar(130); const b=s.C; s.naar(130+24/0.7); chk('lithium na ibuprofen: halvering in 24/0,7 u', Math.abs(s.C/b-0.5)<0.005,(s.C/b).toFixed(6));
  // over de grens heen: C(132)/C(108) = exp(-k*12 - 0.7k*12)
  const s2=M.maakSim('lithium'); s2.naar(108); const c1=s2.C; s2.naar(132); const verw=Math.exp(-LN2/24*12*(1+0.7)); chk('lithium over t=120: verhouding', Math.abs(s2.C/c1/verw-1)<0.01, (s2.C/c1).toFixed(6)+' vs '+verw.toFixed(6));
}

console.log('== A3: tabellen Verwachte uitkomsten — eigen RK4 (h=0,005) | model.js | casusblad');
const sl=t=>({t,route:'or',D:1000,F:0.85,ka:1.5}); const zp=(t,F,ka)=>({t,route:'or',D:1000,F,ka}); const sp=t=>({t,route:'iv',D:1000});
const mS=t=>({t,route:'slik'}), mZ=(t,F,ka)=>({t,route:'zetpil',F,ka}), mI=t=>({t,route:'spuit'});
const rijenP=[
 ['Niets', [], [], 0, 0, 0],
 ['echt 0/6/12/18', [0,6,12,18].map(sl), [0,6,12,18].map(mS), 78, 11.9, 4],
 ['12 u spuit', [sl(0),sl(6),sp(12),sl(18)], [mS(0),mS(6),mI(12),mS(18)], 78, 19.6, 4],
 ['12 u zetpil .6/.6', [sl(0),sl(6),zp(12,.6,.6),sl(18)], [mS(0),mS(6),mZ(12,.6,.6),mS(18)], 75, 11.8, 4],
 ['12 u zetpil .3/.3', [sl(0),sl(6),zp(12,.3,.3),sl(18)], [mS(0),mS(6),mZ(12,.3,.3),mS(18)], 57, 11.4, 4],
 ['12 u gemist', [sl(0),sl(6),sl(18)], [mS(0),mS(6),mS(18)], 54, 11.4, 3],
 ['elk uur 0..7', [0,1,2,3,4,5,6,7].map(sl), [0,1,2,3,4,5,6,7].map(mS), 65, 43.0, 8],
 ['1 g spuit 0 u', [sp(0)], [mI(0)], 17, 15.9, 1],
];
const binnen=(x,ref)=> ref===0 ? Math.abs(x)<1e-9 : Math.abs(x-ref)/ref<=0.02;
for (const [naam, mijn, mod, pz, pk, dos] of rijenP){
  const a=mijnSim({Vd:63,Thalf:2.5,duur:24,doses:mijn,lo:5});
  const b=M.simuleer('paracetamol',mod,{blokkades:false}).samenvatting;
  const ok = binnen(a.inZ*100,pz)&&binnen(b.fractieInZone*100,pz)&&binnen(a.piek,pk)&&binnen(b.piek,pk)&&b.totaleDosis/1000===dos && Math.abs(a.inZ-b.fractieInZone)<0.002 && Math.abs(a.piek-b.piek)<=0.001*Math.max(1,a.piek) && (b.lever===(dos>4));
  chk(naam.padEnd(20), ok, `zone eigen ${(a.inZ*100).toFixed(2)}% model ${(b.fractieInZone*100).toFixed(2)}% blad ${pz}% | piek eigen ${a.piek.toFixed(3)} model ${b.piek.toFixed(3)} blad ${pk} | dosis ${b.totaleDosis/1000} g (blad ${dos}) lever=${b.lever}`);
}
// Lithium: eigen steady state (dalspiegel vlak voor dosis) via lang inlopen met eigen integrator
function ssLi(){ // analytisch, superpositie van oneindig veel doses, dal op t=tau^-
  const k=LN2/24, ka=1, tau=8, FD=10.8, Vd=56;
  const C = FD*ka/(Vd*(ka-k))*(Math.exp(-k*tau)/(1-Math.exp(-k*tau)) - Math.exp(-ka*tau)/(1-Math.exp(-ka*tau)));
  const A = FD*Math.exp(-ka*tau)/(1-Math.exp(-ka*tau));
  return {C,A};
}
const ss=ssLi(); const mss=M.steadyState('lithium');
console.log('   lithium steady state: eigen dal', ss.C.toFixed(4),'depot',ss.A.toExponential(3),'| model', mss.C.toFixed(4), mss.depot.toExponential(3),'min-max', mss.min.toFixed(3), mss.max.toFixed(3),'(casusblad ±0,76–0,87)');
chk('steady state dal gelijk', Math.abs(ss.C-mss.C)<1e-6 && Math.abs(ss.A-mss.depot)<1e-9);
chk('steady state 0,76–0,87', Math.abs(mss.min-0.76)<0.005 && Math.abs(mss.max-0.87)<0.005, mss.min.toFixed(4)+'–'+mss.max.toFixed(4));
const poort=[...Array(30)].map((_,i)=>i*8);
const liD=(t,n=1)=>({t,route:'or',D:10.8*n,F:1,ka:1}); const liM=(t,n=1)=>({t,route:'slik',aantal:n});
const skip = poort.filter(t=>t>=120).filter((t,i)=>(i+1)%3===0);
const rijenL=[
 ['Alles slikken', poort.map(t=>liD(t)), poort.map(t=>liM(t)), 63,37,0,[1.07,1.20]],
 ['na ibu elke 3e over', poort.filter(t=>!skip.includes(t)).map(t=>liD(t)), poort.filter(t=>!skip.includes(t)).map(t=>liM(t)), 100,0,0,[0.69,0.89]],
 ['Niets', [], [], 3,0,0,[0,0]],
 ['Elk poortje dubbel', poort.map(t=>liD(t,2)), poort.map(t=>liM(t,2)), 2,98,76,[2.14,2.41]],
];
console.log('   overgeslagen poortjes (elke 3e na t=120):', skip.join(','));
for (const [naam, mijn, mod, z, b1, b15, ld] of rijenL){
  const a=mijnSim({Vd:56,Thalf:24,duur:240,doses:mijn,lo:0.6,hi:1.0,tox:1.5,C0:ss.C,A0:[{A:ss.A,ka:1}],kFactor:t=>t>=120?0.7:1});
  const b=M.simuleer('lithium',mod).samenvatting;
  const r=x=>Math.round(x*100);
  const pctOk=(x,ref)=>Math.abs(x*100-ref)<=Math.max(0.02*ref,0.5); // ±2% relatief, met afrondingsmarge van de tabel (hele %)
  const ldOk=(mn,mx)=> ld[1]===0 ? mx<0.005 : (Math.abs(mn-ld[0])/ld[0]<=0.02 && Math.abs(mx-ld[1])/ld[1]<=0.02);
  const ok=pctOk(a.inZ,z)&&pctOk(b.fractieInZone,z)&&pctOk(a.boven,b1)&&pctOk(b.fractieBoven,b1)&&pctOk(a.tox,b15)&&pctOk(b.fractieToxisch,b15)&&ldOk(a.ldMin,a.ldMax)&&ldOk(b.laatsteDag.min,b.laatsteDag.max)&&Math.abs(a.inZ-b.fractieInZone)<0.002;
  chk(naam.padEnd(20), ok, `zone eigen ${(a.inZ*100).toFixed(2)} model ${(b.fractieInZone*100).toFixed(2)} blad ${z} | >1,0 ${(a.boven*100).toFixed(2)}/${(b.fractieBoven*100).toFixed(2)}/${b1} | >1,5 ${(a.tox*100).toFixed(2)}/${(b.fractieToxisch*100).toFixed(2)}/${b15} | laatste dag eigen ${a.ldMin.toFixed(3)}–${a.ldMax.toFixed(3)} model ${b.laatsteDag.min.toFixed(3)}–${b.laatsteDag.max.toFixed(3)} blad ${ld.join('–')}`);
}
{ // niets: zakt onder 0,6 na ±8 u
  const k=LN2/24; // C(t) = dal + restdepot; los numeriek op
  const s=M.maakSim('lithium'); let t=0; while(s.C>=0.6){t+=0.01;s.naar(t);} console.log('   niets: onder 0,6 na', t.toFixed(2),'u (casusblad ±8 u)'); chk('niets: onder 0,6 na ±8 u', Math.abs(t-8)<1);
}
console.log('== zetpilreeks binnen bereik');
chk('24 stuks, F 0,3–0,9, ka 0,3–1,0', M.ZETPIL_REEKS.length===24 && M.ZETPIL_REEKS.every(z=>z.F>=0.3&&z.F<=0.9&&z.ka>=0.3&&z.ka<=1.0));
console.log(fouten===0?'\nALLES OK':'\nFOUTEN: '+fouten);
