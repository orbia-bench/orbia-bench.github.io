import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { media } from '../lib/assets';
import './EvaluationStory.css';

type Point = [number, number];
type RegisteredEvent = { name: string; frame: number; time: number; index: number };
type TemporalWindow = { time: number; quality?: number | null; control?: number | null; geometry?: number | null };
export type EvaluationStoryData = {
  caseId: string; source: string; template: string;
  input: string; query: string; first: string; revisit: string; return: string; scene: string;
  depth?: string; depthLabel?: string; reconstruction?: string; render?: string; target?: string;
  trajectory: { points: Point[]; angles: number[]; events: RegisteredEvent[] };
  duration: number;
  protocols: { id: string; name: string; points: Point[]; angles: number[] }[];
  longExample?: { caseId: string; model: string; windows: TemporalWindow[] };
};
type Checkpoint = {
  id: string; title: string; detail: string; color: string; progress: number;
  image?: string; imageLabel?: string; time?: number; frame?: number; eventIndex?: number;
};
const GOLD = '#B58A38', GREEN = '#388F80', BLUE = '#2866A8';
const mapPoint = (point: Point): Point => [28 + point[0] * 284, 262 - point[1] * 224];
const pathData = (points: Point[]) => points.map((p, index) => `${index ? 'L' : 'M'}${mapPoint(p).join(',')}`).join(' ');
const prettyEvent = (name: string) => {
  const lower = name.toLowerCase().replace(/[_-]/g, ' ');
  if (lower.includes('first')) return 'first';
  if (lower.includes('revisit') || lower.includes('second')) return 'revisit';
  if (lower.includes('return') || lower.includes('end')) return 'return';
  if (lower.includes('query')) return 'query';
  if (lower.includes('input') || lower.includes('start')) return 'input';
  return lower;
};
const eventDetails: Record<string, { title: string; detail: string; color: string }> = {
  input: { title: 'Start with one image', detail: 'The input image anchors the world. An agent receives this image and a registered exploration trajectory.', color: GOLD },
  query: { title: 'Explore beyond the input', detail: 'A registered reference at a new viewpoint measures scene and anchor preservation. This reference image is used for evaluation; it is not a model input.', color: GOLD },
  first: { title: 'Discover a new region', detail: 'The model generates a region outside the initial view. Its first visit becomes the reference for generated-content persistence.', color: GREEN },
  revisit: { title: 'Does the discovery survive?', detail: 'Compare the first visit with a revisit to the same generated region. Appearance, depth, and surfaces should remain stable.', color: GREEN },
  return: { title: 'Come back to the beginning', detail: 'After exploration, compare the return with the input. Evaluate scene recovery, anchor appearance and geometry, and identity tracking along the route.', color: GOLD },
};

