import { useEffect, useRef, useState } from 'react';
import { asset } from '../lib/assets';
import './BenchmarkMethods.css';

const stages = [
  {title:'Reference selection', text:'Registered depth and camera poses identify input–query pairs that satisfy the motion constraints of each trajectory template.'},
  {title:'Anchor verification', text:'VLM proposals, segmentation and tracking identify the same landmark in both views. Depth reprojection verifies which surfaces are shared.'},
  {title:'Trajectory synthesis', text:'Trajectories connect the reference poses and return to the start. Geometry checks and separated revisits establish where newly generated content can be evaluated.'},
  {title:'Quality review', text:'Automatic quality ranking guides human review of images, masks, trajectories and revisit regions. Reviewers correct or reject cases before captioning and export.'},
];
const STEP_MS = 8500;
const img = (name: string) => asset(`assets/construction/${name}.webp`);
// Every step reproduces one panel of the paper figure in its own 893 x 555 coordinate frame.
const PW = 893, PH = 555;
type Rect = [number, number, number, number?];
const place = ([x, y, w, h]: Rect, d: number, extra: React.CSSProperties = {}) => ({
  left: `${x / PW * 100}%`, top: `${y / PH * 100}%`, width: `${w / PW * 100}%`, ...(h ? { height: `${h / PH * 100}%` } : {}), '--d': `${d}s`, ...extra,
} as React.CSSProperties);
function El({ r, d, cls = '', children }: { r: Rect; d: number; cls?: string; children?: React.ReactNode }) {
  return <div className={`cp-el ${cls}`} style={place(r, d)}>{children}</div>;
}
const Label = ({ x, y, d, children, align = 'center', cls = '' }: { x: number; y: number; d: number; children: React.ReactNode; align?: 'center' | 'left'; cls?: string }) =>
  <div className={`cp-el cp-label ${cls}`} style={{ ...place([x, y, 0], d), width: 'auto', transform: align === 'center' ? 'translateX(-50%)' : undefined, textAlign: align } as React.CSSProperties}>{children}</div>;
const Img = ({ src, mask, cls = '' }: { src: string; mask?: string; cls?: string }) =>
  <div className={`cp-img ${cls}`}><img src={src} alt="" loading="lazy" />{mask && <img className="cp-img-mask" src={mask} alt="" loading="lazy" />}</div>;
