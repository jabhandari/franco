import React from 'react';
import { Flag, Footprints, Tent, Trees } from 'lucide-react';
import type { ExpeditionProgress } from '../../types';

type Props = { step: number; trail: ExpeditionProgress['trail']; complete: boolean; place: string; children?: React.ReactNode };

const places = ['Trailhead', 'Orchard', 'Village', 'Market', 'River', 'Forest', 'Bridge', 'Highland', 'Cloudline', 'Summit'];
const desktop = [[75, 425], [190, 365], [295, 410], [395, 305], [505, 335], [605, 240], [715, 275], [805, 175], [910, 205], [1005, 95]];
const mobile = [[95, 1020], [240, 925], [130, 825], [275, 725], [125, 620], [265, 515], [130, 420], [270, 315], [160, 220], [295, 105]];

function curve(from: number[], to: number[]) {
  const middleX = (from[0] + to[0]) / 2;
  const middleY = (from[1] + to[1]) / 2;
  return `M ${from[0]} ${from[1]} Q ${middleX} ${middleY - 44} ${to[0]} ${to[1]}`;
}

function Scene({ points, step, trail, complete, id, focused }: { points: number[][]; step: number; trail: ExpeditionProgress['trail']; complete: boolean; id: string; focused?: boolean }) {
  const mobileFocus = points[Math.min(step, 9)][1] / 1120 * 100;
  return <svg className={`expedition-landscape expedition-landscape-${id}`} viewBox={id === 'wide' ? '0 0 1080 510' : '0 0 400 1120'} preserveAspectRatio="xMidYMid meet" aria-hidden="true" style={focused ? { transform: `translateY(-${mobileFocus}%)` } : undefined}>
    <defs>
      <linearGradient id={`expedition-sky-${id}`} x2="0" y2="1"><stop stopColor="#b8e8e2"/><stop offset=".52" stopColor="#e6edcf"/><stop offset="1" stopColor="#f7d7a8"/></linearGradient>
      <linearGradient id={`expedition-hill-${id}`} x2="0" y2="1"><stop stopColor="#7ab69d"/><stop offset="1" stopColor="#4c947c"/></linearGradient>
      <linearGradient id={`expedition-river-${id}`} x2="1" y2="1"><stop stopColor="#56b8c4"/><stop offset=".5" stopColor="#8de3df"/><stop offset="1" stopColor="#3c9eae"/></linearGradient>
      <linearGradient id={`expedition-ridge-${id}`} x2="0" y2="1"><stop stopColor="#8baab5"/><stop offset="1" stopColor="#456c82"/></linearGradient>
    </defs>
    <rect width={id === 'wide' ? 1080 : 400} height={id === 'wide' ? 510 : 1120} fill={`url(#expedition-sky-${id})`}/>
    <circle cx={id === 'wide' ? 865 : 320} cy={id === 'wide' ? 85 : 83} r="43" fill="#ffdf91" className="expedition-sun-glow"/>
    {id === 'wide' ? <>
      <path d="M0 254 Q140 155 300 235 T570 202 T860 168 T1080 200 V510 H0Z" fill="#a5c9b1"/>
      <path d="M0 340 Q140 270 285 328 T555 280 T825 262 T1080 250 V510 H0Z" fill={`url(#expedition-hill-${id})`}/>
      <path d="M0 470 Q180 380 360 425 T720 375 T1080 365 V510 H0Z" fill="#417c72"/>
      <path d="M477 0 Q512 160 466 250 T508 510" stroke={`url(#expedition-river-${id})`} strokeWidth="35" fill="none" opacity=".9"/>
      <path d="M478 0 Q511 158 465 250 T508 510" stroke="#d8f4ec" strokeWidth="5" fill="none" opacity=".85"/>
      <path d="M790 185 L925 20 L1050 186Z" fill={`url(#expedition-ridge-${id})`}/><path d="M857 101 L925 20 L996 103Z" fill="#e9f5e8"/>
      <path d="M0 282 Q150 218 298 282 M8 304 Q160 240 305 302 M730 224 Q850 185 1070 248" className="expedition-contour"/>
      {[60, 110, 160, 280, 320, 570, 630, 690, 755].map((x, index) => <g key={`tree-${x}`} transform={`translate(${x} ${index % 2 ? 250 : 280})`} className="expedition-scenery-tree"><ellipse cy="16" rx="14" ry="5" fill="#1e554b55"/><path d="M0 5V20" stroke="#725e48" strokeWidth="5"/><path d="M-15 8L0 -23 15 8Z"/><path d="M-12 -3L0 -30 12 -3Z"/></g>)}
      <g transform="translate(310 336)" className="expedition-scenery-house"><path d="M-22 0L0 -20 22 0V22H-22Z"/><path d="M-27 1L0 -26 27 1"/><rect x="-5" y="7" width="10" height="15"/></g>
      <g transform="translate(735 310)" className="expedition-scenery-bridge"><path d="M-37 0 Q0 -22 37 0"/><path d="M-31 0v14 M31 0v14"/></g>
    </> : <>
      <path d="M0 245 Q115 165 210 225 T400 185 V1120 H0Z" fill="#a5c9b1"/>
      <path d="M0 500 Q100 420 220 460 T400 415 V1120 H0Z" fill={`url(#expedition-hill-${id})`}/>
      <path d="M0 830 Q100 750 230 790 T400 740 V1120 H0Z" fill="#417c72"/>
      <path d="M0 640 Q170 615 400 650" stroke={`url(#expedition-river-${id})`} strokeWidth="35" fill="none" opacity=".9"/>
      <path d="M0 640 Q170 615 400 650" stroke="#d8f4ec" strokeWidth="5" fill="none" opacity=".85"/>
      <path d="M180 200 L290 32 L390 200Z" fill={`url(#expedition-ridge-${id})`}/><path d="M242 102 L290 32 L336 102Z" fill="#e9f5e8"/>
      {[60, 330, 40, 345, 70, 315, 65, 335].map((x, index) => <g key={`tree-${index}`} transform={`translate(${x} ${310 + index * 91})`} className="expedition-scenery-tree"><ellipse cy="16" rx="14" ry="5" fill="#1e554b55"/><path d="M0 5V20" stroke="#725e48" strokeWidth="5"/><path d="M-15 8L0 -23 15 8Z"/><path d="M-12 -3L0 -30 12 -3Z"/></g>)}
      <g transform="translate(112 808)" className="expedition-scenery-house"><path d="M-22 0L0 -20 22 0V22H-22Z"/><path d="M-27 1L0 -26 27 1"/><rect x="-5" y="7" width="10" height="15"/></g>
    </>}
    {points.slice(0, -1).map((point, index) => <path key={`path-${index}`} d={curve(point, points[index + 1])} className={`expedition-trail-line${index < step ? ' is-travelled' : ''}`}/>)}
    {points.map(([x, y], index) => {
      const mark = trail.find((item) => item.step === index + 1 && ['easy', 'hard', 'camp'].includes(item.kind));
      const current = index === Math.min(step, 9) && !complete;
      return <g key={places[index]} className={`expedition-landmark${current ? ' is-current' : ''}${index < step || complete && index === 9 ? ' is-visited' : ''}`} transform={`translate(${x} ${y})`}>
        {current && <circle r="32" className="expedition-current-halo"/>}
        <ellipse cy="19" rx="23" ry="8" className="expedition-landmark-shadow"/>
        <circle r="23" className="expedition-landmark-disc"/>
        {index === 9 ? <Flag x={-12} y={-12} width={24} height={24}/> : mark?.kind === 'camp' ? <Tent x={-11} y={-11} width={22} height={22}/> : index < step ? <Footprints x={-11} y={-11} width={22} height={22}/> : index === 5 ? <Trees x={-11} y={-11} width={22} height={22}/> : <text y="6" textAnchor="middle" className="expedition-landmark-number">{index + 1}</text>}
        <text y={index % 2 ? -35 : 46} textAnchor="middle" className="expedition-landmark-label">{places[index]}</text>
      </g>;
    })}
  </svg>;
}

