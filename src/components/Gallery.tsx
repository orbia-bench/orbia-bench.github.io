import {useEffect,useMemo,useRef,useState} from 'react';
import {X,Expand,Route} from 'lucide-react';
import {media} from '../lib/assets';
import './Gallery.css';
import CameraPath from './CameraPath';

type References={q0Rgb:string;qeRgb:string;q0Depth:string;qeDepth:string};
type Item={caseId:string;source:string;template:string;environment:string;prompt:string;image:string;hasLong:boolean;paperFigure10?:boolean;references:References;trajectory:{points:number[][];angles:number[]}};
type Layer='RGB and depth'|'RGB'|'Depth';
function Path({item}:{item:Item}){return <CameraPath trajectory={item.trajectory} template={item.template} className="gallery-path" label={`${item.template} camera path and sampled headings`}/>;}
export default function Gallery({items}:{items:Item[]}){
 const [limit,setLimit]=useState(12),[source,setSource]=useState('All'),[template,setTemplate]=useState('All'),[environment,setEnvironment]=useState('All'),[opened,setOpened]=useState<Item|null>(null),[failed,setFailed]=useState<string[]>([]),[layer,setLayer]=useState<Layer>('RGB and depth');
 const dialog=useRef<HTMLDialogElement>(null),close=useRef<HTMLButtonElement>(null),trigger=useRef<HTMLElement|null>(null);
 const ordered=useMemo(()=>items,[items]);
 const filtered=ordered.filter(i=>(source==='All'||i.source===source)&&(template==='All'||i.template===template)&&(environment==='All'||i.environment===environment));
 useEffect(()=>{if(opened&&dialog.current){dialog.current.showModal();close.current?.focus();const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old;dialog.current?.close();trigger.current?.focus()}}},[opened]);
 useEffect(()=>setLimit(12),[source,template,environment]);
 const reset=()=>{setLimit(12);setSource('All');setTemplate('All');setEnvironment('All')};
 return <div className="gallery-panel">
  <div className="gallery-tools"><div className="gallery-filters">
   <label>Source<select value={source} onChange={e=>setSource(e.target.value)}><option value="All">All sources</option>{[...new Set(items.map(i=>i.source))].sort().map(s=><option key={s}>{s}</option>)}</select></label>
   <label>Trajectory<select value={template} onChange={e=>setTemplate(e.target.value)}><option value="All">All protocols</option>{[...new Set(items.map(i=>i.template))].sort().map(t=><option key={t}>{t}</option>)}</select></label>
   <label>Environment<select value={environment} onChange={e=>setEnvironment(e.target.value)}><option value="All">All scenes</option><option>Indoor</option><option>Outdoor</option></select></label>
  </div><span>{Math.min(limit,filtered.length)} of {filtered.length} scenes</span></div>
  <div className="gallery-grid">{filtered.slice(0,limit).map(item=><button key={item.caseId} className="gallery-card" onClick={event=>{trigger.current=event.currentTarget;setLayer('RGB and depth');setOpened(item)}} aria-label={`Open scene: ${item.prompt}`}><div className="gallery-image">{failed.includes(item.caseId)?<div className="gallery-image-error">Image unavailable</div>:<img src={media(item.image)} alt={item.prompt} loading="lazy" decoding="async" onError={()=>setFailed(old=>[...old,item.caseId])}/>}<span className="gallery-expand"><Expand size={15}/></span></div><div className="gallery-caption"><strong>{item.template}</strong><small>{item.source} · {item.environment}</small></div></button>)}</div>
  {filtered.length>12&&<div className="gallery-more">{filtered.length>limit&&<button onClick={()=>setLimit(old=>old+12)}>Explore more scenes</button>}{limit>12&&<button onClick={()=>{setLimit(12);document.getElementById('gallery')?.scrollIntoView({block:'start'})}}>Show fewer scenes</button>}</div>}
  {filtered.length===0&&<div className="gallery-empty"><p>No scenes match these filters.</p><button onClick={reset}>Reset filters</button></div>}
  <dialog ref={dialog} className="gallery-dialog" aria-labelledby="gallery-dialog-title" onKeyDown={e=>{if(e.key!=='Tab')return;const nodes=[...e.currentTarget.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(node=>node.offsetParent!==null);if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}} onCancel={e=>{e.preventDefault();setOpened(null)}} onClick={e=>{if(e.target===e.currentTarget)setOpened(null)}}>
   {opened&&<div className="gallery-modal">
    <button ref={close} className="gallery-close" onClick={()=>setOpened(null)} aria-label="Close scene"><X size={22}/></button>
    <div className="gallery-reference-tools" role="group" aria-label="Reference image layers">{(['RGB and depth','RGB','Depth'] as const).map(value=><button key={value} aria-pressed={layer===value} onClick={()=>setLayer(value)}>{value}</button>)}</div>
    <div className="gallery-reference-grid">{[
      {key:'q0Rgb',label:'Input RGB',depth:false},
      {key:'qeRgb',label:'Query RGB',depth:false},
      {key:'q0Depth',label:'Input depth',depth:true},
      {key:'qeDepth',label:'Query depth',depth:true},
    ].filter(view=>layer==='RGB and depth'||(layer==='Depth')===view.depth).map(view=><figure key={view.key}><figcaption>{view.label}</figcaption><img src={media(opened.references[view.key as keyof References])} alt={`${view.label}: ${opened.prompt}`}/></figure>)}</div>
    <p className="gallery-reference-note">Query RGB and both depth maps are evaluator-only references.</p>
    <div className="gallery-modalinfo"><div><h3 id="gallery-dialog-title">{opened.template} scene</h3><p>{opened.prompt}</p><dl><div><dt>Source</dt><dd>{opened.source}</dd></div><div><dt>Environment</dt><dd>{opened.environment}</dd></div><div><dt>Protocol</dt><dd>{opened.template}</dd></div></dl></div><div className="gallery-pathinfo"><span><Route size={14}/>Camera trajectory</span><Path item={opened}/></div></div>
   </div>}
  </dialog>
 </div>;
}