// Open-headed arrows, drawn in panel units; the head appears when the line is complete.
function Arrows({ list }: { list: [string, number][] }) {
  return <svg className="cp-svg" viewBox={`0 0 ${PW} ${PH}`} preserveAspectRatio="none" aria-hidden="true">
    <defs><marker id="cp-open" viewBox="0 0 12 12" refX="9" refY="6" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto"><path d="M2 1.5 L9.5 6 L2 10.5" /></marker></defs>
    {list.map(([d, delay], i) => <g key={i} style={{ '--d': `${delay}s` } as React.CSSProperties}><path className="cp-arrow" d={d} pathLength={1} /><path className="cp-arrow-head" d={d} markerEnd="url(#cp-open)" /></g>)}
  </svg>;
}
const Cam = ({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) =>
  <g transform={`translate(${x} ${y})${flip ? ' scale(-1 1)' : ''}`}><rect x="-13" y="-9" width="18" height="18" rx="2.5" /><circle cx="-4" cy="0" r="3" /><path d="M5 -5 L15 -10 L15 10 L5 5 Z" /></g>;
const TEMPLATES = ['M8 18 H52 M44 12 L52 18 L44 24 M52 30 H8 M16 24 L8 30 L16 36', 'M8 24 H52 M30 12 V36 M44 18 L52 24 L44 30', 'M10 32 Q30 6 50 32 M42 26 L50 32 L42 36', 'M8 28 Q30 8 52 28 Q30 40 8 28', 'M30 24 m-20 0 a20 11 0 1 0 40 0 a20 11 0 1 0 -40 0 M30 23 v2', 'M8 30 Q20 6 30 22 Q38 34 52 12 M45 13 L52 12 L51 19'];
const TEMPLATE_NAMES = ['Forward-back', 'Lateral', 'Yaw', 'Arc', 'Orbit', 'Peek-return'];

function StepScene({ stage }: { stage: number }) {
  if (stage === 0) return <>
    <Arrows list={[['M272 197 H304', .9], ['M474 197 H510', 2.4], ['M558 345 L490 370', 4.9], ['M318 412 H350', 4.6], ['M508 412 H545', 5.8]]} />
    <El r={[35, 122, 230]} d={0} cls="cp-stack">{['src-a', 'src-b', 'p0'].map(n => <Img key={n} src={img(n)} />)}</El>
    <Label x={147} y={278} d={.5}>Source video</Label>
    <El r={[322, 128, 146]} d={1.1} cls="cp-wipe"><Img src={img('p0')} /><Img cls="cp-wipe-top" src={img('depth')} /></El>
    <El r={[404, 222, 36]} d={1.8} cls="cp-icon"><svg viewBox="0 0 36 26"><Cam x={18} y={13} /></svg></El>
    <Label x={394} y={276} d={1.6}>Geometry estimation</Label>
    <Label x={394} y={314} d={1.9} cls="cp-tag">Pose + depth</Label>
    <El r={[530, 118, 315, 132]} d={2.6} cls="cp-pairs"><svg viewBox="0 0 315 132">
      <path className="cp-draw cp-thin" style={{ '--d': '2.7s' } as React.CSSProperties} d="M10 112 Q60 18 160 10 Q262 6 305 100" pathLength={1} />
      {[[10, 112], [44, 52], [100, 22], [160, 12], [222, 15], [272, 44], [305, 100]].map(([x, y], i) => <circle key={i} className="cp-dot" cx={x} cy={y} r={6} style={{ '--d': `${2.8 + i * .1}s` } as React.CSSProperties} />)}
      <path className="cp-pair" style={{ '--d': '3.6s' } as React.CSSProperties} d="M44 52 L272 44" pathLength={1} />
      <path className="cp-cone" style={{ '--d': '3.7s' } as React.CSSProperties} d="M44 52 L18 30 L8 52 Z" /><path className="cp-cone" style={{ '--d': '3.8s' } as React.CSSProperties} d="M272 44 L300 26 L306 52 Z" />
    </svg></El>
    <Label x={683} y={276} d={3}>Candidate pose pairs</Label>
    <Label x={35} y={354} d={3.9} align="left">Template constraints</Label>
    <El r={[20, 388, 293, 155]} d={4} cls="cp-templates">{TEMPLATES.map((d, i) => <span key={i}><svg viewBox="0 0 60 44"><path className="cp-draw" style={{ '--d': `${4.2 + i * .1}s` } as React.CSSProperties} d={d} pathLength={1} /></svg><em>{TEMPLATE_NAMES[i]}</em></span>)}</El>
    <El r={[372, 378, 104]} d={5} cls="cp-rank">{[100, 72, 58, 40].map((w, i) => <i key={i} style={{ '--w': `${w}%`, '--d': `${5.1 + i * .15}s` } as React.CSSProperties} />)}</El>
    <Label x={440} y={448} d={5.3}>Rank pairs</Label>
    <El r={[568, 370, 128]} d={6.1} cls="cp-pop"><Img src={img('p0')} /></El>
    <El r={[720, 370, 128]} d={6.3} cls="cp-pop"><Img src={img('pq')} /></El>
    <Label x={632} y={452} d={6.2} cls="cp-math">P<sub>0</sub></Label><Label x={784} y={452} d={6.4} cls="cp-math">P<sub>q</sub></Label>
  </>;
  if (stage === 1) return <>
    <Arrows list={[['M210 183 H246', .8], ['M386 183 H424', 2.4], ['M800 286 V340 H66 V380', 4], ['M300 438 H336', 5.4], ['M478 438 H506', 5.9]]} />
    <El r={[30, 126, 170]} d={0} cls="cp-stack cp-stack-2"><Img src={img('p0')} /><Img src={img('pq')} /></El>
    <Label x={80} y={258} d={.4} cls="cp-math">P<sub>0</sub></Label><Label x={150} y={258} d={.5} cls="cp-math">P<sub>q</sub></Label>
    <El r={[290, 130, 74, 96]} d={1.1} cls="cp-doc"><i /><i /><i /></El>
    <Label x={327} y={238} d={1.4}>VLM proposals</Label>
    <Label x={327} y={272} d={1.6} cls="cp-quote"><span className="cp-type" style={{ '--d': '1.8s' } as React.CSSProperties}>“stone guardian”</span></Label>
    <El r={[440, 128, 182]} d={2.6}><Img src={img('p0')} mask={img('p0-mask')} /></El>
    <El r={[664, 128, 182]} d={2.9}><Img src={img('pq')} mask={img('pq-mask')} /></El>
    <Arrows list={[['M624 178 H660', 3.2]]} />
    <Label x={646} y={250} d={3.3}>SAM3 segment &amp; track</Label>
    <El r={[38, 384, 250, 92]} d={4.4} cls="cp-reproj"><svg viewBox="0 0 250 92">
      <Cam x={20} y={46} /><Cam x={230} y={46} flip />
      <path className="cp-draw cp-thin" style={{ '--d': '4.6s' } as React.CSSProperties} d="M36 46 L100 8 M36 46 L100 84 M214 46 L150 10 M214 46 L150 82" pathLength={1} />
      <path className="cp-plane" style={{ '--d': '4.9s' } as React.CSSProperties} d="M100 8 L150 16 L150 78 L100 86 Z" />
    </svg></El>
    <Label x={163} y={486} d={4.8}>Depth reprojection</Label>
    <El r={[340, 372, 62]} d={5.6} cls="cp-pop cp-portrait"><Img src={img('anchor-p0')} /></El>
    <El r={[410, 372, 62]} d={5.8} cls="cp-pop cp-portrait"><Img src={img('anchor-pq')} /></El>
    <Label x={520} y={392} d={6.1} align="left">Cross-view verification</Label>
    <El r={[520, 432, 300]} d={6.4} cls="cp-badges"><span style={{ '--d': '6.5s' } as React.CSSProperties}>Identity</span><span style={{ '--d': '6.7s' } as React.CSSProperties}>Mask integrity</span><span style={{ '--d': '6.9s' } as React.CSSProperties}>Shared surfaces</span></El>
  </>;
  if (stage === 2) return <>
    <Arrows list={[['M244 168 H286', .9], ['M526 168 H566', 2.6], ['M718 330 V372 H303 V402', 4.2], ['M458 478 H500', 5.6]]} />
    <El r={[33, 112, 200]} d={0} cls="cp-stack cp-stack-2"><Img src={img('p0')} /><Img src={img('pq')} /></El>
    <Label x={92} y={258} d={.4} cls="cp-math">P<sub>0</sub></Label><Label x={164} y={258} d={.5} cls="cp-math">P<sub>q</sub></Label>
    <El r={[302, 100, 218, 140]} d={1.1} cls="cp-plot"><svg viewBox="0 0 218 140">
      {[28, 56, 84, 112].map(y => <path key={y} className="cp-gridline" d={`M0 ${y} H218`} />)}{[36, 72, 108, 144, 180].map(x => <path key={x} className="cp-gridline" d={`M${x} 0 V140`} />)}
      <path className="cp-draw cp-route" style={{ '--d': '1.4s' } as React.CSSProperties} d="M40 116 Q109 -26 178 116" pathLength={1} />
      <circle cx="40" cy="116" r="6" className="cp-pt" /><circle cx="178" cy="116" r="6" className="cp-pt" />
      <text x="40" y="136" textAnchor="middle">P<tspan dy="3" fontSize="9">0</tspan></text><text x="178" y="136" textAnchor="middle">P<tspan dy="3" fontSize="9">q</tspan></text>
      <circle r="5.5" className="cp-traveller" cx="40" cy="116"><animateMotion dur="2.4s" begin="2.4s" repeatCount="indefinite" path="M0 0 Q69 -142 138 0" /></circle>
    </svg></El>
    <Label x={411} y={250} d={1.8}>Template-guided</Label><Label x={411} y={284} d={1.9}>trajectory planning</Label>
    <El r={[588, 98, 258]} d={2.9} cls="cp-scan"><Img src={img('depth')} /><i /></El>
    <Label x={716} y={250} d={3.3}>Geometry checks</Label>
    <Label x={716} y={288} d={3.5} cls="cp-tag">Collision + clearance</Label>
    <Label x={37} y={384} d={4.6} align="left">Annotate revisits</Label>
    <El r={[33, 418, 416, 120]} d={4.7} cls="cp-card cp-revisit"><svg viewBox="0 0 416 120">
      <g className="cp-camfade" style={{ '--d': '4.9s' } as React.CSSProperties}><Cam x={40} y={52} /><path className="cp-cone2" d="M58 52 L96 30 L96 74 Z" /></g>
      <path className="cp-draw cp-dashed" style={{ '--d': '5.1s' } as React.CSSProperties} d="M120 44 Q208 0 296 44" pathLength={1} />
      <text x="208" y="62" textAnchor="middle" className="cp-small">exploration</text>
      <g className="cp-camfade" style={{ '--d': '5.4s' } as React.CSSProperties}><Cam x={322} y={52} /><path className="cp-cone2" d="M340 52 L378 30 L378 74 Z" /></g>
      <text x="62" y="108" textAnchor="middle">First visit</text><text x="346" y="108" textAnchor="middle">Later revisit</text>
    </svg></El>
    <El r={[513, 418, 342, 120]} d={5.8} cls="cp-card cp-extend">
      <b>Extend to 60 s</b>
      <div className="cp-timeline"><span />{[18, 38, 58, 78, 98].map((x, i) => <i key={x} style={{ left: `${x}%`, '--d': `${6.3 + i * .15}s` } as React.CSSProperties} />)}</div>
      <small>Add revisit pairs</small>
    </El>
  </>;
  return <>
    <Arrows list={[['M306 196 H346', 1.8], ['M608 196 H646', 3.4]]} />
    <El r={[30, 104, 270, 178]} d={0} cls="cp-card cp-scores">{[['Image', 92], ['Anchor', 78], ['Motion', 86], ['Revisit', 52]].map(([k, w], i) => <div key={k}><span>{k}</span><i style={{ '--w': `${w}%`, '--d': `${.4 + i * .25}s` } as React.CSSProperties} /></div>)}</El>
    <Label x={165} y={300} d={.8}>Automatic scoring</Label>
    <El r={[358, 110, 246]} d={2} cls="cp-curate"><Img src={img('curated')} /><span className="cp-stamp" style={{ '--d': '2.9s' } as React.CSSProperties}><svg viewBox="0 0 24 24"><path d="M5 12.5 L10 17 L19 7" /></svg></span></El>
    <Label x={481} y={300} d={2.4}>Human curation</Label>
    <El r={[660, 104, 206, 178]} d={3.6} cls="cp-card cp-caption"><Img src={img('p0')} /><div><i style={{ '--d': '4s' } as React.CSSProperties} /><i style={{ '--d': '4.2s' } as React.CSSProperties} /><i style={{ '--d': '4.4s' } as React.CSSProperties} /></div></El>
    <Label x={763} y={300} d={3.9}>VLM caption</Label>
    <El r={[30, 402, 832, 110]} d={5} cls="cp-card cp-export"><Img src={img('caption-thumb')} cls="cp-portrait" /><div><strong>Selected anchor + scene description</strong><p className="cp-type cp-type-long" style={{ '--d': '5.5s' } as React.CSSProperties}>“A grand architectural scene features a large, ornate red building…”</p></div></El>
  </>;
}

export function ConstructionPipeline() {
  const [stage,setStage]=useState(0),[playing,setPlaying]=useState(false),[overview,setOverview]=useState(false);
  const root=useRef<HTMLDivElement>(null);
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
    setPlaying(!preference.matches);
    const onChange=()=>{if(preference.matches)setPlaying(false)};
    preference.addEventListener('change',onChange);
    const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{threshold:.25});
    if(root.current)observer.observe(root.current);
    return()=>{observer.disconnect();preference.removeEventListener('change',onChange)};
  },[]);
  useEffect(()=>{
    if(!playing||!visible||overview)return;
    const timer=window.setTimeout(()=>setStage(old=>(old+1)%4),STEP_MS);
    return()=>window.clearTimeout(timer);
  },[playing,visible,overview,stage]);
  return <div className="bm-construction" ref={root}>
    <div className="bm-pipeline-tools"><span /><div><button onClick={()=>setOverview(old=>!old)}>{overview?'Animated steps':'Full figure'}</button><button onClick={()=>{setOverview(false);setPlaying(old=>!old)}} aria-label={playing?'Pause construction animation':'Play construction animation'}>{playing?'Pause':'Play'}</button></div></div>
    <div className={`bm-pipeline ${overview?'bm-pipeline-overview':''}`}>
      {overview?<img className="bm-full-figure" src={asset('assets/construction/figure2.png')} alt="Figure 2: reference selection, anchor verification, trajectory synthesis and quality review" loading="lazy"/>
        :<div className={`cp-canvas cp-step-${stage} ${visible?'cp-live':''} ${playing?'':'cp-hold'}`} role="img" aria-label={`Construction step ${stage+1}: ${stages[stage].title}`}>
          <div className="cp-title"><span>{stage+1}</span>{['Geometry-guided reference selection','Anchor discovery & verification','Trajectory synthesis & revisit design','Quality assessment & curation'][stage]}</div>
          <div className="cp-body" key={`${stage}-${visible}`}><StepScene stage={stage}/></div>
          <span key={`p${stage}-${playing}-${visible}`} className={`bm-stage-progress ${playing&&visible?'is-playing':''}`} />
        </div>}
      <div className="bm-stage-list bm-stage-tabs" aria-label="Construction stages">{stages.map((item,index)=><button key={item.title} aria-pressed={stage===index&&!overview} onClick={()=>{setStage(index);setOverview(false);setPlaying(false)}}><span className="bm-step-number">{index+1}</span><span><strong>{item.title}</strong><span className="bm-stage-description">{item.text}</span></span></button>)}</div>
    </div>
  </div>;
}
