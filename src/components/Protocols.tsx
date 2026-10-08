import { useEffect, useRef } from 'react';
import './Protocols.css';

/**
 * Six exploration-and-revisit templates (paper Fig. "routes"), each drawn in a
 * 400x240 SVG with a camera that animates along the template. Markers pop and
 * the phase label updates as the camera reaches P_q, the first visit, the
 * revisit, and finally P_r.
 */

type Look = { type: 'fixed'; a: number } | { type: 'tangent' } | { type: 'target'; p: [number, number] } | { type: 'yaw'; c: [number, number] };
type Proto = {
  name: string; desc: string;
  draw: { d: string; st: 'out' | 'back' | 'backChev' | 'guide' }[];
  segs: { d: string; rev?: boolean }[];
  look: Look;
  marks: { p0: [number, number]; pq: [number, number]; fr?: [number, number]; first?: [number, number]; revisit?: [number, number] };
  deco: string;
};

const cube = (x: number, y: number, s = 20) => `<g transform="translate(${x} ${y})"><path d="M0 ${-s} L${s*.87} ${-s/2} L0 0 L${-s*.87} ${-s/2}Z" fill="#dfe6fa" stroke="#7d93d6" stroke-width="1.4"/><path d="M${-s*.87} ${-s/2} L0 0 L0 ${s} L${-s*.87} ${s/2}Z" fill="#c3d0f1" stroke="#7d93d6" stroke-width="1.4"/><path d="M${s*.87} ${-s/2} L0 0 L0 ${s} L${s*.87} ${s/2}Z" fill="#a9bbe9" stroke="#7d93d6" stroke-width="1.4"/></g>`;
const cyl = (x: number, y: number, hx = 0, hy = 18) => `<g transform="translate(${x} ${y})"><circle cx="${hx}" cy="${hy}" r="46" fill="#5fbfae" opacity=".13"/><path d="M-15 -13 V13 A15 6 0 0 0 15 13 V-13" fill="#8fd3c7" stroke="#3a9d8d" stroke-width="1.4"/><ellipse cy="-13" rx="15" ry="6" fill="#dff4f0" stroke="#3a9d8d" stroke-width="1.4"/></g>`;

const UPPER = 'M50 110 Q110 165 160 167 Q262 172 345 120', LOWER = 'M50 110 Q130 232 240 222 Q322 214 345 120';
export const PROTOCOLS: Proto[] = [
  { name: 'Forward–backward', desc: 'Push forward past the anchor into new space, then back straight out to P₀.',
    draw: [{ d: 'M50 130 L345 130', st: 'out' }, { d: 'M50 130 L345 130', st: 'backChev' }],
    segs: [{ d: 'M50 130 L345 130' }, { d: 'M50 130 L345 130', rev: true }], look: { type: 'fixed', a: 0 },
    marks: { p0: [50, 130], pq: [138, 130], fr: [272, 130] }, deco: cube(150, 192) + cyl(300, 66, -10, 34) },
  { name: 'Lateral return', desc: 'Truck sideways while the camera keeps facing the anchor, then slide back.',
    draw: [{ d: 'M50 150 L350 150', st: 'out' }, { d: 'M50 150 L350 150', st: 'backChev' }],
    segs: [{ d: 'M50 150 L350 150' }, { d: 'M50 150 L350 150', rev: true }], look: { type: 'fixed', a: -90 },
    marks: { p0: [50, 150], pq: [178, 150], fr: [306, 150] }, deco: cube(205, 70) + cyl(320, 86, -6, 30) },
  { name: 'Yaw return', desc: 'Pan past the first-visit pose, keep exploring, then revisit the same pose on the way back.',
    draw: [{ d: 'M100 178 A100 100 0 0 1 300 178', st: 'out' }, { d: 'M100 178 A100 100 0 0 1 300 178', st: 'backChev' }, { d: 'M100 178 L300 178', st: 'guide' }],
    segs: [{ d: 'M100 178 A100 100 0 0 1 300 178' }, { d: 'M100 178 A100 100 0 0 1 300 178', rev: true }], look: { type: 'yaw', c: [200, 178] },
    marks: { p0: [100, 178], pq: [150, 91.4], fr: [276.6, 113.72] }, deco: cube(52, 170) + cyl(350, 170, 0, 4) },
  { name: 'Arc return', desc: 'Sweep around the anchor on an arc, come home on a different arc.',
    draw: [{ d: 'M45 175 Q200 40 355 175', st: 'out' }, { d: 'M355 175 Q200 270 45 175', st: 'back' }],
    segs: [{ d: 'M45 175 Q200 40 355 175' }, { d: 'M355 175 Q200 270 45 175' }], look: { type: 'target', p: [346, 92] },
    marks: { p0: [45, 175], pq: [113, 128.7], first: [237, 111.4], revisit: [237, 219.8] }, deco: cube(205, 162) + cyl(346, 92, 0, 14) },
  { name: 'Orbit around an anchor', desc: 'Circle the anchor while looking at it: visible surfaces and occlusions keep changing.',
    draw: [{ d: 'M90 205 A135 135 0 0 1 360 205', st: 'out' }, { d: 'M90 205 A135 135 0 0 1 360 205', st: 'backChev' }],
    segs: [{ d: 'M90 205 A135 135 0 0 1 360 205' }, { d: 'M90 205 A135 135 0 0 1 360 205', rev: true }], look: { type: 'target', p: [230, 182] },
    marks: { p0: [90, 205], pq: [157.5, 88], fr: [341, 128] }, deco: cube(230, 182) + cyl(46, 180, 2, 4) },
  { name: 'Peek-and-return', desc: 'Peek past the anchor into an unseen region, return, then revisit it on a second excursion.',
    draw: [{ d: UPPER, st: 'out' }, { d: UPPER, st: 'backChev' }, { d: LOWER, st: 'out' }, { d: LOWER, st: 'backChev' }],
    segs: [{ d: UPPER }, { d: UPPER, rev: true }, { d: LOWER }, { d: LOWER, rev: true }], look: { type: 'target', p: [362, 66] },
    marks: { p0: [50, 110], pq: [160, 167], fr: [345, 120] }, deco: cube(200, 92) + cyl(362, 66, -8, 30) },
];

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag: string, attrs: Record<string, string | number>, parent?: Element) => {
  const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, String(attrs[k])); if (parent) parent.appendChild(e); return e;
};
const angle = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;

