'use strict';

// Domino – geometrie a bodování (čisté funkce, bez DOM)
const L = 96, W = 32;
const TOL = { ang: 10, gap: 5, lat: 5, overlapGap: 1.5 };
const COS10 = Math.cos(TOL.ang * Math.PI / 180);

function geom(p) {
  const r = p.a * Math.PI / 180;
  const u = [Math.cos(r), Math.sin(r)];
  return { c: [p.x, p.y], u, n: [-u[1], u[0]] };
}
function corners(p) {
  const g = geom(p), out = [];
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]])
    out.push([g.c[0] + g.u[0] * sx * L / 2 + g.n[0] * sy * W / 2, g.c[1] + g.u[1] * sx * L / 2 + g.n[1] * sy * W / 2]);
  return out;
}
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];

// SAT: kladná hodnota = hloubka průniku v mm, záporná = mezera
function penetration(P, Q) {
  let pen = Infinity;
  for (const poly of [P, Q]) for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    let ax = [-(b[1] - a[1]), b[0] - a[0]]; const len = Math.hypot(ax[0], ax[1]); ax = [ax[0] / len, ax[1] / len];
    let p0 = Infinity, p1 = -Infinity, q0 = Infinity, q1 = -Infinity;
    for (const v of P) { const d = dot(v, ax); p0 = Math.min(p0, d); p1 = Math.max(p1, d); }
    for (const v of Q) { const d = dot(v, ax); q0 = Math.min(q0, d); q1 = Math.max(q1, d); }
    pen = Math.min(pen, Math.min(p1, q1) - Math.max(p0, q0));
  }
  return pen;
}

// Napojení dvou dílů: vrací nejlepší kandidát nebo null
function connect(A, B) {
  const ga = geom(A), gb = geom(B);
  let d = Math.abs(((A.a - B.a) % 180 + 180) % 180);
  const straight = Math.min(d, 180 - d) <= TOL.ang, perp = Math.abs(d - 90) <= TOL.ang;
  let best = null;
  const take = c => { if (!best || c.err < best.err) best = c; };
  if (straight) {
    for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
      const oa = mul(ga.u, sa), ob = mul(gb.u, sb);
      if (dot(oa, ob) > -COS10) continue;
      const pa = add(ga.c, mul(oa, L / 2)), pb = add(gb.c, mul(ob, L / 2)), v = sub(pb, pa);
      const gap = dot(v, oa), lat = Math.abs(oa[0] * v[1] - oa[1] * v[0]);
      if (gap < -TOL.overlapGap || gap > TOL.gap || lat > TOL.lat) continue;
      take({ ea: sa > 0 ? 1 : 0, eb: sb > 0 ? 1 : 0, perp: false, gap, lat, err: Math.abs(gap) + lat, pt: mul(add(pa, pb), .5) });
    }
  }
  if (perp) {
    for (const [X, Y, gx, gy, sw] of [[A, B, ga, gb, false], [B, A, gb, ga, true]]) {
      for (const sa of [-1, 1]) {
        const oa = mul(gx.u, sa), pa = add(gx.c, mul(oa, L / 2)), rel = sub(pa, gy.c);
        const along = dot(rel, gy.u), pp = dot(rel, gy.n), side = Math.sign(pp) || 1;
        if (dot(oa, mul(gy.n, side)) > -COS10) continue;
        const gap = Math.abs(pp) - W / 2;
        if (gap < -TOL.overlapGap || gap > TOL.gap) continue;
        for (const sb of [-1, 1]) {
          const lat = Math.abs(along - sb * (L / 2 - W / 2));
          if (lat > TOL.lat) continue;
          const ex = sa > 0 ? 1 : 0, ey = sb > 0 ? 1 : 0;
          take({ ea: sw ? ey : ex, eb: sw ? ex : ey, perp: true, gap, lat, err: Math.abs(gap) + lat, pt: pa });
        }
      }
    }
  }
  return best;
}

function bonus(n) { return n >= 16 ? 80 : n >= 12 ? 60 : n >= 8 ? 40 : n >= 4 ? 20 : 0; }

// Ohodnocení zvoleného souboru hran v jedné komponentě
function evaluate(nodes, E) {
  const adj = new Map(nodes.map(i => [i, []]));
  E.forEach((e, k) => { adj.get(e.i).push(k); adj.get(e.j).push(k); });
  const seen = new Set(); let total = 0; const groups = [];
  for (const s of nodes) {
    if (seen.has(s)) continue;
    const comp = [], ce = new Set(), st = [s]; seen.add(s);
    while (st.length) { const v = st.pop(); comp.push(v); for (const k of adj.get(v)) { ce.add(k); const e = E[k], w = e.i === v ? e.j : e.i; if (!seen.has(w)) { seen.add(w); st.push(w); } } }
    const n = comp.length, es = [...ce].map(k => E[k]);
    const perpOk = es.filter(e => e.ok && e.perp).length;
    if (es.length === n) { // cyklus
      if (n < 4) return null;
      const wrong = es.filter(e => !e.ok);
      if (!wrong.length) {
        const sc = n * n + perpOk + bonus(n);
        groups.push({ kind: 'loop', n, perp: perpOk, bonus: bonus(n), score: sc, nodes: comp, edges: es, txt: `${n}×${n} + ${perpOk} kolmé + ${bonus(n)} bonus` });
        total += sc;
      } else {
        const okE = es.filter(e => e.ok), parts = subPaths(comp, okE);
        const b = bonus(n) / 2;
        const ps = parts.reduce((a, k) => a + (k >= 2 ? k * k : 1), 0);
        const sc = ps + perpOk + b;
        groups.push({ kind: 'loopbad', n, perp: perpOk, bonus: b, score: sc, nodes: comp, edges: es, wrong: wrong.length, txt: `${[...parts.filter(k => k >= 2).sort((a, b) => b - a).map(k => k + '×' + k), ...(parts.some(k => k < 2) ? [parts.filter(k => k < 2).length + ' × 1'] : [])].join(' + ')}${perpOk ? ` + ${perpOk} kolmé` : ''} + ${b} poloviční bonus` });
        total += sc;
      }
    } else {
      if (es.some(e => !e.ok)) return null;
      if (n === 1) { total += 1; groups.push({ kind: 'single', n: 1, score: 1, nodes: comp, edges: [] }); }
      else { const sc = n * n + perpOk; total += sc; groups.push({ kind: 'chain', n, perp: perpOk, score: sc, nodes: comp, edges: es, txt: `${n}×${n}` + (perpOk ? ` + ${perpOk} kolmé` : '') }); }
    }
  }
  return { total, groups };
}
function subPaths(nodes, E) {
  const adj = new Map(nodes.map(i => [i, []]));
  E.forEach(e => { adj.get(e.i).push(e.j); adj.get(e.j).push(e.i); });
  const seen = new Set(), out = [];
  for (const s of nodes) { if (seen.has(s)) continue; let c = 0; const st = [s]; seen.add(s); while (st.length) { const v = st.pop(); c++; for (const w of adj.get(v)) if (!seen.has(w)) { seen.add(w); st.push(w); } } out.push(c); }
  return out;
}

