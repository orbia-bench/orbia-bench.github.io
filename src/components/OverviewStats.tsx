import { useEffect, useRef, useState } from 'react';
import { tiers } from '../data/tiers';
import { asset } from '../lib/assets';
import './OverviewStats.css';

const METRICS: string[][] = [
  ['Translation accuracy', 'Rotation accuracy', 'Move accuracy', 'Look accuracy'],
  ['Aesthetic quality', 'Imaging quality', 'Temporal flickering', 'Motion smoothness', 'Human preference'],
  ['Scene appearance fidelity', 'Anchor appearance fidelity', 'Scene geometry fidelity', 'Anchor geometry fidelity', 'Anchor identity consistency'],
  ['Revisit appearance consistency', 'Revisit depth consistency', 'Revisit surface agreement'],
  ['Cross-view depth consistency', 'Cross-view feature consistency', 'Regional scale agreement', 'Held-out reconstruction'],
  ['Quality over time', 'Control over time', 'Geometry over time'],
];
const SOURCES = [
  { name: 'SpatialVID', kind: 'Public video', short: 134, long: 74 },
  { name: 'ScanNet++', kind: 'Indoor RGB-D', short: 60, long: 0 },
  { name: 'Sekai', kind: 'Public video', short: 25, long: 25 },
  { name: 'MiraData', kind: 'Public video', short: 21, long: 21 },
  { name: 'Self-recorded', kind: 'Our recordings', short: 60, long: 30 },
  { name: 'Unreal Engine', kind: 'Simulation', short: 180, long: 90 },
];
const EFFORT = [
  { label: 'Public datasets', from: 110406, fromUnit: 'videos and scenes screened', to: 240, toUnit: 'cases kept' },
  { label: 'Unreal Engine', from: 365, fromUnit: 'videos rendered in 48 environments', to: 180, toUnit: 'cases kept' },
  { label: 'Self-recorded', from: 85, fromUnit: 'videos recorded', to: 60, toUnit: 'cases kept' },
];

const ORG: Record<string, string> = { 'SolarWM-H3': 'cuhksz', Lyra2: 'nvidia', EVOKE: 'alaya', 'Echo-WM': 'jd', Gen3C: 'nvidia', 'Matrix game 3.5': 'skywork', AlayaWorld: 'alaya',
  'LingBot-World v2': 'robbyant', 'HY-WorldPlay': 'tencent', 'SANA-WM': 'nvidia', Voyager: 'tencent', 'LingBot-World v1': 'robbyant', 'Cosmos3-Nano': 'nvidia', 'DreamX-World': 'amap',
  FantasyWorld: 'amap', Astra: 'tsinghua', 'ABot-World': 'amap', Genie3: 'deepmind', HappyOyster: 'alibaba', 'Seedance2.5': 'bytedance', 'Kling3.0': 'kuaishou', 'Cosmos3-Super': 'nvidia',
  'HunyuanVideo1.5': 'tencent', 'MiniMax-H3': 'minimax', 'LTX2.5': 'lightricks', 'Wan2.7': 'alibaba', LongCat: 'meituan' };
const INTERFACES = [
  { id: 'Camera', title: 'Camera-conditioned', text: 'Requested poses are converted to each model’s camera convention, with intrinsics rescaled to its resolution. Long routes run in overlapping windows.', chips: ['OpenCV → model axes', 'Intrinsics rescaled', 'Windowed rollout'] },
  { id: 'Action', title: 'Action-conditioned', text: 'The smoothed route becomes W A S D movement and I J K L look keys, with turning speed calibrated for each model.', chips: ['Waypoint smoothing', 'Key per block', 'Turn calibration'] },
  { id: 'Text', title: 'Image + text to video', text: 'The route is described as timed motion phases appended to the scene caption, split to match each generation window.', chips: ['Timed phases', 'Native frame clock', 'Per-window prompts'] },
];
const KEYS = ['W', 'A', 'S', 'D', 'I', 'J', 'K', 'L'];