function animate(card: HTMLElement, pr: Proto, reduced: boolean) {
  const svg = card.querySelector('svg')!, pathsG = svg.querySelector('.paths')!, mkG = svg.querySelector('.mks')!;
  const phase = card.querySelector<HTMLElement>('.pr-phase')!, bar = card.querySelector<HTMLElement>('.pr-bar i')!;
  const camG = svg.querySelector('.cam')!, trail = svg.querySelector('.trail')!, ray = svg.querySelector<SVGLineElement>('.ray')!;
  pathsG.innerHTML = ''; mkG.innerHTML = '';
  // static drawing: outward paths, return paths, direction chevrons
  pr.draw.forEach(dr => {
    const p = svgEl('path', { d: dr.d, class: dr.st === 'backChev' ? 'guide' : dr.st }, pathsG) as SVGPathElement;
    if (dr.st === 'backChev') p.style.display = 'none';
    if (dr.st === 'guide') return;
    const len = p.getTotalLength(), f = dr.st === 'backChev' ? .72 : .5, a = p.getPointAtLength(f * len), b = p.getPointAtLength(f * len + 1);
    svgEl('path', { class: 'chev', d: 'M-6 -6 L1 0 L-6 6', stroke: dr.st === 'out' ? '#22407a' : '#d4708a', transform: `translate(${a.x} ${a.y}) rotate(${angle(a, b) + (dr.st === 'backChev' ? 180 : 0)})` }, pathsG);
  });
  // markers (outer <g> positions, inner <g> animates)
  const M: Record<string, Element> = {}, m = pr.marks;
  const mk = (key: string, x: number, y: number, html: string) => { const o = svgEl('g', { class: 'mk', transform: `translate(${x} ${y})` }, mkG); const g = svgEl('g', { class: 'mki' }, o); g.innerHTML = html; M[key] = g; };
  mk('p0', ...m.p0, '<circle r="6" fill="#1f2f4f" stroke="#fff" stroke-width="2"/>');
  mk('pq', ...m.pq, '<rect x="-5.5" y="-5.5" width="11" height="11" fill="#12a4d9" stroke="#fff" stroke-width="1.5"/>');
  if (m.fr) { mk('first', m.fr[0], m.fr[1] - 6, '<path d="M0 -6 L6 4 L-6 4Z" fill="#2ab3a6" stroke="#fff" stroke-width="1"/>'); mk('revisit', m.fr[0], m.fr[1] + 6, '<path d="M0 6 L6 -4 L-6 -4Z" fill="#2ab3a6" stroke="#fff" stroke-width="1"/>'); }
  else { mk('first', ...m.first!, '<path d="M0 -7 L7 5 L-7 5Z" fill="#2ab3a6" stroke="#fff" stroke-width="1"/>'); mk('revisit', ...m.revisit!, '<path d="M0 7 L7 -5 L-7 -5Z" fill="#2ab3a6" stroke="#fff" stroke-width="1"/>'); }
  if (pr.look.type === 'yaw') { const c = pr.look.c; svgEl('rect', { x: c[0] - 11, y: c[1] - 8, width: 22, height: 16, rx: 4, fill: '#fff', stroke: '#13232b', 'stroke-width': 1.6 }, mkG); svgEl('circle', { cx: c[0], cy: c[1], r: 4.2, fill: 'none', stroke: '#13232b', 'stroke-width': 1.6 }, mkG); }

  const segs = pr.segs.map(sg => { const p = svgEl('path', { d: sg.d, fill: 'none', stroke: 'none' }, pathsG) as SVGPathElement; return { p, len: p.getTotalLength(), rev: !!sg.rev }; });
  const total = segs.reduce((a, s) => a + s.len, 0), speed = total / 6200;
  let tt = 0, hold = 0, hits = 0, pqDone = false, doneHold = 0, vis = false, last = performance.now(), raf = 0;
  let inside: Record<string, boolean> = {}, tr: [number, number][] = [], hitTimer = 0;
  const pos = (d: number) => { let acc = 0; for (let i = 0; i < segs.length; i++) { const s = segs[i]; if (d <= acc + s.len || i === segs.length - 1) {
    const u = Math.min(s.len, Math.max(0, d - acc)), l = s.rev ? s.len - u : u;
    return { a: s.p.getPointAtLength(l), b: s.p.getPointAtLength(s.rev ? Math.max(0, l - 1.5) : Math.min(s.len, l + 1.5)), i }; } acc += s.len; } return null!; };
  const pop = (key: string, label: string) => { const g = M[key]; g.classList.remove('pop'); void (g as SVGGElement).getBBox(); g.classList.add('pop');
    phase.textContent = label; phase.classList.add('hit'); hold = 520; clearTimeout(hitTimer); hitTimer = window.setTimeout(() => phase.classList.remove('hit'), 900); };
  const restart = () => { tt = 0; hits = 0; pqDone = false; inside = {}; tr = []; phase.textContent = 'Start · P₀'; };
  const draw = () => {
    const { a, b, i } = pos(tt);
    let cx = a.x, cy = a.y, an: number;
    if (pr.look.type === 'yaw') { [cx, cy] = pr.look.c; an = angle({ x: cx, y: cy }, a); ray.style.display = ''; ray.setAttribute('x1', String(cx)); ray.setAttribute('y1', String(cy)); ray.setAttribute('x2', String(a.x)); ray.setAttribute('y2', String(a.y)); }
    else if (pr.look.type === 'fixed') an = pr.look.a;
    else if (pr.look.type === 'target') an = angle(a, { x: pr.look.p[0], y: pr.look.p[1] });
    else an = angle(a, b);
    camG.setAttribute('transform', `translate(${cx} ${cy}) rotate(${an})`);
    tr.push([a.x, a.y]); if (tr.length > 34) tr.shift();
    trail.setAttribute('d', tr.length > 1 ? 'M' + tr.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' L') : '');
    bar.style.width = (tt / total * 100) + '%';
    return { a, i };
  };
  const step = (now: number) => {
    const dt = Math.min(64, now - last); last = now;
    if (vis) {
      if (doneHold > 0) { doneHold -= dt; if (doneHold <= 0) restart(); }
      else if (hold > 0) hold -= dt;
      else { tt += dt * speed; if (tt >= total) { tt = total; doneHold = 1100; pop('p0', 'Return · Pᵣ'); } }
    }
    const { a, i } = draw();
    if (vis && doneHold <= 0 && hold <= 0) {
      const near = (pt?: [number, number]) => !!pt && Math.hypot(a.x - pt[0], a.y - pt[1]) < 7;
      const chk = (key: string, pt: [number, number] | undefined, fn: () => void) => { const n = near(pt); if (n && !inside[key]) fn(); inside[key] = n; };
      chk('pq', m.pq, () => { if (!pqDone) { pqDone = true; pop('pq', 'Query · Pq'); } });
      if (m.fr) chk('fr', m.fr, () => { hits++; if (hits === 1) pop('first', 'First visit'); else if (hits === 2) pop('revisit', 'Revisit'); });
      else { chk('first', m.first, () => pop('first', 'First visit')); chk('revisit', m.revisit, () => pop('revisit', 'Revisit')); }
      if (!phase.classList.contains('hit') && tt > 2) phase.textContent = (segs[i].rev || (pr.name === 'Arc return' && i % 2 === 1)) ? '← Returning' : 'Exploring →';
    }
    raf = requestAnimationFrame(step);
  };
  if (reduced) { tt = total * .55; draw(); phase.textContent = 'Static preview'; return () => {}; }
  const io = new IntersectionObserver(es => es.forEach(e => vis = e.isIntersecting), { threshold: .3 });
  io.observe(card); raf = requestAnimationFrame(step);
  return () => { cancelAnimationFrame(raf); io.disconnect(); clearTimeout(hitTimer); };
}