// Hledání nejlepšího rozdělení (vyčerpávající prohledávání po komponentách)
function bestPartition(nodes, E) {
  if (!E.length) return evaluate(nodes, []);
  const cdeg = new Map(nodes.map(i => [i, 0]));
  E.forEach(e => { cdeg.set(e.i, cdeg.get(e.i) + 1); cdeg.set(e.j, cdeg.get(e.j) + 1); });
  if ([...cdeg.values()].every(d => d <= 2)) { // jednoduchá řada nebo kruh: stačí dvě varianty
    const opts = [evaluate(nodes, E), evaluate(nodes, E.filter(e => e.ok))].filter(Boolean);
    if (opts.length) return opts.reduce((a, b) => (b.total > a.total ? b : a));
  }
  const deg = new Map(nodes.map(i => [i, 0])), cur = [];
  let best = null, leaves = 0; const LIMIT = 400000;
  (function rec(k) {
    if (leaves > LIMIT) return;
    if (k === E.length) { leaves++; const r = evaluate(nodes, cur); if (r && (!best || r.total > best.total)) best = r; return; }
    const e = E[k];
    if (deg.get(e.i) < 2 && deg.get(e.j) < 2) {
      deg.set(e.i, deg.get(e.i) + 1); deg.set(e.j, deg.get(e.j) + 1); cur.push(e);
      rec(k + 1);
      cur.pop(); deg.set(e.i, deg.get(e.i) - 1); deg.set(e.j, deg.get(e.j) - 1);
    }
    rec(k + 1);
  })(0);
  return best || evaluate(nodes, []);
}

// Celkové skóre rozložení
function scoreLayout(pieces, Y) {
  const X0 = Y.x + Y.t, X1 = Y.x + Y.w - Y.t, Y0 = Y.y + Y.t, Y1 = Y.y + Y.h - Y.t;
  const inner = [[X0, Y0], [X1, Y0], [X1, Y1], [X0, Y1]];
  const st = pieces.map(() => ({ p1: false, ok: false, why: '' }));
  const placed = pieces.map((p, i) => i).filter(i => pieces[i].placed);
  const polys = {};
  for (const i of placed) {
    const P = corners(pieces[i]); polys[i] = P;
    st[i].p1 = penetration(P, inner) > 0.3;
    const inside = P.every(([x, y]) => x > X0 + 0.2 && x < X1 - 0.2 && y > Y0 + 0.2 && y < Y1 - 0.2);
    if (!st[i].p1) st[i].why = 'mimo';
    else if (pieces[i].flip) st[i].why = 'obrácený';
    else if (!inside) st[i].why = 'na čáře';
    else st[i].ok = true;
  }
  for (let a = 0; a < placed.length; a++) for (let b = a + 1; b < placed.length; b++) {
    const i = placed[a], j = placed[b];
    if (penetration(polys[i], polys[j]) > TOL.overlapGap + 0.5) for (const k of [i, j]) if (st[k].ok) { st[k].ok = false; st[k].why = 'překryv'; }
  }
  const elig = placed.filter(i => st[i].ok);
  const cand = [];
  for (let a = 0; a < elig.length; a++) for (let b = a + 1; b < elig.length; b++) {
    const i = elig[a], j = elig[b], c = connect(pieces[i], pieces[j]);
    if (c) cand.push({ i, j, ...c, ok: pieces[i].c[c.ea] === pieces[j].c[c.eb] });
  }
  // komponenty kandidátního grafu
  const par = new Map(elig.map(i => [i, i]));
  const f = x => par.get(x) === x ? x : (par.set(x, f(par.get(x))), par.get(x));
  cand.forEach(e => par.set(f(e.i), f(e.j)));
  const comps = new Map();
  elig.forEach(i => { const r = f(i); if (!comps.has(r)) comps.set(r, { nodes: [], E: [] }); comps.get(r).nodes.push(i); });
  cand.forEach(e => comps.get(f(e.i)).E.push(e));
  let total = 0; const groups = [];
  for (const c of comps.values()) { const r = bestPartition(c.nodes, c.E); total += r.total; groups.push(...r.groups); }
  const p1only = placed.filter(i => st[i].p1 && !st[i].ok);
  total += p1only.length;
  return { total, groups, st, cand, p1only };
}