export function ExpeditionMap({ step, trail, complete, place, children }: Props) {
  const [expanded, setExpanded] = React.useState(false);
  return <div className={`expedition-map${children ? ' has-encounter' : ''}${step >= 5 ? ' is-late' : ''}${expanded ? ' is-expanded' : ''}`} role="region" aria-label={`Expedition map: ${step} of 10 encounters completed. ${complete ? 'Journey complete.' : `Current location: ${place}.`}`}>
    <div className="expedition-map-top"><span>YOUR JOURNEY</span><span>{step} / 10 ENCOUNTERS</span><button type="button" className="expedition-map-expand" onClick={() => setExpanded(!expanded)}>{expanded ? 'Focus on me' : 'View full trail'}</button></div>
    <div className="expedition-map-stage">
      <div className="expedition-map-landscape-frame"><Scene points={desktop} step={step} trail={trail} complete={complete} id="wide"/><Scene points={mobile} step={step} trail={trail} complete={complete} id="mobile" focused={!expanded}/></div>
      {children && <div className="expedition-map-encounter">{children}</div>}
    </div>
    <div className="expedition-map-caption"><span><Footprints size={17}/> You are at <strong>{complete ? 'Journey’s end' : place}</strong></span><span><Flag size={17}/> Summit ahead</span></div>
  </div>;
}