export default function Protocols() {
  const grid = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cards = [...(grid.current?.querySelectorAll<HTMLElement>('.pr-card') || [])];
    const cleanups = cards.map((c, i) => animate(c, PROTOCOLS[i], reduced));
    return () => cleanups.forEach(f => f());
  }, []);
  return <div className="pr">
    <ul className="pr-legend" aria-label="Legend">
      <li><svg viewBox="-10 -10 20 20"><circle r="5.5" fill="#1f2f4f" /></svg><em>P<sub>0</sub> / P<sub>r</sub></em></li>
      <li><svg viewBox="-10 -10 20 20"><rect x="-5" y="-5" width="10" height="10" fill="#12a4d9" /></svg><em>P<sub>q</sub></em></li>
      <li><svg viewBox="-10 -10 20 20"><path d="M0 -6 L6 4 L-6 4Z" fill="#2ab3a6" /></svg><em>P<sub>first</sub></em></li>
      <li><svg viewBox="-10 -10 20 20"><path d="M0 6 L6 -4 L-6 -4Z" fill="#2ab3a6" /></svg><em>P<sub>revisit</sub></em></li>
      <li><svg viewBox="-12 -12 24 24"><path d="M-8 0 L8 -8 Q11 0 8 8Z" fill="rgba(42,179,166,.22)" stroke="#2ab3a6" strokeWidth="1.5" /></svg>Camera view</li>
      <li><svg viewBox="-12 -12 24 24" dangerouslySetInnerHTML={{ __html: `<g transform="scale(.5)">${cube(0, 0)}</g>` }} />Input anchor</li>
      <li><svg viewBox="-12 -12 24 24"><g transform="scale(.6)"><path d="M-12 -10 V10 A12 5 0 0 0 12 10 V-10" fill="#8fd3c7" stroke="#3a9d8d" strokeWidth="2" /><ellipse cy="-10" rx="12" ry="5" fill="#dff4f0" stroke="#3a9d8d" strokeWidth="2" /></g></svg>New object</li>
      <li><svg viewBox="-12 -12 24 24"><path d="M-10 0 H10" stroke="#22407a" strokeWidth="3" /></svg>Outward</li>
      <li><svg viewBox="-12 -12 24 24"><path d="M-10 0 H10" stroke="#d4708a" strokeWidth="2.6" strokeDasharray="5 4" /></svg>Return</li>
    </ul>
    <div className="pr-grid" ref={grid}>
      {PROTOCOLS.map((p, i) => <article className="pr-card" key={p.name}>
        <div className="pr-head"><span className="n">0{i + 1}</span><h3>{p.name}</h3><span className="pr-phase" aria-live="off">Start · P₀</span></div>
        <svg className="pr-svg" viewBox="0 0 400 240" role="img" aria-label={`${p.name} trajectory template`}>
          <g dangerouslySetInnerHTML={{ __html: p.deco }} />
          <g className="paths" /><g className="mks" /><path className="trail" /><line className="ray" style={{ display: 'none' }} />
          <g className="cam"><path className="cone" d="M0 0 L30 -14 Q35 0 30 14 Z" /><circle className="body" r="5" /></g>
        </svg>
        <p>{p.desc}</p><div className="pr-bar"><i /></div>
      </article>)}
    </div>
  </div>;
}