// Varianty rozložení: chůze po řetězu dílů, kolmé spoje typu „L“ (díl čelem k boku konce předchozího)
function walk(steps) { // 'S' rovně, 'R' zatočit vpravo, 'L' vlevo; jeden krok na každý další díl
  let c = [0, 0], u = [1, 0]; const out = [{ x: 0, y: 0, a: 0 }];
  for (const s of steps) {
    if (s === 'S') c = [c[0] + u[0] * L, c[1] + u[1] * L];
    else {
      const n = s === 'R' ? [-u[1], u[0]] : [u[1], -u[0]];
      const end = [c[0] + u[0] * L / 2, c[1] + u[1] * L / 2];
      c = [end[0] - u[0] * W / 2 + n[0] * (W / 2 + L / 2), end[1] - u[1] * W / 2 + n[1] * (W / 2 + L / 2)]; u = n;
    }
    out.push({ x: c[0], y: c[1], a: ((Math.round(Math.atan2(u[1], u[0]) * 180 / Math.PI) % 360) + 360) % 360 });
  }
  return out;
}
function loopSteps(sides) { const st = []; sides.forEach((k, si) => { for (let i = 0; i < k; i++) if (si || i) st.push(i === 0 ? 'R' : 'S'); }); return st; }
const JC = ['R', 'B', 'Y', 'G'];
function chainColors(n, closed) {
  const J = Array.from({ length: n }, (_, k) => JC[k % 4]);
  return Array.from({ length: n }, (_, k) => [closed ? J[(k - 1 + n) % n] : JC[(k + 3) % 4], J[k]]);
}
function bbox(list) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of list) for (const [x, y] of corners(p)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0 };
}
function rot90(list) { return list.map(p => ({ ...p, x: -p.y, y: p.x, a: (p.a + 90) % 360 })); }
// skupina: uzavřený obrazec ze sekvence kroků (poslední krok obrazec uzavírá)
const G = {
  loop: steps => ({ poses: walk(steps.slice(0, -1)), col: chainColors(steps.length, true) }),
  rect: sides => { const st = loopSteps(sides); return { poses: walk(st), col: chainColors(st.length + 1, true) }; },
  chain: steps => ({ poses: walk(steps), col: chainColors(steps.length + 1, false) }),
};
// rozmístí skupiny ve žlutém (řádky zleva doprava), volné díly doplní do mezer
function pack(groups, Y, loose = 0) {
  const X0 = Y.x + Y.t + 24, X1 = Y.x + Y.w - Y.t - 24, Y0 = Y.y + Y.t + 24, Y1 = Y.y + Y.h - Y.t - 24;
  const out = []; let cx = X0, cy = Y0, rowH = 0;
  for (const g of groups) {
    let poses = g.poses, b = bbox(poses);
    if ((b.w > X1 - X0 && b.h <= X1 - X0) || (b.h > Y1 - Y0 && b.w <= Y1 - Y0)) { poses = rot90(poses); b = bbox(poses); }
    if (cx + b.w > X1 && cx > X0) { cx = X0; cy += rowH + 24; rowH = 0; }
    const ox = Math.round((cx - b.x0) / 4) * 4, oy = Math.round((cy - b.y0) / 4) * 4;
    poses.forEach((p, k) => out.push({ x: p.x + ox, y: p.y + oy, a: p.a, c: [...g.col[k]], flip: false }));
    cx += b.w + 24; rowH = Math.max(rowH, b.h);
  }
  // vycentrovat celek
  const B = bbox(out), dx = Math.round(((X0 + X1) / 2 - (B.x0 + B.x1) / 2) / 4) * 4, dy = Math.round(((Y0 + Y1) / 2 - (B.y0 + B.y1) / 2) / 4) * 4;
  out.forEach(p => { p.x += dx; p.y += dy; });
  for (let n = 0; n < loose; n++) {
    let done = false;
    for (let y = Y0 + 16; y <= Y1 - 16 && !done; y += 8) for (let x = X0 + 48; x <= X1 - 48 && !done; x += 8) {
      const q = { x, y, a: 0 }, Q = bbox([q]);
      if (out.every(p => { const P = bbox([p]); return Q.x1 + 12 < P.x0 || Q.x0 > P.x1 + 12 || Q.y1 + 12 < P.y0 || Q.y0 > P.y1 + 12; })) { out.push({ ...q, c: ['R', 'Y'], flip: false }); done = true; }
    }
  }
  return out;
}
// úpravy pro varianty s chybou
const MOD = {
  wrongJoint: (list, k) => { const p = list[k]; p.c[1] = JC[(JC.indexOf(p.c[1]) + 2) % 4]; },        // jeden spoj s chybnou barvou
  turned: (list, k) => { list[k].a = (list[k].a + 180) % 360; },                                      // díl otočený o 180° → obě barvy u něj chybně
  flipped: (list, k) => { list[k].flip = true; },                                                     // díl černou nahoru
  onLine: (list, Y) => {                                                                              // nejvyšší vodorovný díl posunutý na žlutou čáru
    const top = list.map((p, i) => [p, i]).filter(([p]) => p.a % 180 === 0).sort((a, b) => a[0].y - b[0].y)[0][0];
    top.y = Y.y + Y.t - 4 + W / 2 - W;  // horní hrana dílu 4 mm za vnitřním okrajem čáry
    top.y = Y.y + Y.t + W / 2 - 6;
  },
};
// celý obrazec (díly from..to) posunutý tak, aby se horní stranou dotkl žluté čáry (přesah 4 mm)
function touchLine(list, Y, from = 0, to = list.length) {
  const b = bbox(list.slice(from, to)), dy = (Y.y + Y.t - 4) - b.y0;
  for (let i = from; i < to; i++) list[i].y += dy;
  return list;
}
// celá skupina natočená o úhel (sklon); vzájemné úhly dílů se nemění
function tilt(g, deg) {
  const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  return { ...g, poses: g.poses.map(p => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c, a: ((p.a + deg) % 360 + 360) % 360 })) };
}
// Obrazec 16 ze skutečných dílů: díly 1–16 po řadě (po směru hodin), každá strana hřiště = jeden modul po 4.
// Tvar FOUR_SAME tvoří 4 moduly stejného tvaru (B, C, D jsou zrcadlové k A), 12 kolmých spojů, 416 × 320 mm.
const FOUR_SAME = 'LSLRRSRLRSRLRSRR';
const MODULE_SHAPE = 'stejný tvar jako ostatní moduly (otočený nebo zrcadlový)';
const MODULES = [
  { key: '1', ids: [0, 1, 2, 3], side: 'horní strana', shape: MODULE_SHAPE },
  { key: '2', ids: [4, 5, 6, 7], side: 'pravá strana', shape: MODULE_SHAPE },
  { key: '3', ids: [8, 9, 10, 11], side: 'dolní strana', shape: MODULE_SHAPE },
  { key: '4', ids: [12, 13, 14, 15], side: 'levá strana', shape: MODULE_SHAPE },
];
function ownLoop(Y, base, upto = 4, steps = FOUR_SAME) {
  const poses = pack([G.loop(steps.split(''))], Y);
  let need = base[0][0];
  const out = poses.map((q, k) => {
    const c = base[k], rev = c[0] !== need; need = rev ? c[0] : c[1];
    return { x: q.x, y: q.y, a: (q.a + (rev ? 180 : 0)) % 360, c: [...c], flip: false, rev };
  });
  return out.slice(0, upto * 4);
}
const VARIANTS = [
  { id: 'vase16', own: true, modules: true, name: 'Obrazec 16 ze 4 stejných modulů', note: 'Vaše skutečné barvy: díly 1–16 za sebou, každá strana hřiště je jeden modul a všechny 4 moduly mají stejný tvar. Všechny spoje barevně sedí.', build: (Y, base) => ownLoop(Y, base) },
  { id: 'vase16r', own: true, modules: true, name: 'Obdélník 16 z vašich dílů', note: 'Vaše skutečné barvy, 2 typy modulů: rovná řada a tvar L.', build: (Y, base) => ownLoop(Y, base, 4, 'SSSSSRSRSSSSSRSR') },
  { id: 'o16r14', name: 'Obrazec 16, 14 rohů', note: 'Nejvíc kolmých spojů, co se vejde do žlutého.', build: Y => pack([G.loop('SRSRRLLRRLRRLRRL'.split(''))], Y) },
  { id: 'o16r10', name: 'Obrazec 16, 10 rohů', note: 'Obdélník se zuby, jednodušší na stavbu.', build: Y => pack([G.loop('SSSSRSRSRLLRRLRR'.split(''))], Y) },
  { id: 'o16r4', name: 'Obrazec 16, 4 rohy', note: 'Prostý obdélník 6 × 2 díly.', build: Y => pack([G.loop('SSSSSRSRSSSSSRSR'.split(''))], Y) },
  { id: 'o16bad1', ref: 'o16r4', colorErr: true, name: 'Obrazec 16, 1 spoj špatná barva', note: 'Obrazec drží, bonus jen poloviční.', build: Y => { const l = pack([G.loop('SSSSSRSRSSSSSRSR'.split(''))], Y); MOD.wrongJoint(l, 2); return l; } },
  { id: 'o16turn', ref: 'o16r4', colorErr: true, name: 'Obrazec 16, 1 díl otočený o 180°', note: 'Oba spoje u dílu mají špatnou barvu.', build: Y => { const l = pack([G.loop('SSSSSRSRSSSSSRSR'.split(''))], Y); MOD.turned(l, 2); return l; } },
  { id: 'o14', name: 'Obrazec 14 + 2 volné díly', note: 'Dva díly navíc jen nahrnuté.', build: Y => pack([G.rect([5, 2, 5, 2])], Y, 2) },
  { id: 'had16', name: 'Had ze 16 dílů, neuzavřený', note: 'Chybí poslední spoj: žádný bonus za obrazec.', build: Y => pack([G.chain('SSSSSRRSSSSLLSSS'.split(''))], Y) },
  { id: 'o12c4', name: 'Obrazec 12 + čtverec', note: 'Dva samostatné obrazce.', build: Y => pack([G.rect([4, 2, 4, 2]), G.rect([1, 1, 1, 1])], Y) },
  { id: 'o16line', name: 'Obrazec 16, 1 díl na žluté čáře', note: 'Díl na čáře rozpojí obrazec, zbude řada 15.', build: Y => { const l = pack([G.loop('SSSSSRSRSSSSSRSR'.split(''))], Y); MOD.onLine(l, Y); return l; } },
  { id: 'o16flip', name: 'Obrazec 16, 1 díl černou nahoru', note: 'Stejný dopad jako díl na čáře.', build: Y => { const l = pack([G.loop('SSSSSRSRSSSSSRSR'.split(''))], Y); MOD.flipped(l, 2); return l; } },
  { id: '2x8', name: '2 obdélníky po 8 dílech', note: 'Dva menší obrazce místo jednoho velkého.', build: Y => pack([G.rect([3, 1, 3, 1]), G.rect([3, 1, 3, 1])], Y) },
  { id: 'o12l4', name: 'Obrazec 12 + 4 volné díly', note: '', build: Y => pack([G.rect([4, 2, 4, 2])], Y, 4) },
  { id: 'o8c2', name: 'Obdélník 8 + 2 čtverce', note: '', build: Y => pack([G.rect([3, 1, 3, 1]), G.rect([1, 1, 1, 1]), G.rect([1, 1, 1, 1])], Y) },
  { id: '2x8line', name: '2 obdélníky, 1 díl na čáře', note: 'Jeden obdélník rozpojený.', build: Y => { const l = pack([G.rect([3, 1, 3, 1]), G.rect([3, 1, 3, 1])], Y); MOD.onLine(l, Y); return l; } },
  { id: 'o16tl1', ref: 'o16r14', name: 'Obrazec 16 (14 rohů) vrcholem na čáře', note: 'Obrazec je uzavřený, ale 2 díly na vrcholu se dotýkají čáry: bonus za obrazec propadá.', touch: true, build: Y => touchLine(pack([G.loop('SRSRRLLRRLRRLRRL'.split(''))], Y), Y) },
  { id: 'o16tls', ref: 'o16r4', name: 'Obrazec 16 jednou stranou na čáře', note: 'Celá horní strana obdélníku leží na čáře.', touch: true, build: Y => touchLine(pack([G.loop('SSSSSRSRSSSSSRSR'.split(''))], Y), Y) },
  { id: 'o12c4t', ref: 'o12c4', name: 'Obrazec 12 + čtverec na čáře', note: 'Čtverec se dotýká čáry, velký obrazec platí.', touch: true, build: Y => touchLine(pack([G.rect([4, 2, 4, 2]), G.rect([1, 1, 1, 1])], Y), Y, 12, 16) },
  { id: '2x8t', ref: '2x8', name: '2 obdélníky, jeden stranou na čáře', note: 'Druhý obdélník platí celý.', touch: true, build: Y => touchLine(pack([G.rect([3, 1, 3, 1]), G.rect([3, 1, 3, 1])], Y), Y, 8, 16) },
  { id: 'o8c2t', ref: 'o8c2', name: 'Obdélník 8 + 2 čtverce, čtverec na čáře', note: '', touch: true, build: Y => touchLine(pack([G.rect([3, 1, 3, 1]), G.rect([1, 1, 1, 1]), G.rect([1, 1, 1, 1])], Y), Y, 12, 16) },
  { id: '4ct', ref: '4c', name: '4 čtverce, jeden na čáře', note: '', touch: true, build: Y => touchLine(pack([G.rect([1, 1, 1, 1]), G.rect([1, 1, 1, 1]), G.rect([1, 1, 1, 1]), G.rect([1, 1, 1, 1])], Y), Y, 12, 16) },
  { id: 'o16s10', ref: 'o16r4', tiltDeg: 10, name: 'Obrazec 16 se sklonem 10°', note: 'Celý obrazec natočený; vzájemné spoje platí.', build: Y => pack([tilt(G.loop('SSSSSRSRSSSSSRSR'.split('')), 10)], Y) },
  { id: 'o16s20', ref: 'o16r4', tiltDeg: 20, name: 'Obrazec 16 se sklonem 20°', note: 'Natočený obdélník se do žlutého už nevejde a leží na čáře.', build: Y => pack([tilt(G.loop('SSSSSRSRSSSSSRSR'.split('')), 20)], Y) },
  { id: 'o16r14s', ref: 'o16r14', tiltDeg: 8, name: 'Obrazec 16 (14 rohů) se sklonem 8°', note: '', build: Y => pack([tilt(G.loop('SRSRRLLRRLRRLRRL'.split('')), 8)], Y) },
  { id: 'o12c4s', ref: 'o12c4', tiltDeg: 15, name: 'Obrazec 12 + čtverec, sklon 15° a 45°', note: 'Malý čtverec se vejde i silně natočený.', build: Y => pack([tilt(G.rect([4, 2, 4, 2]), 15), tilt(G.rect([1, 1, 1, 1]), 45)], Y) },
  { id: '2x8s', ref: '2x8', tiltDeg: 12, name: '2 obdélníky se sklonem 12°', note: '', build: Y => pack([tilt(G.rect([3, 1, 3, 1]), 12), tilt(G.rect([3, 1, 3, 1]), -12)], Y) },
  { id: '4cs', ref: '4c', tiltDeg: 45, name: '4 čtverce natočené o 45°', note: '', build: Y => pack([1, 2, 3, 4].map(() => tilt(G.rect([1, 1, 1, 1]), 45)), Y) },
  { id: 'o16bad2o', ref: 'o16r4', colorErr: true, name: 'Obrazec 16, 2 špatné spoje naproti sobě', note: 'Obrazec se rozpadne na dvě řady po 8.', build: Y => { const l = pack([G.loop('SSSSSRSRSSSSSRSR'.split(''))], Y); MOD.wrongJoint(l, 1); MOD.wrongJoint(l, 9); return l; } },
  { id: 'o16bad2n', ref: 'o16r4', colorErr: true, name: 'Obrazec 16, 2 špatné spoje blízko sebe', note: 'Zbude dlouhá řada 13 a krátká 3.', build: Y => { const l = pack([G.loop('SSSSSRSRSSSSSRSR'.split(''))], Y); MOD.wrongJoint(l, 1); MOD.wrongJoint(l, 4); return l; } },
  { id: 'o16bad4', ref: 'o16r4', colorErr: true, name: 'Obrazec 16, 4 špatné spoje', note: 'Čtyři řady po 4 + poloviční bonus.', build: Y => { const l = pack([G.loop('SSSSSRSRSSSSSRSR'.split(''))], Y); [1, 5, 9, 13].forEach(k => MOD.wrongJoint(l, k)); return l; } },
  { id: 'o16badall', ref: 'o16r4', colorErr: true, name: 'Obrazec 16, žádná barva nesedí', note: 'Platí jen tvar: 16 × 1 + poloviční bonus.', build: Y => { const l = pack([G.loop('SSSSSRSRSSSSSRSR'.split(''))], Y); for (let k = 0; k < 16; k++) MOD.wrongJoint(l, k); return l; } },
  { id: '2x8bad', ref: '2x8', colorErr: true, name: '2 obdélníky, v jednom 1 špatný spoj', note: '', build: Y => { const l = pack([G.rect([3, 1, 3, 1]), G.rect([3, 1, 3, 1])], Y); MOD.wrongJoint(l, 9); return l; } },
  { id: '4cbad', ref: '4c', colorErr: true, name: '4 čtverce, každý s 1 špatným spojem', note: '', build: Y => { const l = pack([1, 2, 3, 4].map(() => G.rect([1, 1, 1, 1])), Y); [0, 4, 8, 12].forEach(k => MOD.wrongJoint(l, k)); return l; } },
  { id: '4c', name: '4 čtverce', note: 'Nejjednodušší cesta ke 160 bodům.', build: Y => pack([G.rect([1, 1, 1, 1]), G.rect([1, 1, 1, 1]), G.rect([1, 1, 1, 1]), G.rect([1, 1, 1, 1])], Y) },
];
// rozložení varianty na všech 16 dílů: použité díly dostanou polohu a barvy, ostatní zůstanou na startu
function variantLayout(v, Y, START, baseColors) {
  const used = v.build(Y, baseColors);
  return Array.from({ length: 16 }, (_, i) => i < used.length
    ? { id: i, ...used[i], placed: true }
    : { id: i, ...START[i], c: [...baseColors[i]], flip: false, placed: true });
}