function AdapterVisual({ id }: { id: string }) {
  if (id === 'Camera') return <svg className="ov-ad-visual ov-ad-cam" viewBox="0 0 220 96" aria-hidden="true">
    <path className="ov-ad-route" d="M18 78 C40 20 110 6 150 30 S206 76 196 84" />
    {[0, 1, 2].map(i => <g key={i} className="ov-ad-frustum" style={{ '--i': i } as React.CSSProperties}>
      <path d="M0 0 L20 -9 L20 9 Z" /><circle r="3" />
      <animateMotion dur="4.5s" begin={`${i * -1.5}s`} repeatCount="indefinite" rotate="auto" path="M18 78 C40 20 110 6 150 30 S206 76 196 84" />
    </g>)}
  </svg>;
  if (id === 'Action') return <div className="ov-ad-visual ov-ad-keys" aria-hidden="true">
    {[['', 'W', ''], ['A', 'S', 'D']].map((row, r) => <div key={r}>{row.map((k, i) => k ? <kbd key={k} style={{ '--k': KEYS.indexOf(k) } as React.CSSProperties}>{k}</kbd> : <span key={i} />)}</div>)}
    {[['', 'I', ''], ['J', 'K', 'L']].map((row, r) => <div key={`l${r}`} className="ov-ad-look">{row.map((k, i) => k ? <kbd key={k} style={{ '--k': KEYS.indexOf(k) } as React.CSSProperties}>{k}</kbd> : <span key={i} />)}</div>)}
  </div>;
  return <div className="ov-ad-visual ov-ad-text" aria-hidden="true">
    <p><b>0–3 s</b> Move forward along the path</p><p><b>3–6 s</b> Turn left by about 60°</p><p><b>6–9 s</b> Return to the starting view</p>
  </div>;
}

function Icon({ k }: { k: number }) {
  const icons = [
    <><path className="ov-ic-dash" d="M4 26 Q14 6 28 12" /><path d="M24 7 L30 11 L25 16" /><circle cx="4" cy="26" r="2.4" /></>,
    <><path className="ov-ic-star" d="M16 4 L18.5 13.5 L28 16 L18.5 18.5 L16 28 L13.5 18.5 L4 16 L13.5 13.5 Z" /><circle className="ov-ic-twinkle" cx="26" cy="6" r="1.6" /></>,
    <><rect x="4" y="7" width="24" height="18" rx="2.5" /><path className="ov-ic-anchor" d="M12 21 L15 13 L20 15 L21 21 Z" /></>,
    <><g className="ov-ic-spin"><path d="M8 12 A9 9 0 0 1 24 10" /><path d="M24 20 A9 9 0 0 1 8 22" /><path d="M21 6 L24 10 L19.5 11.5" /><path d="M11 26 L8 22 L12.5 20.5" /></g></>,
    <><g className="ov-ic-cube"><path d="M16 4 L27 10 L27 22 L16 28 L5 22 L5 10 Z" /><path d="M5 10 L16 16 L27 10 M16 16 V28" /></g></>,
    <><path d="M3 22 H29" /><rect className="ov-ic-window" x="4" y="12" width="8" height="8" rx="1.5" /><path d="M8 26 v-3 M16 26 v-3 M24 26 v-3" /></>,
  ];
  return <svg className="ov-icon" viewBox="0 0 32 32" aria-hidden="true">{icons[k]}</svg>;
}

function Count({ to, run }: { to: number; run: boolean }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) { setV(0); return; }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(to); return; }
    let raf = 0; const t0 = performance.now();
    const tick = (now: number) => { const u = Math.min(1, (now - t0) / 1100); setV(Math.round(to * (1 - (1 - u) ** 3))); if (u < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [to, run]);
  return <>{v.toLocaleString('en-US')}</>;
}

