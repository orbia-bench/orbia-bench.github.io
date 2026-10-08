type Trajectory = { points: number[][]; angles: number[] };
type Props = { trajectory: Trajectory; template?: string; width?: number; height?: number; className?: string; label?: string };
export default function CameraPath({trajectory,template,width=300,height=160,className,label='Camera trajectory'}:Props){
  const {points,angles}=trajectory;
  if(!points.length)return null;
  const compact=width<160, yaw=template?.toLowerCase().includes('yaw');
  const scale=Math.min(width-30,height-25);
  const positions=points.map(([x,z])=>[width/2+(x-.5)*scale,height/2-(z-.5)*scale]);
  // Unwrap headings so rotations crossing ±π remain continuous.
  const headings:number[]=[];
  angles.forEach((angle,i)=>{const previous=headings[i-1]??angle;headings.push(previous+Math.atan2(Math.sin(angle-previous),Math.cos(angle-previous)))});
  const first=headings[0]??0;
  const turn=headings.reduce((best,a,i)=>Math.abs(a-first)>Math.abs((headings[best]??first)-first)?i:best,0);
  const samples=yaw?[0,Math.round(turn/2),turn]:[0,Math.round((points.length-1)/3),Math.round(2*(points.length-1)/3)];
  const radius=compact?24:48;
  const arc=Array.from({length:33},(_,i)=>{const angle=first+((headings[turn]??first)-first)*i/32;return [width/2+Math.sin(angle)*radius,height/2-Math.cos(angle)*radius]});
  return <svg className={className} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={yaw?'Yaw rotation at a fixed camera position':label}>
    <polyline points={(yaw?arc:positions).map(p=>p.join(',')).join(' ')} stroke="#2866a8" strokeWidth={compact?1.5:2.3} fill="none"/>
    {[...new Set(samples)].map((idx,i)=><g key={idx} transform={`translate(${yaw?width/2:positions[idx][0]} ${yaw?height/2:positions[idx][1]}) rotate(${(angles[idx]||0)*180/Math.PI})`} opacity={i===0?1:.55}>
      <path d={yaw?`M0 0V-${radius} M-4 -${radius-6}L0 -${radius}L4 -${radius-6}`:compact?'M0 -9V0 M-2 -6L0 -9L2 -6':'M0 -17V0 M-3 -12L0 -17L3 -12'} stroke={i===0?'#b58a38':'#2866a8'} strokeWidth={compact?1:1.6} fill="none"/>
    </g>)}
    <circle cx={yaw?width/2:positions[0][0]} cy={yaw?height/2:positions[0][1]} r={compact?3:4} fill="#b58a38"/>
  </svg>;
}