function ImageEvidence({ src, label, className = '' }: { src: string; label: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return <figure className={`es-evidence ${className}`}>
    {failed ? <div className="es-image-fallback">Image could not load.</div> : <img src={media(src)} alt={label} loading="lazy" onError={() => setFailed(true)} />}
    <figcaption>{label}</figcaption>
  </figure>;
}

function LongHorizonChart({ example }: { example: NonNullable<EvaluationStoryData['longExample']> }) {
  const windows = [...example.windows].filter(window => Number.isFinite(window.time)).sort((a, b) => a.time - b.time);
  const maxTime = Math.max(1, ...windows.map(window => window.time));
  const series = [
    { key: 'quality', name: 'Quality', color: '#8b68ad' },
    { key: 'control', name: 'Control', color: GOLD },
    { key: 'geometry', name: 'Geometry', color: BLUE },
  ] as const;
  const x = (time: number) => 44 + (time / maxTime) * 490;
  const y = (value: number) => 166 - value * 1.25;
  return <figure className="es-temporal-chart">
    <div className="es-temporal-legend">{series.map(item => <span key={item.key} style={{ color: item.color }}><i />{item.name}</span>)}</div>
    <svg viewBox="0 0 560 206" role="img" aria-label={`Actual five-second window scores for ${example.model} on ${example.caseId}. Quality, control and geometry on a 0 to 100 scale; missing values create gaps.`}>
      {[0, 50, 100].map(tick => <g key={tick}><line x1="44" x2="534" y1={y(tick)} y2={y(tick)} stroke="#dce5ef" strokeDasharray={tick ? '3 5' : undefined} /><text x="31" y={y(tick) + 4} textAnchor="end" fill="#7d8fa3" fontSize="10">{tick}</text></g>)}
      {series.map(item => {
        let previousTime: number | null = null;
        const path = windows.map(window => {
          const value = window[item.key];
          if (typeof value !== 'number' || !Number.isFinite(value)) { previousTime = null; return ''; }
          const command = previousTime === null || window.time - previousTime > 5.1 ? 'M' : 'L';
          previousTime = window.time;
          return `${command}${x(window.time)},${y(value)}`;
        }).join(' ');
        return <g key={item.key}><path d={path} fill="none" stroke={item.color} strokeWidth="2.6" strokeLinejoin="round" />{windows.map((window, index) => typeof window[item.key] === 'number' && Number.isFinite(window[item.key]) ? <circle key={index} cx={x(window.time)} cy={y(window[item.key] as number)} r="2.5" fill={item.color} /> : null)}</g>;
      })}
      {[0, Math.round(maxTime / 2), maxTime].map((time, index) => <text key={index} x={x(time)} y="190" fill="#7d8fa3" fontSize="10" textAnchor={index === 0 ? 'start' : index === 2 ? 'end' : 'middle'}>{time.toFixed(0)}s</text>)}
    </svg>
    <figcaption><strong>{example.model}</strong> · {example.caseId}<span>Separate long-horizon case · five-second windows</span></figcaption>
  </figure>;
}

function ReconstructionProtocol() {
  return <div className="es-reconstruction-protocol" role="img" aria-label="Conceptual reconstruction protocol: sampled views, cross-view matches, 3D reconstruction, then held-out rendering. These icons illustrate the evaluation process, not model-generated geometry.">
    <h5>Reconstruction protocol <span>Conceptual</span></h5>
    <div className="es-reconstruction-steps">
      <div><svg viewBox="0 0 76 58" aria-hidden="true"><path d="M8 13L25 7V43L8 49ZM28 9H47V47H28ZM50 7L68 13V49L50 43Z" fill="#edf3fa" stroke="currentColor" strokeWidth="1.5" /><path d="M12 37L17 26L21 34M32 34L38 22L43 35M54 34L60 25L64 37" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg><span>Sampled views</span></div>
      <div><svg viewBox="0 0 76 58" aria-hidden="true"><rect x="3" y="10" width="23" height="37" rx="2" fill="#edf3fa" stroke="currentColor" strokeWidth="1.5" /><rect x="50" y="10" width="23" height="37" rx="2" fill="#edf3fa" stroke="currentColor" strokeWidth="1.5" /><path d="M18 19L58 23M13 31L63 34M19 42L59 41" fill="none" stroke="currentColor" strokeWidth="1" opacity=".6" />{[[18,19],[58,23],[13,31],[63,34],[19,42],[59,41]].map(([cx,cy],index)=><circle key={index} cx={cx} cy={cy} r="2.3" fill="currentColor" />)}</svg><span>Cross-view matches</span></div>
      <div><svg viewBox="0 0 76 58" aria-hidden="true"><g className="es-reconstruction-cube"><path d="M38 4L61 17V42L38 55L15 42V17ZM15 17L38 30L61 17M38 30V55" fill="#edf3fa" stroke="currentColor" strokeWidth="1.5" /><path d="M38 4V30M15 42L38 30L61 42" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" opacity=".55" />{[[38,4],[61,17],[61,42],[38,55],[15,42],[15,17],[38,30]].map(([cx,cy],index)=><circle key={index} cx={cx} cy={cy} r="1.7" fill="currentColor" />)}</g></svg><span>3D reconstruction</span></div>
      <div><svg viewBox="0 0 76 58" aria-hidden="true"><rect x="8" y="10" width="39" height="32" rx="2" fill="#edf3fa" stroke="currentColor" strokeWidth="1.5" /><path d="M13 34L25 19L30 29L37 23L42 35" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M53 22L70 15V43L53 36Z" fill="#edf3fa" stroke="currentColor" strokeWidth="1.5" /><path d="M49 27H53M49 32H53" stroke="currentColor" strokeWidth="1" /></svg><span>Held-out rendering</span></div>
    </div>
  </div>;
}

export default function EvaluationStory({ story }: { story: EvaluationStoryData }) {
  const journeyRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const manualScrollRef = useRef<{ progress: number; reached: boolean } | null>(null);
  const [progress, setProgress] = useState(0);
  const [compact, setCompact] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [protocol, setProtocol] = useState(-1);
  const [protocolProgress, setProtocolProgress] = useState(0);
  const [protocolPlaying, setProtocolPlaying] = useState(false);
  const [playbackRun, setPlaybackRun] = useState(0);
  const [manualCheckpoint, setManualCheckpoint] = useState<number | null>(null);
  const checkpoints = useMemo<Checkpoint[]>(() => {
    const registered = [...story.trajectory.events].sort((a, b) => a.time - b.time);
    const items = registered.flatMap(event => {
      const id = prettyEvent(event.name), meta = eventDetails[id];
      if (!meta) return [];
      return [{ ...meta, id, progress: Math.max(0, Math.min(.72, event.time / Math.max(story.duration, .01) * .72)), image: story[id as 'input' | 'query' | 'first' | 'revisit' | 'return'], time: event.time, frame: event.frame, eventIndex: event.index }];
    });
    if (!items.some(item => item.id === 'input')) items.unshift({ ...eventDetails.input, id: 'input', image: story.input, progress: 0, time: 0, frame: 0, eventIndex: 0 });
    return [...items, {
      id: 'self', title: 'Do the views describe one world?', color: BLUE, progress: .81,
      detail: 'Across sampled viewpoints, evaluate correspondences, depth, and scale. Reconstruct the generated scene, then test whether it renders consistently at held-out viewpoints.',
      image: story.reconstruction || story.depth,
      imageLabel: story.reconstruction ? 'Generated-scene reconstruction' : story.depthLabel || 'Estimated depth',
    }, {
      id: 'long', title: 'Keep exploring. Keep remembering.', color: BLUE, progress: .94,
      detail: 'Minute-long trajectories repeat exploration and revisits. Five-second windows reveal how control, quality, and consistency change as the rollout grows.',
    }];
  }, [story]);
  const activeIndex = manualCheckpoint ?? Math.max(0, checkpoints.findLastIndex(point => progress + .0001 >= point.progress));
  const active = checkpoints[activeIndex] || checkpoints[0];
  const currentProtocol = protocol >= 0 ? story.protocols[protocol] : null;
  const points = currentProtocol?.points || story.trajectory.points;
  const angles = currentProtocol?.angles || story.trajectory.angles;
  const pathProgress = currentProtocol ? protocolProgress : manualCheckpoint !== null && active.eventIndex !== undefined
    ? active.eventIndex / Math.max(1, points.length - 1) : Math.min(1, progress / .72);
  const sampleIndex = Math.min(points.length - 1, Math.max(0, pathProgress * (points.length - 1)));
  const lowerSample = Math.floor(sampleIndex), upperSample = Math.min(points.length - 1, lowerSample + 1);
  const fraction = sampleIndex - lowerSample;
  const p0 = points[lowerSample] || [0.5, .5], p1 = points[upperSample] || p0;
  const camera = mapPoint([p0[0] + (p1[0] - p0[0]) * fraction, p0[1] + (p1[1] - p0[1]) * fraction]);
  const cameraAngle = (angles[lowerSample] || 0) * 180 / Math.PI;
  const routeMarkers = useMemo(() => {
    const groups: { point: Point; names: string[]; color: string }[] = [];
    for (const event of story.trajectory.events) {
      const point = mapPoint(story.trajectory.points[Math.min(story.trajectory.points.length - 1, Math.max(0, event.index))] || [.5, .5]);
      const key = prettyEvent(event.name), name = key === 'first' ? 'First' : key[0]?.toUpperCase() + key.slice(1);
      const match = groups.find(group => Math.hypot(group.point[0] - point[0], group.point[1] - point[1]) < 2);
      if (match) { if (!match.names.includes(name)) match.names.push(name); }
      else groups.push({ point, names: [name], color: eventDetails[key]?.color || BLUE });
    }
    return groups;
  }, [story]);

  useEffect(() => {
    const small = window.matchMedia('(max-width: 800px)');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { setCompact(small.matches); setReduced(motion.matches); };
    update(); small.addEventListener('change', update); motion.addEventListener('change', update);
    return () => { small.removeEventListener('change', update); motion.removeEventListener('change', update); };
  }, []);
  useEffect(() => {
    if (compact || reduced || !journeyRef.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const releaseSelection = () => { manualScrollRef.current = null; setManualCheckpoint(null); };
    const releaseOnKey = (event: KeyboardEvent) => { if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) releaseSelection(); };
    window.addEventListener('wheel', releaseSelection, { passive: true });
    window.addEventListener('touchstart', releaseSelection, { passive: true });
    window.addEventListener('keydown', releaseOnKey);
    window.addEventListener('pointerdown', releaseSelection);
    const context = gsap.context(() => {
      triggerRef.current = ScrollTrigger.create({
        trigger: journeyRef.current, start: 'top 90px', end: 'bottom bottom',
        onUpdate: trigger => {
          setProgress(trigger.progress);
          const selection = manualScrollRef.current;
          if (selection && Math.abs(trigger.progress - selection.progress) < .0005) { selection.reached = true; return; }
          if (selection && !selection.reached) return;
          releaseSelection();
        },
      });
    }, journeyRef);
    return () => {
      context.revert(); triggerRef.current = null; manualScrollRef.current = null;
      window.removeEventListener('wheel', releaseSelection); window.removeEventListener('touchstart', releaseSelection);
      window.removeEventListener('keydown', releaseOnKey); window.removeEventListener('pointerdown', releaseSelection);
    };
  }, [compact, reduced]);
  useEffect(() => {
    if (!protocolPlaying || reduced || protocol < 0) return;
    let handle = 0; const start = performance.now();
    const tick = (time: number) => {
      const elapsed = (time - start) / 6500;
      setProtocolProgress(Math.min(1, elapsed));
      if (elapsed < 1) handle = requestAnimationFrame(tick); else setProtocolPlaying(false);
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [protocolPlaying, protocol, reduced, playbackRun]);
  const jumpTo = (index: number) => {
    setProtocol(-1); setProtocolPlaying(false); setManualCheckpoint(index);
    setProgress(checkpoints[index].progress);
    if (!compact && !reduced && triggerRef.current) {
      const trigger = triggerRef.current;
      manualScrollRef.current = { progress: checkpoints[index].progress, reached: Math.abs(trigger.progress - checkpoints[index].progress) < .0005 };
      window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * checkpoints[index].progress, behavior: 'smooth' });
    }
  };
  const replayProtocol = () => { setProtocolProgress(reduced ? 1 : 0); setProtocolPlaying(!reduced); setPlaybackRun(run => run + 1); };
  const chooseProtocol = (index: number) => { setProtocol(index); replayProtocol(); };
  return <section className={`evaluation-story ${compact || reduced ? 'es-static' : ''}`} id="evaluation-story" aria-labelledby="evaluation-heading">
    <div className="es-introduction">
      <h2 id="evaluation-heading">A world should remember<br />where you have been.</h2>
      <p>Explore, discover, revisit. ORBIA turns a camera journey into a test of three-dimensional consistency.</p>
      <div className="es-dimension-key">
        <span style={{ '--metric-color': GOLD } as React.CSSProperties}>Input preservation</span>
        <span style={{ '--metric-color': GREEN } as React.CSSProperties}>Generated-content persistence</span>
        <span style={{ '--metric-color': BLUE } as React.CSSProperties}>3D self-consistency</span>
      </div>
    </div>
    <div ref={journeyRef} className="es-journey">
      <div className="es-sticky">
        <div className="es-stage" style={{ '--stage-color': active.color } as React.CSSProperties}>
          <div className="es-narrative">
            <div className="es-stage-position">{active.time !== undefined ? `t = ${active.time.toFixed(1)} s` : active.id === 'self' ? 'Across viewpoints' : 'Long-horizon evaluation'}<span>{activeIndex + 1} / {checkpoints.length}</span></div>
            <h3>{active.title}</h3>
            <p>{active.detail}</p>
            <nav className="es-checkpoints" aria-label="Evaluation checkpoints">
              {checkpoints.map((point, index) => <button key={`${point.id}-${index}`} className={index === activeIndex ? 'is-active' : ''} onClick={() => jumpTo(index)} aria-current={index === activeIndex ? 'step' : undefined} style={{ '--point-color': point.color } as React.CSSProperties}>
                <span className="es-checkpoint-dot" /><span>{eventDetails[point.id] ? point.id === 'first' ? 'First visit' : point.id === 'revisit' ? 'Revisit' : point.id[0].toUpperCase() + point.id.slice(1) : point.id === 'self' ? '3D self-consistency' : 'Temporal stability'}</span>
                {point.time !== undefined && <small>{point.time.toFixed(1)}s</small>}
              </button>)}
            </nav>
          </div>
          <div className="es-exhibit">
            <div className="es-scene"><img src={media(story.scene)} alt="Illustrative scene from the paper's Fig.1 evaluation schematic" loading="lazy" /><span>Fig.1 · evaluation schematic</span></div>
            <div className="es-route-panel">
              <div className="es-route-heading"><span>{currentProtocol ? currentProtocol.name : 'Registered exploration path'}</span><span className="es-path-control">{currentProtocol && !reduced ? <button onClick={replayProtocol}>Replay path</button> : 'Ground plane'}</span></div>
              <svg viewBox="0 0 340 300" role="img" aria-label={`Camera positions in ground-plane coordinates for ${currentProtocol?.name || story.template}`}>
                <defs><pattern id="es-grid" width="34" height="30" patternUnits="userSpaceOnUse"><path d="M 34 0 L 0 0 0 30" fill="none" stroke="#dbe4ee" strokeWidth=".6" /></pattern></defs>
                <rect x="0" y="0" width="340" height="300" fill="url(#es-grid)" />
                <path d={pathData(points)} fill="none" stroke="#b9c5d3" strokeWidth="2" strokeLinecap="round" />
                <path d={pathData(points)} fill="none" stroke={currentProtocol ? BLUE : active.color} strokeWidth="3.4" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - Math.max(0, pathProgress)} />
                {!currentProtocol && routeMarkers.map((marker, index) => {
                  const { point, names, color } = marker;
                  return <g key={`marker-${index}`}><circle cx={point[0]} cy={point[1]} r="5" fill="white" stroke={color} strokeWidth="2" /><text x={point[0] > 225 ? point[0] - 9 : point[0] + 9} y={point[1] - 9} textAnchor={point[0] > 225 ? 'end' : 'start'} fontSize="10" fill="#33445b">{names.join(' / ')}</text></g>;
                })}
                <g transform={`translate(${camera[0]} ${camera[1]}) rotate(${cameraAngle})`}><circle r="12" fill={active.color} opacity=".12" /><path d="M 0 -10 L 6 6 L 0 3 L -6 6 Z" fill={active.color} stroke="white" strokeWidth="1.5" /></g>
                <text x="12" y="288" fontSize="9" fill="#7c8d9e">x</text><text x="7" y="14" fontSize="9" fill="#7c8d9e">z</text>
              </svg>
              <p>Identity tracked along the route.<br /><span>Cross-view consistency evaluated throughout.</span></p>
            </div>
            <div className="es-frame-orbit">
              {(['input', 'query', 'first', 'revisit', 'return'] as const).map(key => {
                const index = checkpoints.findIndex(point => point.id === key);
                const point = checkpoints[index];
                return <button key={key} className={`es-frame es-frame-${key} ${active.id === key ? 'is-active' : ''} ${point && progress >= point.progress ? 'is-visited' : ''}`} onClick={() => index >= 0 && jumpTo(index)} aria-label={`Inspect ${key === 'first' ? 'first visit' : key} frame`} style={{ '--frame-color': eventDetails[key].color } as React.CSSProperties}>
                  <img src={media(story[key])} alt={`${key === 'first' ? 'First visit' : key === 'revisit' ? 'Revisit' : key[0].toUpperCase() + key.slice(1)} ${key === 'input' || key === 'query' ? 'reference' : 'generated'} frame`} loading="lazy" />
                  <span>{key === 'first' ? 'First visit' : key[0].toUpperCase() + key.slice(1)}<small>{key === 'input' ? 'Model input' : key === 'query' ? 'Evaluation reference' : 'Generated view'}</small></span>
                </button>;
              })}
            </div>
            <div className={`es-consistency-layer ${active.id === 'self' || active.id === 'long' ? 'is-visible' : ''}`} aria-hidden={active.id !== 'self' && active.id !== 'long'}>
              {active.id === 'self' ? <><h4>One geometry, many viewpoints</h4><div className="es-proof-grid">
                {story.depth && <ImageEvidence src={story.depth} label={story.depthLabel || 'Estimated depth'} />}
                {story.reconstruction && <ImageEvidence src={story.reconstruction} label="Generated-scene reconstruction" />}
                {story.render && <ImageEvidence src={story.render} label="Held-out rendered view" />}
                {story.target && <ImageEvidence src={story.target} label="Held-out target view" />}
                {!story.depth && !story.reconstruction && !story.render && <ImageEvidence src={story.scene} label="Views are evaluated for correspondence, depth, scale, and reconstruction consistency." />}
              </div><ReconstructionProtocol />{story.depthLabel && /reference/i.test(story.depthLabel) && <p className="es-proof-note">The depth example is a registered simulator reference. Generated held-out rendering evidence appears in the metric comparison below.</p>}</> : <><h4>Consistency over time</h4>{story.longExample?.windows.length ? <LongHorizonChart example={story.longExample} /> : <><div className="es-long-windows" aria-label="Five-second evaluation windows schematic">{Array.from({ length: 12 }, (_, index) => <span key={index}><i /><small>{index * 5}s</small></span>)}</div><small>Evaluation windows shown schematically; model scores appear below.</small></>}<p>Repeated exploration and revisits.<br />Control and visual quality are evaluated across the whole rollout.</p></>}
            </div>
          </div>
        </div>
        <div className="es-stage-caption"><span>{story.caseId} · {story.template}</span><p>Input and query are registered reference frames; the query is not given to the model. Generated first-visit, revisit, and return frames: SolarWM-H3.</p></div>
      </div>
    </div>
    <div className="es-static-notes">
      {checkpoints.map((point, index) => <article key={`note-${point.id}-${index}`} style={{ '--note-color': point.color } as React.CSSProperties}><h3>{point.title}</h3><p>{point.detail}</p>{point.image && <ImageEvidence src={point.image} label={point.imageLabel || (eventDetails[point.id] ? point.id === 'input' ? 'Input reference' : point.id === 'query' ? 'Query reference (evaluation only)' : 'Generated view · SolarWM-H3' : '3D consistency evidence')} />}{point.id === 'self' && <ReconstructionProtocol />}{point.id === 'self' && story.depthLabel && /reference/i.test(story.depthLabel) && <p>The depth example is a registered simulator reference. Generated held-out rendering evidence appears in the metric comparison below.</p>}{point.id === 'long' && story.longExample?.windows.length ? <LongHorizonChart example={story.longExample} /> : null}</article>)}
    </div>
    <div className="es-protocols">
      <div className="es-protocol-intro"><h3>Six ways to leave, and come back.</h3><p>Choose a trajectory to trace its registered camera path.</p></div>
      <div className="es-protocol-grid">{story.protocols.map((item, index) => <button key={item.id} className={protocol === index ? 'is-active' : ''} onClick={() => chooseProtocol(index)} aria-pressed={protocol === index}><svg viewBox="0 0 340 300" aria-hidden="true"><path d={pathData(item.points)} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />{[0, .5, 1].map((fraction, arrowIndex) => {
        const sample = Math.round((item.points.length - 1) * fraction), point = mapPoint(item.points[sample] || [.5, .5]);
        return <g key={arrowIndex} transform={`translate(${point[0]} ${point[1]}) rotate(${(item.angles[sample] || 0) * 180 / Math.PI})`} opacity={arrowIndex === 1 ? 1 : .5}><path d="M 0 -24 L 12 10 L 0 3 L -12 10 Z" fill="white" stroke="currentColor" strokeWidth="3" /></g>;
      })}<circle cx={mapPoint(item.points[0] || [.5, .5])[0]} cy={mapPoint(item.points[0] || [.5, .5])[1]} r="5" fill="currentColor" /></svg><span>{item.name}</span></button>)}</div>
      {currentProtocol && <div className="es-protocol-playback"><span>{currentProtocol.name}</span><svg viewBox="0 0 340 300" role="img" aria-label={`${currentProtocol.name} registered trajectory and camera heading`}><path d={pathData(points)} fill="none" stroke="#d9e2ed" strokeWidth="3" /><path d={pathData(points)} fill="none" stroke={BLUE} strokeWidth="5" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - protocolProgress} /><g transform={`translate(${camera[0]} ${camera[1]}) rotate(${cameraAngle})`}><circle r="15" fill={BLUE} opacity=".12" /><path d="M 0 -13 L 8 8 L 0 4 L -8 8 Z" fill={BLUE} stroke="white" strokeWidth="1.5" /></g></svg><button onClick={replayProtocol}>Replay path</button></div>}
    </div>
  </section>;
}