type Row = { name: string; interface: string };
export default function OverviewStats({ rows = [] }: { rows?: Row[] }) {
  const [open, setOpen] = useState<'cases' | 'dims' | 'models' | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) panel.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [open]);
  const total = SOURCES.reduce((s, x) => s + x.short + x.long, 0);
  const toggle = (k: 'cases' | 'dims' | 'models') => setOpen(o => o === k ? null : k);
  return <div className="ov">
    <div className="benchmark-stats ov-cards" aria-label="Benchmark at a glance">
      <button type="button" className="ov-card ov-more" aria-expanded={open === 'cases'} aria-controls="ov-panel" onClick={() => toggle('cases')}>
        <strong>720</strong><span>Exploration cases</span><small>480 short + 240 minute-long</small><em>Data composition</em>
      </button>
      <a className="ov-card" href="#protocols"><strong>6</strong><span>Trajectory protocols</span><small>Explore · Revisit · Return</small><em>See protocols</em></a>
      <button type="button" className="ov-card ov-more" aria-expanded={open === 'models'} aria-controls="ov-panel" onClick={() => toggle('models')}>
        <strong>27</strong><span>Evaluated models</span><small>Camera, action and text interfaces</small><em>How each model runs</em>
      </button>
      <button type="button" className="ov-card ov-more" aria-expanded={open === 'dims'} aria-controls="ov-panel" onClick={() => toggle('dims')}>
        <strong>6</strong><span>Evaluation dimensions</span><small>Three for 3D consistency</small><em>All metrics</em>
      </button>
    </div>
    <div id="ov-panel" ref={panel} className={`ov-panel ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className="ov-panel-inner">
        {open === 'cases' && <div className="ov-cases" key="cases">
          <section className="ov-composition">
            <h3>Where the 720 cases come from</h3>
            <div className="ov-bars">{SOURCES.map((s, i) => <div key={s.name} className="ov-bar" style={{ '--i': i } as React.CSSProperties}>
              <span className="ov-bar-name"><b>{s.name}</b><small>{s.kind}</small></span>
              <span className="ov-bar-track"><i className="ov-short" style={{ '--w': `${s.short / 270 * 100}%` } as React.CSSProperties} /><i className="ov-long" style={{ '--w': `${s.long / 270 * 100}%` } as React.CSSProperties} /></span>
              <span className="ov-bar-n">{s.short}{s.long ? <small> + {s.long}</small> : null}</span>
            </div>)}</div>
            <p className="ov-legend"><i className="ov-short" /> short (22 s) <i className="ov-long" /> minute-long extension · {total} cases</p>
          </section>
          <section className="ov-effort">
            <h3>Curation effort</h3>
            {EFFORT.map((e, i) => <div key={e.label} className="ov-funnel" style={{ '--i': i } as React.CSSProperties}>
              <small>{e.label}</small>
              <div><b><Count to={e.from} run={open === 'cases'} /></b><span>{e.fromUnit}</span></div>
              <svg viewBox="0 0 40 12" aria-hidden="true"><path d="M2 6 H34 M30 2 L36 6 L30 10" /></svg>
              <div><b className="ov-kept"><Count to={e.to} run={open === 'cases'} /></b><span>{e.toUnit}</span></div>
            </div>)}
            <div className="ov-hours"><b>300+</b><span>hours of annotation and manual curation, with 856 verified anchors</span></div>
          </section>
        </div>}
        {open === 'models' && <div className="ov-models" key="models">
          <div className="ov-flow"><span><b>Shared input</b>Image · caption · camera route</span><i /><span><b>Adapter</b>Converted to each model’s interface</span><i /><span><b>Rollout</b>357 or 961 frames for evaluation</span></div>
          <div className="ov-adapters">{INTERFACES.map((f, i) => { const models = rows.filter(r => r.interface === f.id); return <article key={f.id} className="ov-adapter" style={{ '--i': i } as React.CSSProperties}>
            <header><h4>{f.title}</h4><b>{models.length}</b></header>
            <AdapterVisual id={f.id} />
            <p>{f.text}</p>
            <div className="ov-ad-chips">{f.chips.map(c => <span key={c}>{c}</span>)}</div>
            <ul className="ov-ad-models">{models.map(m => <li key={m.name}>{ORG[m.name] && <img src={asset(`assets/models/${ORG[m.name]}.png`)} alt="" loading="lazy" />}{m.name}</li>)}</ul>
          </article>; })}</div>
        </div>}
        {open === 'dims' && <div className="ov-dims" key="dims">
          {tiers.map((t, i) => <article key={t.id} className="ov-dim" style={{ '--c': t.color, '--i': i } as React.CSSProperties}>
            <header><Icon k={i} /><div><small>T{t.id} · {t.weight}% of Overall</small><h4>{t.name}</h4></div></header>
            <ul>{METRICS[i].map(m => <li key={m}>{m}</li>)}</ul>
          </article>)}
        </div>}
      </div>
    </div>
  </div>;
}
