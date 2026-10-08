import { useEffect, useRef } from 'react';
import { media } from '../lib/assets';
import correspondence from '../data/story.json';
import './EvaluationTeaser.css';

/**
 * Animated Figure 1. A camera travels the exploration-and-revisit route over
 * the main scene; each checkpoint opens a card with its ground-truth RGB, depth
 * and anchor mask, and the last step walks through the 3D self-consistency checks.
 *
 * The stage is a 1600x900 canvas. The scene image is placed by SCENE; the route,
 * outlines and view targets are given in scene-image pixels (1554x995).
 */

const STAGE_W = 1600, STAGE_H = 900;
// Full-bleed: the scene covers the stage; the top (sky) is cropped so the route and bench stay in view.
const SCENE = { src: 'media/teaser/scene-original.webp', w: 1554, h: 995, x: 0, y: -125, scale: 1.08 };
const CARD_W = 280;
const GOLD = '#d9a12a', TEAL = '#1f9e8f', BLUE = '#2f74c0';

const ROUTE: [number, number][] = [[359.8,919.3],[277.3,809.7],[261.4,733.1],[286,673.1],[312.2,646.6],[350,581.2],[385.1,524.1],[381.1,481.4],[404,453.9],[443,440.5],[493.3,446.5],[533.9,465.3],[567,525.4],[602,614.4],[650.7,715],[669.7,809.4],[638.3,887.7],[556.9,922.1],[447.6,930],[359.8,919.3]];
const BENCH = 'M1006 842 L1100 828 L1440 990 L1215 995 L1005 852 Z';
const BRIDGE = 'M528 235 L1052 240 L1086 352 L1030 356 L1020 580 L890 580 L650 500 L560 470 L540 356 L522 352 Z';
const BENCH_POINT: [number, number] = [1150, 905];
const BRIDGE_POINT: [number, number] = [800, 400];

type Layer = 'rgb' | 'depth' | 'mask';
type NodeDef = { id: string; color: string; pt: [number, number]; cone: number | null; label: string; sub: string; text: string;
  layers: Layer[]; slot: { side: 'left' | 'right'; top: number }; focus: 'bench' | 'bridge' | 'none' };
const NODES: NodeDef[] = [
  { id: 'input', color: GOLD, pt: [359.8, 919.3], cone: 0, label: 'Input P_0', sub: 'Reference view', text: 'The given image. Its registered depth and anchor mask are the ground truth.', layers: ['rgb', 'depth', 'mask'], slot: { side: 'left', top: 540 }, focus: 'bench' },
  { id: 'query', color: GOLD, pt: [312.2, 646.6], cone: 0, label: 'Query P_q', sub: 'Cross-view check', text: 'A new viewpoint on input-visible surfaces, compared with the registered RGB-D and anchors.', layers: ['rgb', 'depth', 'mask'], slot: { side: 'left', top: 110 }, focus: 'bench' },
  { id: 'first', color: TEAL, pt: [381.1, 481.4], cone: 0, label: 'First visit P_first', sub: 'New region', text: 'A region outside the input view. The first generated observation becomes its reference.', layers: ['rgb', 'depth'], slot: { side: 'right', top: 120 }, focus: 'bridge' },
  { id: 'revisit', color: TEAL, pt: [533.9, 465.3], cone: 0, label: 'Revisit P_revisit', sub: 'Same region again', text: 'After exploring elsewhere, the same region should look and measure the same.', layers: ['rgb', 'depth'], slot: { side: 'right', top: 520 }, focus: 'bridge' },
  { id: 'return', color: GOLD, pt: [359.8, 919.3], cone: null, label: 'Return P_r', sub: 'Same pose as P_0', text: 'Back at the start: the view should match the input image and its depth.', layers: ['rgb', 'depth', 'mask'], slot: { side: 'left', top: 540 }, focus: 'bench' },
  { id: '3d', color: BLUE, pt: [550, 670], cone: null, label: '3D self-consistency', sub: 'All sampled views', text: '', layers: [], slot: { side: 'left', top: 0 }, focus: 'none' },
];
const LAYER_NAME: Record<Layer, string> = { rgb: 'RGB', depth: 'Depth', mask: 'Anchor' };
const CHECKS = [
  { id: 'depth', title: 'Cross-view depth consistency', text: 'Depth reprojected between views agrees on shared surfaces.' },
  { id: 'feature', title: 'Cross-view feature consistency', text: 'The same surface keeps the same visual features in every view.' },
  { id: 'scale', title: 'Regional scale agreement', text: 'Depth scale stays uniform across a 4 × 4 grid of image regions.' },
  { id: 'recon', title: 'Held-out reconstruction', text: 'A 3D scene built from 64 context views must render 16 held-out views.' },
];