// UI simulátoru
(function () {
  const HEX = { R: '#d23a2e', Y: '#f3c11c', B: '#2a5bc4', G: '#2f9a4f', K: '#1e1f22' };
  // Barvy podle obr. 1 zadání (levé hřiště). Pořadí: [horní/levá polovina, dolní/pravá polovina] v pohledu plánku.
  const DEF_COLORS = [
    ['Y','G'],['G','R'],['R','Y'],['Y','B'],   // 1–4 nahoře zleva (horní / dolní polovina)
    ['Y','B'],['R','Y'],['R','R'],['B','R'],   // 5–8 vpravo shora (levá / pravá polovina)
    ['B','B'],['G','B'],['G','G'],['B','G'],   // 9–12 dole zprava (horní / dolní polovina)
    ['B','R'],['R','G'],['G','Y'],['Y','Y'],   // 13–16 vlevo zdola (levá / pravá polovina)
  ];
  const M = 30, KEY = 'robosoutez-2026-data', DATA_VERSION = 1;
  // Hrací pole (polovina soutěžní plochy) podle plánku, mm od levého horního vnitřního rohu
  const FIELD = { w: 1680, h: 1249 };
  const RX0 = 280, RX1 = 1400, RY0 = 280, RY1 = 980;      // černý obdélník
  const ROWS = [320, 520, 720, 920], COLS = [420, 700, 980, 1260];
  // výchozí místa dílů: nahoře 1–4, vpravo 5–8, dole 9–12, vlevo 13–16 (po směru hodin)
  window.START = [
    ...COLS.map(x => ({ x, y: 132, a: 90 })),
    ...ROWS.map(y => ({ x: 1548, y, a: 0 })),
    ...COLS.slice().reverse().map(x => ({ x, y: 1128, a: 90 })),
    ...ROWS.slice().reverse().map(y => ({ x: 132, y, a: 0 })),
  ];
  const NS = 'http://www.w3.org/2000/svg';
  const $ = id => document.getElementById(id);
  const svg = $('board'), world = $('world'), gPieces = $('pieces'), gOv = $('overlay');
  let rot = false;

  let Y = { x: 420, y: 400, w: 840, h: 440, t: 20 };
  let pieces = DEF_COLORS.map((c, i) => ({ id: i, c: [...c], ...START[i], flip: false, placed: true }));
  let sel = -1, grid = true, view = null, result = null;

  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.dataVersion === DATA_VERSION && s.pieces && s.pieces.length === 16) { pieces = s.pieces; } } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ dataVersion: DATA_VERSION, pieces, Y, grid })); } catch (e) {} };

  const fitView = () => {
    const r = svg.getBoundingClientRect();
    rot = document.querySelector('.sim').classList.contains('full') && r.height > r.width * 1.1;
    world.setAttribute('transform', rot ? 'rotate(90)' : '');
    const v = rot ? { x: -(FIELD.h + M), y: -M, w: FIELD.h + 2 * M, h: FIELD.w + 2 * M } : { x: -M, y: -M, w: FIELD.w + 2 * M, h: FIELD.h + 2 * M };
    if (r.width > 0 && r.height > 0) { const ar = r.height / r.width; if (ar * v.w > v.h) { const nh = ar * v.w; v.y -= (nh - v.h) / 2; v.h = nh; } else { const nw = v.h / ar; v.x -= (nw - v.w) / 2; v.w = nw; } }
    return v;
  };
  view = fitView();
  function applyView() { svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`); }

  function el(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }

  function drawBoard() {
    const b = $('boardbg'); b.textContent = '';
    svg.style.aspectRatio = `${FIELD.w + 2 * M} / ${FIELD.h + 2 * M}`;
    const F = FIELD, LW = 20, BL = '#1e1f22';
    el('rect', { x: -5000, y: -5000, width: F.w + 10000, height: F.h + 10000, fill: '#e6e5df' }, b);
    el('rect', { x: -22, y: -22, width: F.w + 44, height: F.h + 44, fill: '#8d8f93' }, b);   // boční lišty
    el('rect', { x: 0, y: 0, width: F.w, height: F.h, fill: '#fbfbf8' }, b);
    const ln = (x1, y1, x2, y2) => el('line', { x1, y1, x2, y2, stroke: BL, 'stroke-width': LW, 'stroke-linecap': 'butt' }, b);
    el('rect', { x: RX0, y: RY0, width: RX1 - RX0, height: RY1 - RY0, fill: 'none', stroke: BL, 'stroke-width': LW }, b);
    ln((RX0 + RX1) / 2, RY0, (RX0 + RX1) / 2, RY1); ln(RX0, (RY0 + RY1) / 2, RX1, (RY0 + RY1) / 2);
    ROWS.forEach(y => { ln(180, y, RX0, y); ln(RX1, y, 1500, y); });
    COLS.forEach(x => { ln(x, 180, x, RY0); ln(x, RY1, x, 1080); });
    START.forEach(s0 => el('rect', { x: s0.x - (s0.a ? 16 : 48), y: s0.y - (s0.a ? 48 : 16), width: s0.a ? 32 : 96, height: s0.a ? 96 : 32, fill: 'none', stroke: '#b7b8b2', 'stroke-width': 2, 'stroke-dasharray': '6 5' }, b));
    el('rect', { x: Y.x + Y.t / 2, y: Y.y + Y.t / 2, width: Y.w - Y.t, height: Y.h - Y.t, fill: 'none', stroke: '#f4d21a', 'stroke-width': Y.t, opacity: .95 }, b);
  }

  function pieceNode(i) {
    const p = pieces[i];
    const g = el('g', { class: 'pc', 'data-i': i });
    el('rect', { x: -60, y: -28, width: 120, height: 56, fill: 'transparent' }, g);
    const c0 = p.flip ? HEX.K : HEX[p.c[0]], c1 = p.flip ? HEX.K : HEX[p.c[1]];
    el('rect', { x: -48, y: -16, width: 48, height: 32, fill: c0 }, g);
    el('rect', { x: 0, y: -16, width: 48, height: 32, fill: c1 }, g);
    el('rect', { x: -48, y: -16, width: 96, height: 32, fill: 'url(#studs)' }, g);
    el('line', { x1: 0, y1: -16, x2: 0, y2: 16, stroke: 'rgba(0,0,0,.35)', 'stroke-width': 1.2 }, g);
    el('rect', { class: 'st', x: -48, y: -16, width: 96, height: 32, fill: 'none', 'stroke-width': 3 }, g);
    const lab = el('g', { class: 'lab' }, g);
    el('circle', { r: 11, fill: 'rgba(255,255,255,.92)' }, lab);
    const tx = el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 14, 'font-weight': 700, fill: '#1e1f22', 'font-family': 'system-ui, sans-serif' }, lab);
    tx.textContent = i + 1;
    return g;
  }
  function placeNode(g, p) { g.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${p.a})`); g.querySelector('.lab').setAttribute('transform', `rotate(${-p.a})`); }

  function drawPieces() {
    gPieces.textContent = '';
    pieces.forEach((p, i) => { if (!p.placed) return; const g = pieceNode(i); placeNode(g, p); gPieces.appendChild(g); });
    if (sel >= 0 && pieces[sel].placed) { const g = gPieces.querySelector(`[data-i="${sel}"]`); if (g) gPieces.appendChild(g); }
  }

  let raf = 0;
  function rescore() { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; doScore(); }); }
  function doScore() {
    result = scoreLayout(pieces, Y);
    // stav dílů
    gPieces.querySelectorAll('.pc').forEach(g => {
      const i = +g.dataset.i, s = result.st[i], r = g.querySelector('.st');
      let col = 'none', dash = '';
      if (i === sel) { col = '#2a5bc4'; }
      else if (!s.p1) { col = '#8a8b85'; dash = '6 5'; }
      else if (!s.ok) { col = '#e07b00'; dash = '8 4'; }
      r.setAttribute('stroke', col); r.setAttribute('stroke-dasharray', dash);
      r.setAttribute('stroke-width', i === sel ? 5 : 3);
      g.style.opacity = s.p1 ? 1 : .85;
    });
    // spoje
    gOv.textContent = '';
    const used = new Set();
    result.groups.forEach(gr => gr.edges.forEach(e => used.add(e)));
    result.cand.forEach(e => {
      const u = used.has(e);
      if (!u) { el('circle', { cx: e.pt[0], cy: e.pt[1], r: 5, fill: '#fff', stroke: '#8a8b85', 'stroke-width': 2 }, gOv); return; }
      el('circle', { cx: e.pt[0], cy: e.pt[1], r: 8, fill: e.ok ? '#1f9d55' : '#d23a2e', stroke: '#fff', 'stroke-width': 2.5 }, gOv);
    });
    renderScore(); save();
  }

  const KIND = { loop: 'Uzavřený obrazec', loopbad: 'Obrazec s chybnou barvou', chain: 'Řada' };
  function renderScore() {
    $('total').textContent = result.total;
    const list = $('glist'); list.textContent = '';
    const big = result.groups.filter(g => g.kind !== 'single').sort((a, b) => b.score - a.score);
    const singles = result.groups.filter(g => g.kind === 'single').length;
    const add = (name, calc, pts, cls) => { const li = document.createElement('li'); if (cls) li.className = cls; li.innerHTML = '<span class="gn"></span><span class="gc"></span><b class="gp"></b>'; li.children[0].textContent = name; li.children[1].textContent = calc; li.children[2].textContent = pts; list.appendChild(li); };
    big.forEach(g => add(`${KIND[g.kind]} · ${g.n} ${g.n < 5 ? 'díly' : 'dílů'} (č. ${g.nodes.map(n => n + 1).sort((a, b) => a - b).join(', ')})`, g.txt, g.score, g.kind));
    if (singles) add(`Samostatné díly uvnitř`, `${singles} × 1`, singles);
    const p1 = result.p1only;
    if (p1.length) {
      const why = {}; p1.forEach(i => { const w = result.st[i].why; (why[w] = why[w] || []).push(i + 1); });
      add(`Jen základní bod (${Object.entries(why).map(([w, a]) => w + ': č. ' + a.join(', ')).join('; ')})`, `${p1.length} × 1`, p1.length, 'p1');
    }
    if (!list.children.length) add('Ve žlutém obdélníku zatím nic není', 'přetáhněte díly prstem do žlutého obdélníku', 0);
    $('placed').textContent = result.st.filter(x => x.p1).length;
    renderBreakdown(big, singles, p1);
  }
  // Rozpis bodů v rohu simulace: díl 1 b., řada n×n, obrazec n×n + rohy + bonus
  const cornerWord = k => k === 1 ? 'roh' : k >= 2 && k <= 4 ? 'rohy' : 'rohů';
  function calcText(g) {
    return g.txt.replace(/(\d+) kolmé/, (m, k) => `${k} ${cornerWord(+k)}`).replace(' poloviční bonus', ' (½ bonus)');
  }
  function renderBreakdown(big, singles, p1) {
    const ol = $('breakdown'); ol.textContent = '';
    const line = (label, calc, pts, cls) => { const li = document.createElement('li'); if (cls) li.className = cls; li.textContent = `${label}: ${calc} = ${pts} b.`; ol.appendChild(li); };
    big.forEach(g => line(g.kind === 'chain' ? `Řada ${g.n}` : g.kind === 'loop' ? `Obrazec ${g.n}` : `Obrazec ${g.n} (chybná barva)`, calcText(g), g.score, g.kind));
    if (singles) line(singles === 1 ? 'Díl' : 'Díly', `${singles} × 1`, singles);
    if (p1.length) line('Jen 1 b. (čára, obrácený, mimo spoj)', `${p1.length} × 1`, p1.length, 'p1');
    if (!ol.children.length) { const li = document.createElement('li'); li.textContent = 'Ve žlutém zatím nic není: 0 b.'; ol.appendChild(li); }
  }


  function dropIn(i) {
    const p = pieces[i]; p.placed = true; p.a = 0; p.flip = false;
    for (let r = 0; r < 40; r++) for (let k = 0; k < 24; k++) {
      const x = Math.round((Y.x + Y.w / 2 + Math.cos(k / 24 * 6.283) * r * 24) / 8) * 8, y = Math.round((Y.y + Y.h / 2 + Math.sin(k / 24 * 6.283) * r * 24) / 8) * 8;
      Object.assign(p, { x, y });
      const P = corners(p);
      if (P.every(([cx, cy]) => cx > Y.x + Y.t + 8 && cx < Y.x + Y.w - Y.t - 8 && cy > Y.y + Y.t + 8 && cy < Y.y + Y.h - Y.t - 8) && pieces.every((q, j) => j === i || !q.placed || Math.hypot(q.x - x, q.y - y) > 110)) return;
    }
  }

  // ovládání tažením
  let drag = null;
  function toLocal(ev) { const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; return pt.matrixTransform(world.getScreenCTM().inverse()); }
  function toView(ev) { const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); }
  if (window.ResizeObserver) new ResizeObserver(() => { if (!drag && document.querySelector('.sim').classList.contains('full')) { view = fitView(); applyView(); } }).observe(svg);
  // Dotykové ovládání: tažení dílu, posun pohledu, dvěma prsty zoom, dvojklepnutí na díl = otočit o 90°
  const ptrs = new Map(); let pinch = null, lastTap = null;
  const TAP_PX = 8, DBL_MS = 380;
  function startPinch() {
    const [a, b] = [...ptrs.values()], r = svg.getBoundingClientRect();
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, v0: { ...view }, mx, my, r };
  }
  svg.addEventListener('pointerdown', ev => {
    const hn = $('hint'); if (hn) hn.hidden = true;
    ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    try { svg.setPointerCapture(ev.pointerId); } catch (e) {}
    if (ptrs.size === 2) {
      if (drag && drag.kind === 'piece' && !drag.moved) { /* nic se nehnulo */ }
      drag = null; lastTap = null; startPinch(); return;
    }
    if (ptrs.size > 2) return;
    const g = ev.target.closest('.pc'), q = toLocal(ev);
    if (g) {
      const i = +g.dataset.i;
      if (sel !== i) { sel = i; gPieces.appendChild(g); doScore(); }
      drag = { kind: 'piece', i, g, dx: pieces[i].x - q.x, dy: pieces[i].y - q.y, sx: ev.clientX, sy: ev.clientY, moved: false };
    } else drag = { kind: 'pan', sx: ev.clientX, sy: ev.clientY, v: { ...view }, moved: false };
  });
  svg.addEventListener('pointermove', ev => {
    if (!ptrs.has(ev.pointerId)) return;
    ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pinch && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const { v0, mx, my, r } = pinch;
      const nw = Math.min(Math.max(v0.w * pinch.d0 / d, 220), (FIELD.w + 2 * M) * 1.6), k = nw / v0.w;
      const fx = (mx - r.left) / r.width, fy = (my - r.top) / r.height;          // bod pod prsty na začátku
      const cx = v0.x + fx * v0.w, cy = v0.y + fy * v0.h;
      const nmx = (a.x + b.x) / 2, nmy = (a.y + b.y) / 2, ppm = nw / r.width;
      view = { x: cx - fx * nw - (nmx - mx) * ppm, y: cy - fy * v0.h * k - (nmy - my) * ppm, w: nw, h: v0.h * k };
      applyView(); return;
    }
    if (!drag) return;
    if (!drag.moved && Math.hypot(ev.clientX - drag.sx, ev.clientY - drag.sy) > TAP_PX) drag.moved = true;
    if (!drag.moved) return;
    if (drag.kind === 'piece') {
      const q = toLocal(ev), p = pieces[drag.i], s = grid ? 4 : 1;
      p.x = Math.round((q.x + drag.dx) / s) * s; p.y = Math.round((q.y + drag.dy) / s) * s;
      placeNode(drag.g, p); rescore();
    } else {
      const r = svg.getBoundingClientRect(), k = view.w / r.width;
      view.x = drag.v.x - (ev.clientX - drag.sx) * k; view.y = drag.v.y - (ev.clientY - drag.sy) * k; applyView();
    }
  });
  // Přichycení: puštěný díl se srovná do přesného spoje se sousedním dílem (rovně nebo do „L“), když je do 25 mm a 30°
  const SNAP_MM = 25, SNAP_DEG = 30;
  function angDiff(a, b) { const d = Math.abs(((a - b) % 360 + 360) % 360); return Math.min(d, 360 - d); }
  function snapPiece(i) {
    const P = pieces[i]; let best = null;
    pieces.forEach((N, j) => {
      if (j === i || !N.placed) return;
      const g = geom(N), u = g.u, n = g.n, a = N.a, cands = [];
      for (const s of [-1, 1]) cands.push({ x: N.x + s * u[0] * L, y: N.y + s * u[1] * L, axis: a });            // rovně za koncem
      for (const sb of [-1, 1]) for (const side of [-1, 1]) {
        const ax = N.x + sb * u[0] * (L / 2 - W / 2), ay = N.y + sb * u[1] * (L / 2 - W / 2);
        cands.push({ x: ax + side * n[0] * (W / 2 + L / 2), y: ay + side * n[1] * (W / 2 + L / 2), axis: a + 90 });  // čelem k boku N
        cands.push({ x: N.x + sb * u[0] * (L / 2 + W / 2) - side * n[0] * (L / 2 - W / 2), y: N.y + sb * u[1] * (L / 2 + W / 2) - side * n[1] * (L / 2 - W / 2), axis: a + 90 }); // bokem k čelu N
      }
      for (const c of cands) {
        const ang = angDiff(P.a, c.axis) <= angDiff(P.a, c.axis + 180) ? c.axis : c.axis + 180;
        const dA = angDiff(P.a, ang), d = Math.hypot(P.x - c.x, P.y - c.y);
        if (d > SNAP_MM || dA > SNAP_DEG) continue;
        const q = { x: c.x, y: c.y, a: ((Math.round(ang) % 360) + 360) % 360 }, Q = corners(q);
        if (pieces.some((M, k) => k !== i && M.placed && penetration(Q, corners(M)) > 1)) continue;
        const cost = d + dA;
        if (!best || cost < best.cost) best = { ...q, cost };
      }
    });
    if (best) { P.x = Math.round(best.x * 10) / 10; P.y = Math.round(best.y * 10) / 10; P.a = best.a; }
  }
  function rotateSel(deg) {
    const p = pieces[sel]; p.a = ((p.a + deg) % 360 + 360) % 360;
    const g = gPieces.querySelector(`[data-i="${sel}"]`); if (g) placeNode(g, p); doScore();
  }
  const end = ev => {
    ptrs.delete(ev.pointerId);
    if (pinch) { if (ptrs.size < 2) { pinch = null; drag = null; } return; }
    if (drag && drag.kind === 'piece' && !drag.moved && ev.type === 'pointerup') {
      const now = Date.now();
      if (lastTap && lastTap.i === drag.i && now - lastTap.t < DBL_MS) { rotateSel(90); lastTap = null; }
      else lastTap = { i: drag.i, t: now };
    } else if (drag && drag.kind === 'piece') { lastTap = null; snapPiece(drag.i); placeNode(drag.g, pieces[drag.i]); doScore(); }
    if (drag && drag.kind === 'pan' && !drag.moved && sel >= 0) { sel = -1; lastTap = null; doScore(); }
    drag = null;
  };
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  svg.addEventListener('dblclick', ev => ev.preventDefault());
  svg.addEventListener('wheel', ev => { ev.preventDefault(); zoom(ev.deltaY < 0 ? 1 / 1.2 : 1.2, toView(ev)); }, { passive: false });

  function zoom(f, c) {
    c = c || { x: view.x + view.w / 2, y: view.y + view.h / 2 };
    const nw = Math.min(Math.max(view.w * f, 220), (FIELD.w + 2 * M) * 1.6); const k = nw / view.w;
    view = { x: c.x - (c.x - view.x) * k, y: c.y - (c.y - view.y) * k, w: nw, h: view.h * k }; applyView();
  }


  // šablony a nastavení
  // Varianty nad 160 bodů s náhledem
  // Moduly (díly 1–4, 5–8, 9–12, 13–16) zvýrazněné obrysem a písmenem
  const MOD_COL = ['#111827', '#7c3aed', '#db2777', '#0284c7'];
  // Označení dílů v náhledu: číslo modulu + písmeno dílu (1a, 1b, …) v malém kroužku uprostřed dílu
  const pieceTag = (x, y, m, k) => `<circle cx="${x}" cy="${y}" r="13" fill="${MOD_COL[m]}"/><text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="700" fill="#fff">${m + 1}${'abcd'[k]}</text>`;
  function moduleMarks(list, count = 4) {
    let h = '';
    for (let m = 0; m < count; m++) {
      const grp = list.slice(m * 4, m * 4 + 4); if (grp.length < 4) break;
      grp.forEach((p, k) => { h += pieceTag(p.x, p.y, m, k); });
    }
    return h;
  }
  function thumb(list, mods = false) {
    const m = 16, vb = `${Y.x - m} ${Y.y - m} ${Y.w + 2 * m} ${Y.h + 2 * m}`;
    let h = `<svg viewBox="${vb}" aria-hidden="true"><rect x="${Y.x - m}" y="${Y.y - m}" width="${Y.w + 2 * m}" height="${Y.h + 2 * m}" fill="#fbfbf8"/>`;
    h += `<rect x="${Y.x + Y.t / 2}" y="${Y.y + Y.t / 2}" width="${Y.w - Y.t}" height="${Y.h - Y.t}" fill="none" stroke="#f4d21a" stroke-width="${Y.t}"/>`;
    for (const p of list) {
      const c0 = p.flip ? HEX.K : HEX[p.c[0]], c1 = p.flip ? HEX.K : HEX[p.c[1]];
      h += `<g transform="translate(${p.x} ${p.y}) rotate(${p.a})"><rect x="-48" y="-16" width="48" height="32" fill="${c0}"/><rect x="0" y="-16" width="48" height="32" fill="${c1}"/><rect x="-48" y="-16" width="96" height="32" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="2"/></g>`;
    }
    if (mods) h += moduleMarks(list, mods === true ? 4 : mods);
    return h + '</svg>';
  }
  function renderVariants() {
    const box = $('variants'); box.textContent = '';
    const rows = VARIANTS.map(v => { const lay = variantLayout(v, Y, START, DEF_COLORS); return { v, lay, r: scoreLayout(lay, Y) }; })
      .filter(x => x.r.total >= 270).sort((a, b) => (b.v.id === 'vase16') - (a.v.id === 'vase16') || (b.v.own ? 1 : 0) - (a.v.own ? 1 : 0) || b.r.total - a.r.total);
    const byId = Object.fromEntries(rows.map(x => [x.v.id, x.r.total]));
    for (const { v, lay, r } of rows) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'var';
      const parts = r.groups.filter(g => g.kind !== 'single').sort((a, b) => b.score - a.score).map(g => g.txt);
      const singles = r.groups.filter(g => g.kind === 'single').length + r.p1only.length;
      if (singles) parts.push(`${singles} × 1`);
      b.innerHTML = `<span class="vt">${thumb(lay, v.modules)}</span><span class="vb"><span class="vn"></span><b class="vp">${r.total}<small> b.</small></b><span class="vc"></span><span class="vx"></span></span>`;
      if (v.own) { const t = document.createElement('span'); t.className = 'vtag own'; t.textContent = 'vaše skutečné barvy'; b.querySelector('.vb').appendChild(t); }
      if (v.id === 'vase16') b.querySelector('.vb').appendChild(moduleCard(lay));
      if (v.ref) {
        const t = document.createElement('span'), d = byId[v.ref] != null ? byId[v.ref] - r.total : null;
        const lab = v.touch ? 'dotek čáry' : v.tiltDeg ? `sklon ${v.tiltDeg}°` : 'chybná barva';
        t.className = 'vtag ' + (v.touch ? 'touch' : v.tiltDeg ? 'tilt' : 'color');
        t.textContent = d == null ? lab : d > 0 ? `${lab}: o ${d} b. méně` : `${lab}: bez ztráty`;
        b.querySelector('.vb').appendChild(t);
      }
      b.querySelector('.vn').textContent = v.name;
      b.querySelector('.vc').textContent = parts.join(' + ');
      b.querySelector('.vx').textContent = v.note;
      b.setAttribute('aria-label', `${v.name}, ${r.total} bodů. Rozložit na hřišti.`);
      b.onclick = () => {
        variantLayout(v, Y, START, DEF_COLORS).forEach((q, i) => Object.assign(pieces[i], q));
        sel = -1; drawPieces(); doScore();
        showView('simulace');
      };
      box.appendChild(b);
    }
  }
  renderVariants();

  // Stavba ze 4 modulů ze skutečných dílů
  function stageLayout(upto) {
    const used = ownLoop(Y, DEF_COLORS, upto);
    return Array.from({ length: 16 }, (_, i) => i < used.length ? { id: i, ...used[i], placed: true } : { id: i, ...START[i], c: [...DEF_COLORS[i]], flip: false, placed: true });
  }
  const HEXN = { R: 'červená', Y: 'žlutá', B: 'modrá', G: 'zelená' };
  // Obrázek opakující se části (modul A = díly 1–4), oříznutý na její rozměr
  function moduleSvg(list) {
    const grp = list.slice(0, 4), b = bbox(grp), m = 12;
    let h = `<svg viewBox="${b.x0 - m} ${b.y0 - m} ${b.w + 2 * m} ${b.h + 2 * m}" aria-hidden="true">`;
    for (const p of grp) h += `<g transform="translate(${p.x} ${p.y}) rotate(${p.a})"><rect x="-48" y="-16" width="48" height="32" fill="${HEX[p.c[0]]}"/><rect x="0" y="-16" width="48" height="32" fill="${HEX[p.c[1]]}"/><rect x="-48" y="-16" width="96" height="32" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="2"/></g>`;
    grp.forEach((p, k) => { h += pieceTag(p.x, p.y, 0, k); });
    return h + '</svg>';
  }
  function moduleCard(list) {
    const d = document.createElement('div'); d.className = 'modpart';
    d.innerHTML = `<span class="mp-img">${moduleSvg(list)}</span><span class="mp-x">4×</span><span class="mp-t"><b>Opakující se část</b>4 díly, uvnitř 2 kolmé spoje, k další části se napojuje také kolmo. Obrazec tvoří 4× tato část (moduly 1–4, díly a–d): 1 tak, jak je, 2, 3 a 4 otočené a zrcadlově převrácené.</span>`;
    return d;
  }
  function renderModules() {
    const box = $('modules'); if (!box) return; box.textContent = '';
    const full = ownLoop(Y, DEF_COLORS, 4);
    box.appendChild(moduleCard(full));
    MODULES.forEach((m, k) => {
      const lay = stageLayout(k + 1), r = scoreLayout(lay, Y);
      const seq = m.ids.map(i => { const q = full[i], a = q.rev ? q.c[1] : q.c[0], b = q.rev ? q.c[0] : q.c[1]; return `${i + 1} (${HEXN[a]}→${HEXN[b]})`; });
      const first = full[m.ids[0]], last = full[m.ids[3]];
      const inC = first.rev ? first.c[1] : first.c[0], outC = last.rev ? last.c[0] : last.c[1];
      const b = document.createElement('button'); b.type = 'button'; b.className = 'var';
      b.innerHTML = `<span class="vt">${thumb(lay, k + 1)}</span><span class="vb"><span class="vn"></span><b class="vp">${r.total}<small> b.</small></b><span class="vc"></span><span class="vx"></span></span>`;
      b.querySelector('.vn').textContent = `Krok ${k + 1}: modul ${m.key}`;
      b.querySelector('.vc').textContent = seq.join(' · ');
      b.querySelector('.vx').textContent = `${m.side}, ${m.shape}; začíná ${HEXN[inC]}, končí ${HEXN[outC]}` + (k === 3 ? '. Poslední spoj uzavře obrazec.' : `. Navazuje modul ${MODULES[k + 1].key}.`);
      b.setAttribute('aria-label', `Krok ${k + 1}, modul ${m.key}, ${r.total} bodů. Rozložit na hřišti.`);
      b.onclick = () => { stageLayout(k + 1).forEach((q, i) => Object.assign(pieces[i], q)); sel = -1; drawPieces(); doScore(); showView('simulace'); };
      box.appendChild(b);
    });
  }
  renderModules();
  $('clear').onclick = () => { pieces.forEach((p, i) => Object.assign(p, START[i], { flip: false, placed: true })); sel = -1; drawPieces(); doScore(); };
  $('allin').onclick = () => { const r0 = scoreLayout(pieces, Y); pieces.forEach((p, i) => { if (!r0.st[i].p1) dropIn(i); }); drawPieces(); doScore(); };

  const simEl = document.querySelector('.sim'), fsBtn = $('fs');
  function setFull(on, nativeFs = true) {
    simEl.classList.toggle('full', on); fsBtn.setAttribute('aria-pressed', on); fsBtn.textContent = on ? 'Zavřít' : 'Celá obrazovka';
    document.documentElement.style.overflow = on ? 'hidden' : '';
    try {
      if (on && nativeFs && !document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
      if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    } catch (e) {}
    requestAnimationFrame(() => { view = fitView(); applyView(); });
  }
  window.addEventListener('resize', () => { if (simEl.classList.contains('full')) { view = fitView(); applyView(); } });
  fsBtn.onclick = () => setFull(!simEl.classList.contains('full'));
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && simEl.classList.contains('full')) setFull(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && simEl.classList.contains('full')) setFull(false); });


  // Úvodní obrazovka a sekce aplikace
  const VIEWS = ['pravidla', 'simulace', 'navrhy'];
  function showView(name, push = true) {
    if (!VIEWS.includes(name)) name = 'simulace';
    $('intro').hidden = true; $('app').hidden = false;
    VIEWS.forEach(v => { $('v-' + v).hidden = v !== name; });
    document.querySelectorAll('.tabbar [data-go]').forEach(b => b.setAttribute('aria-current', b.dataset.go === name ? 'page' : 'false'));
    if (push && location.hash !== '#' + name) { try { history.pushState(null, '', '#' + name); } catch (e) {} }
    window.scrollTo(0, 0);
    if (simEl.classList.contains('full')) setFull(false);
    if (name === 'simulace') requestAnimationFrame(() => { view = fitView(); applyView(); });
  }
  function showIntro(push = true) {
    if (simEl.classList.contains('full')) setFull(false);
    $('app').hidden = true; $('intro').hidden = false;
    if (push) { try { history.pushState(null, '', location.pathname + location.search); } catch (e) {} }
  }
  $('enter').onclick = () => showView('pravidla');
  $('home').onclick = () => showIntro();
  document.querySelectorAll('.tabbar [data-go]').forEach(b => b.onclick = () => showView(b.dataset.go));
  $('tabhome').onclick = () => showIntro();
  window.addEventListener('popstate', () => { const h = location.hash.slice(1); if (VIEWS.includes(h)) showView(h, false); else showIntro(false); });
  { const h = location.hash.slice(1); if (VIEWS.includes(h)) showView(h, false); }
  drawBoard(); applyView(); drawPieces(); doScore();
})();