const toStage = ([x, y]: [number, number]): [number, number] => [SCENE.x + x * SCENE.scale, SCENE.y + y * SCENE.scale];
const pct = (v: number, total: number) => `${(v / total) * 100}%`;
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag: string, attrs: Record<string, string | number>, parent?: Element) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  if (parent) parent.appendChild(e);
  return e;
};
const angle = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
const smoothClosed = (p: [number, number][]) => {
  const n = p.length; let d = `M${p[0][0]} ${p[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = p[i - 1] || p[n - 2], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p[1];
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0]} ${p2[1]}`;
  }
  return d;
};
const sub = (label: string) => label.split(/_(\w+)/).map((part, i) => i % 2 ? <sub key={i}>{part}</sub> : part);

export default function EvaluationTeaser() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = root.current; if (!host) return;
    const $ = <T extends Element>(sel: string) => host.querySelector(sel) as T;
    const stage = $<HTMLDivElement>('.tz-stage');
    const prog = $<SVGPathElement>('.tz-prog');
    const D = smoothClosed(ROUTE.map(toStage));
    host.querySelectorAll('.tz-base, .tz-prog').forEach(p => p.setAttribute('d', D));
    const L = prog.getTotalLength();
    prog.style.strokeDasharray = String(L); prog.style.strokeDashoffset = String(L);
    const P = (s: number) => prog.getPointAtLength(Math.max(0, Math.min(L, s)));
    const nearest = (x: number, y: number) => { let best = 0, bd = 1e9; for (let s = 0; s <= L; s += 1) { const q = P(s), d = (q.x - x) ** 2 + (q.y - y) ** 2; if (d < bd) { bd = d; best = s; } } return best; };

    const chevG = $<SVGGElement>('.tz-chevs'); chevG.innerHTML = '';
    [0.12, 0.36, 0.62, 0.86].forEach(f => { const a = P(f * L), b = P(f * L + 2);
      svgEl('path', { class: 'tz-chev', d: 'M-5 -5 L2 0 L-5 5', transform: `translate(${a.x} ${a.y}) rotate(${angle(a, b)})` }, chevG); });

    type RT = NodeDef & { at: number; t0: number; xy: [number, number]; lead?: Element; g?: Element; cardEl: HTMLElement; stepEl: HTMLElement; layer: number; manual: boolean };
    const nodes = NODES.map(n => ({ ...n, xy: toStage(n.pt), layer: 0, manual: false })) as RT[];
    nodes[0].at = 0; nodes[4].at = L; nodes[5].at = L;
    [1, 2, 3].forEach(i => nodes[i].at = nearest(...nodes[i].xy));

    // leader lines from each card edge to its checkpoint
    const leadG = $<SVGGElement>('.tz-leads'); leadG.innerHTML = '';
    nodes.slice(0, 5).forEach(n => {
      const card = n.slot.side === 'left' ? 28 + CARD_W : STAGE_W - 28 - CARD_W, cy = n.slot.top + 90;
      const [nx, ny] = n.xy, sg = n.slot.side === 'left' ? 1 : -1;
      n.lead = svgEl('path', { class: 'tz-lead', d: `M${card} ${cy} C${card + sg * 120} ${cy} ${nx - sg * 110} ${ny} ${nx} ${ny}`, stroke: n.color, pathLength: 1 }, leadG);
    });

    // Viewing direction is independent of travel: input/query/return look at the bench,
    // first visit and revisit at the covered bridge. Checkpoint cones use the same rule.
    const [bx0, by0] = toStage(BENCH_POINT), [hx0, hy0] = toStage(BRIDGE_POINT);
    const viewAngle = (s: number, a: { x: number; y: number }) => {
      const mix = Math.max(0, Math.min(1, (s - nodes[1].at) / Math.max(1, nodes[2].at - nodes[1].at))) * Math.max(0, Math.min(1, (L - s) / Math.max(1, L - nodes[3].at)));
      return angle(a, { x: bx0 + (hx0 - bx0) * mix, y: by0 + (hy0 - by0) * mix });
    };
    nodes.slice(0, 4).forEach(n => { n.cone = viewAngle(n.at, P(n.at)); });

    // checkpoint markers with viewing cones
    const nodeG = $<SVGGElement>('.tz-nodes'); nodeG.innerHTML = '';
    const tags: Record<string, string[]> = { input: ['P', '0', ' / P', 'r'], query: ['P', 'q'], first: ['P', 'first'], revisit: ['P', 'revisit'] };
    nodes.slice(0, 4).forEach(n => { const g = svgEl('g', { class: 'tz-node', transform: `translate(${n.xy[0]} ${n.xy[1]})` }, nodeG);
      svgEl('path', { class: 'fr', d: 'M0 0 L44 -20 Q50 0 44 20 Z', fill: n.color + '40', stroke: n.color, 'stroke-width': 1.6, transform: `rotate(${n.cone})` }, g);
      svgEl('circle', { class: 'ring', r: 9, stroke: n.color }, g);
      svgEl('circle', { class: 'core', r: 8.5, fill: n.color }, g);
      const t = svgEl('text', { class: 'tz-tag', x: n.id === 'revisit' ? 16 : -16, y: n.id === 'input' ? -14 : (n.id === 'first' ? -16 : 6), 'text-anchor': n.id === 'revisit' ? 'start' : 'end' }, g);
      const tt = tags[n.id]; if (tt.length === 1) t.textContent = tt[0];
      else tt.forEach((s, i) => { const sp = svgEl('tspan', i % 2 ? { class: 's', dy: 5 } : (i ? { dy: -5 } : {}), t); sp.textContent = s; });
      n.g = g; });
    nodes[4].g = nodes[0].g;
    nodes.forEach((n, i) => { n.cardEl = $<HTMLElement>(`[data-card="${n.id}"]`); n.stepEl = host.querySelectorAll<HTMLElement>('.tz-step')[i]; });

    // timeline
    const SPEED = L / 6500, LAYER_MS = 1300, CHECK_MS = 3000, TAIL = 600;
    type Phase = { type: 'move' | 'hold'; t0: number; dur: number; s0?: number; s1?: number; s?: number; node?: number };
    const sched: Phase[] = []; let T = 0;
    nodes.forEach((n, i) => {
      if (i > 0 && i < 5) { const dur = (n.at - nodes[i - 1].at) / SPEED; sched.push({ type: 'move', s0: nodes[i - 1].at, s1: n.at, t0: T, dur }); T += dur; }
      const dur = i === 5 ? CHECKS.length * CHECK_MS : Math.max(2400, n.layers.length * LAYER_MS + 500);
      n.t0 = T; sched.push({ type: 'hold', node: i, s: n.at, t0: T, dur }); T += dur;
    });
    const TOTAL = T + TAIL;

    // sampled views along the route (3D self-consistency)
    const sampG = $<SVGGElement>('.tz-samples'), rayG = $<SVGGElement>('.tz-rays');
    const STEP = 46; let sampled = 0; const samples: { a: DOMPoint; ang: number }[] = [];
    const addSamplesTo = (s: number) => { while ((sampled + 1) * STEP < s && (sampled + 1) * STEP < L - 10) { sampled++; const ss = sampled * STEP, a = P(ss), b = P(ss + 2);
      const g = svgEl('g', { class: 'tz-sample', transform: `translate(${a.x} ${a.y}) rotate(${angle(a, b) - 25})` }, sampG);
      svgEl('path', { class: 'tz-sample-cone', d: 'M0 0 L24 -11 Q27 0 24 11 Z' }, g);
      svgEl('circle', { r: 3.6 }, g);
      g.classList.toggle('heldout', sampled % 5 === 2);
      samples.push({ a, ang: angle(a, b) }); } };
    const [bx, by] = [bx0, by0];
    const buildRays = () => { rayG.innerHTML = ''; samples.filter((_, i) => i % 3 === 1).forEach(({ a }, i) => {
      svgEl('path', { class: 'tz-ray', d: `M${a.x} ${a.y} L${bx} ${by}`, pathLength: 1, style: `--d:${i * 90}ms` }, rayG); });
      svgEl('circle', { class: 'tz-ray-target', cx: bx, cy: by, r: 7 }, rayG); };

    const cam = $<SVGGElement>('.tz-cam');
    const playBtn = $<HTMLButtonElement>('.tz-play');
    const checkEls = host.querySelectorAll<HTMLElement>('.tz-check');
    const checkPanes = host.querySelectorAll<HTMLElement>('.tz-check-pane');
    let t = 0, active = -1, check = -1, playing = true, visible = false, last = performance.now(), raf = 0;

    const setLayer = (n: RT, k: number) => {
      if (n.cardEl.dataset.layer === n.layers[k]) return;
      n.cardEl.dataset.layer = n.layers[k];
      n.cardEl.querySelectorAll<HTMLButtonElement>('.tz-layer').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.layer === n.layers[k])));
    };
    const setCheck = (k: number) => {
      if (k === check) return; check = k;
      checkEls.forEach((el, i) => { el.classList.toggle('on', i === k); el.classList.toggle('done', k >= 0 && i < k); });
      checkPanes.forEach((el, i) => el.classList.toggle('on', i === k));
      stage.dataset.check = k >= 0 ? CHECKS[k].id : '';
    };
    const setActive = (k: number) => {
      if (k === active) return; active = k;
      nodes.forEach((n, i) => {
        n.cardEl.classList.toggle('on', i === k); n.cardEl.classList.toggle('seen', k >= 0 && i < k && i < 5);
        n.lead?.classList.toggle('on', i === k); n.lead?.classList.toggle('seen', k >= 0 && i < k);
        n.stepEl.classList.toggle('on', i === k); n.stepEl.classList.toggle('done', k >= 0 && i < k);
        n.stepEl.setAttribute('aria-current', i === k ? 'step' : 'false');
        n.g?.classList.remove('ping'); if (n.g && i < k) n.g.classList.add('seen');
        n.manual = false;
      });
      if (k >= 0) nodes[k].g?.classList.add('ping');
      stage.classList.toggle('s3d', k === 5);
      stage.dataset.focus = k >= 0 ? nodes[k].focus : 'none';
      stage.dataset.node = k >= 0 ? nodes[k].id : '';
      if (k === 5) buildRays(); else { rayG.innerHTML = ''; setCheck(-1); }
    };
    const reset = () => { sampled = 0; samples.length = 0; sampG.innerHTML = ''; rayG.innerHTML = ''; active = -2; setActive(-1); setCheck(-1); nodes.forEach(n => { n.g?.classList.remove('seen', 'ping'); if (n.layers.length) setLayer(n, 0); }); };
    const setPlaying = (v: boolean) => { playing = v; playBtn.textContent = v ? 'Pause' : 'Play'; playBtn.setAttribute('aria-pressed', String(!v)); };
    const jump = (i: number) => { reset(); t = nodes[i].t0 + 1; addSamplesTo(nodes[i].at); setPlaying(!reduced); render(); };

    const render = () => {
      let s = L, k = -1;
      for (const ph of sched) { if (t >= ph.t0 && t < ph.t0 + ph.dur) {
        if (ph.type === 'move') { const u = (t - ph.t0) / ph.dur, e = u < .5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2; s = ph.s0! + (ph.s1! - ph.s0!) * e; }
        else { s = ph.s!; k = ph.node!; } break; } }
      if (t >= TOTAL - TAIL) k = 5;
      if (k === -1) { for (let i = nodes.length - 1; i >= 0; i--) if (t >= nodes[i].t0) { k = i; break; } }
      setActive(k); addSamplesTo(s);
      if (k >= 0 && k < 5) { const n = nodes[k]; if (!n.manual) setLayer(n, Math.min(n.layers.length - 1, Math.floor((t - n.t0) / LAYER_MS))); }
      if (k === 5) setCheck(Math.min(CHECKS.length - 1, Math.floor((t - nodes[5].t0) / CHECK_MS)));
      prog.style.strokeDashoffset = String(L - s);
      const a = P(s);
      const coneAngle = viewAngle(s, a);
      cam.setAttribute('transform', `translate(${a.x} ${a.y}) rotate(${coneAngle})`);
      cam.style.opacity = k === 5 ? '0' : '1';
      host.classList.toggle('tz-paused', !playing);
      nodes.forEach((n, i) => { const fill = n.stepEl.querySelector<HTMLElement>('.fill')!;
        if (i === k) { const nxt = i < 5 ? nodes[i + 1].t0 : TOTAL; fill.style.width = Math.min(100, (t - n.t0) / (nxt - n.t0) * 100) + '%'; }
        else fill.style.width = n.stepEl.classList.contains('done') ? '' : '0'; });
    };
    const frame = (now: number) => {
      const dt = Math.min(64, now - last); last = now;
      if (playing && visible) { t += dt; if (t >= TOTAL) { t = 0; reset(); } }
      render(); raf = requestAnimationFrame(frame);
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const io = new IntersectionObserver(es => es.forEach(e => visible = e.isIntersecting), { threshold: .25 });
    io.observe(stage);
    const listeners: [Element, string, EventListener][] = [];
    const on = (el: Element, type: string, f: EventListener) => { el.addEventListener(type, f); listeners.push([el, type, f]); };
    on(playBtn, 'click', () => setPlaying(!playing));
    on($('.tz-replay'), 'click', () => jump(0));
    nodes.forEach((n, i) => {
      on(n.stepEl, 'click', () => jump(i));
      n.cardEl.querySelectorAll<HTMLButtonElement>('.tz-layer').forEach(b => on(b, 'click', e => {
        e.stopPropagation(); if (active !== i) jump(i);
        n.manual = true; setLayer(n, n.layers.indexOf(b.dataset.layer as Layer)); setPlaying(false); }));
      on(n.cardEl, 'click', () => { if (active !== i) jump(i); });
    });
    checkEls.forEach((el, i) => on(el, 'click', () => { if (active !== 5) jump(5); t = nodes[5].t0 + i * CHECK_MS + 1; setPlaying(false); render(); }));

    reset();
    if (reduced) { jump(5); setPlaying(false); render(); }
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); io.disconnect(); listeners.forEach(([el, type, f]) => el.removeEventListener(type, f)); };
  }, []);

  const views = correspondence.views;
  const sceneRect = { left: pct(SCENE.x, STAGE_W), top: pct(SCENE.y, STAGE_H), width: pct(SCENE.w * SCENE.scale, STAGE_W), height: pct(SCENE.h * SCENE.scale, STAGE_H) };
  return <div className="tz" ref={root}>
    <div className="tz-stage" data-focus="none">
      <img className="tz-scene" src={media(SCENE.src)} alt="Main ORBIA scene: a garden path in a simulated village" style={sceneRect} decoding="async" />
      <div className="tz-scene-light" aria-hidden="true" />
      {(['bench', 'bridge'] as const).map(id => <span key={id} className={`tz-spot tz-spot-${id}`} style={{ ...sceneRect, '--spot': `url("${media(`media/story/spot-${id}.png`)}")` } as React.CSSProperties} />)}
      <svg className="tz-svg" viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} aria-hidden="true">
        <defs>
        </defs>
        <g transform={`translate(${SCENE.x} ${SCENE.y}) scale(${SCENE.scale})`}>
          <path className="tz-outline tz-outline-bench" d={BENCH} pathLength={100} />
          <path className="tz-outline tz-outline-bridge" d={BRIDGE} pathLength={100} />
        </g>
        <g className="tz-leads" />
        <path className="tz-base" /><path className="tz-prog" />
        <g className="tz-chevs" /><g className="tz-rays" /><g className="tz-samples" /><g className="tz-nodes" />
        <g className="tz-cam"><path className="cone" d="M0 0 L50 -24 Q57 0 50 24 Z" /><circle className="body" r="8.5" /></g>
      </svg>

      <div className="tz-dim tz-dim-input"><small>Dimension 1</small>Input preservation</div>
      <div className="tz-dim tz-dim-persist"><small>Dimension 2</small>Generated-content persistence</div>

      {NODES.slice(0, 5).map(n => <article key={n.id} className={`tz-card tz-card-${n.slot.side}`} data-card={n.id} data-layer={n.layers[0]}
        style={{ '--c': n.color, top: pct(n.slot.top, STAGE_H), [n.slot.side]: pct(28, STAGE_W) } as React.CSSProperties}>
        <div className="tz-media">
          <img className="tz-img tz-img-rgb" src={media(`media/story/${n.id}-rgb.webp`)} alt="" loading="lazy" decoding="async" />
          <img className="tz-img tz-img-depth" src={media(`media/story/${n.id}-depth.webp`)} alt="" loading="lazy" decoding="async" />
          {n.layers.includes('mask') && <span className="tz-mask" style={{ '--m': `url("${media(`media/story/${n.id}-mask.png`)}")` } as React.CSSProperties} />}
          <span className="tz-label">{sub(n.label)}</span>
          <div className="tz-layers" role="group" aria-label={`${n.label.replace('_', '')} layers`}>
            {n.layers.map(l => <button type="button" key={l} className="tz-layer" data-layer={l} aria-pressed={l === n.layers[0]}>{LAYER_NAME[l]}</button>)}
          </div>
        </div>
        <div className="tz-body"><b>{sub(n.sub)}</b><p>{n.text}</p></div>
      </article>)}

      <div className="tz-card tz-world" data-card="3d" style={{ '--c': BLUE } as React.CSSProperties}>
        <div className="tz-world-panel tz-world-left">
          <small>Dimension 3 · across the whole route</small><h3>3D self-consistency</h3>
          <p className="tz-world-lead">Views sampled along the route should describe one 3D scene.</p>
          <ol className="tz-checks">{CHECKS.map((c, i) => <li key={c.id}><button type="button" className="tz-check"><span>{i + 1}</span>{c.title}</button></li>)}</ol>
        </div>
        <div className="tz-world-panel tz-world-right">
          <div className="tz-check-pane" data-pane="depth">
            <div className="tz-view tz-view-main"><img src={media('media/story/view2-depth.webp')} alt="" loading="lazy" /><i style={{ left: `${views[1].u * 100}%`, top: `${views[1].v * 100}%` }} /><em>View 2</em></div>
            <div className="tz-view-row">{[0, 2].map(i => <div key={i} className="tz-view"><img src={media(`media/story/view${i + 1}-depth.webp`)} alt="" loading="lazy" /><i style={{ left: `${views[i].u * 100}%`, top: `${views[i].v * 100}%` }} /><em>View {i + 1}</em></div>)}</div>
            <p>{CHECKS[0].text}</p>
          </div>
          <div className="tz-check-pane" data-pane="feature">
            <div className="tz-view tz-view-main"><img src={media('media/story/view2-rgb.webp')} alt="" loading="lazy" /><i style={{ left: `${views[1].u * 100}%`, top: `${views[1].v * 100}%` }} /><em>View 2</em></div>
            <div className="tz-patches">{views.map((_, i) => <figure key={i}><img src={media(`media/story/view${i + 1}-patch.webp`)} alt="" loading="lazy" /><figcaption>View {i + 1}</figcaption></figure>)}</div>
            <p>{CHECKS[1].text}</p>
          </div>
          <div className="tz-check-pane" data-pane="scale">
            <div className="tz-view tz-view-main"><img src={media('media/story/view2-rgb.webp')} alt="" loading="lazy" /><div className="tz-grid">{Array.from({ length: 16 }, (_, i) => <span key={i} style={{ '--i': i } as React.CSSProperties} />)}</div><em>View 2</em></div>
            <div className="tz-view-row">{[0, 2].map(i => <div key={i} className="tz-view"><img src={media(`media/story/view${i + 1}-depth.webp`)} alt="" loading="lazy" /><div className="tz-grid">{Array.from({ length: 16 }, (_, i) => <span key={i} style={{ '--i': i } as React.CSSProperties} />)}</div><em>View {i + 1}</em></div>)}</div>
            <p>{CHECKS[2].text}</p>
          </div>
          <div className="tz-check-pane" data-pane="recon">
            <div className="tz-view tz-view-main"><img src={media('media/story/heldout-gt.webp')} alt="" loading="lazy" /><em>Target view</em></div>
            <div className="tz-view tz-view-main"><img src={media('media/story/heldout-render.webp')} alt="" loading="lazy" /><em>Rendered from the reconstruction</em></div>
            <p>{CHECKS[3].text}</p>
          </div>
        </div>
      </div>
    </div>
    <div className="tz-steps" aria-label="Evaluation steps">
      {NODES.map((n, i) => <button type="button" className="tz-step" key={n.id} style={{ '--c': n.color } as React.CSSProperties}>
        <b><i /><em className="lbl">{sub(n.label)}</em></b><span>{String(i + 1).padStart(2, '0')} · {sub(n.sub)}</span><em className="fill" />
      </button>)}
    </div>
    <div className="tz-ctrl"><span>Click a step, card or layer to explore</span><button type="button" className="tz-play" aria-pressed="false">Pause</button><button type="button" className="tz-replay">Replay</button></div>
  </div>;
}
