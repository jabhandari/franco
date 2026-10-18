import React from 'react';
import { Flag, Flame, Footprints, Heart, Tent, Trees, Trophy } from 'lucide-react';
import type { ExpeditionProgress } from '../../types';

type Props = {
  step: number;
  trail: ExpeditionProgress['trail'];
  complete: boolean;
  place: string;
  score: number;
  livesLeft: number;
  livesTotal: number;
  combo: number;
  timeOfDay: 'day' | 'dusk' | 'night';
  result: 'correct' | 'wrong' | null;
  resultKey: number;
  summit: boolean;
  children?: React.ReactNode;
  sheet?: React.ReactNode;
};

const places = ['Trailhead', 'Orchard', 'Village', 'Market', 'River', 'Forest', 'Bridge', 'Highland', 'Cloudline', 'Summit'];
const desktop = [[75, 425], [190, 365], [295, 410], [395, 305], [505, 335], [605, 240], [715, 275], [805, 175], [910, 205], [1005, 95]];
const mobile = [[95, 1020], [240, 925], [130, 825], [275, 725], [125, 620], [265, 515], [130, 420], [270, 315], [160, 220], [295, 105]];

// Fake-3D: the board is a tilted plane. Terrain is drawn squashed by TILT
// about the vertical center; markers are counter-squashed so they stand
// upright like pins on a tabletop map. Pure 2D SVG — no CSS 3D, no JS
// projection, works on every mobile browser.
const TILT = 0.68;
const UNTILT = 1 / TILT;
const projectY = (y: number, cy: number) => cy + (y - cy) * TILT;

const STARS: [number, number, number][] = [
  [8, 12, 0], [18, 28, 1.2], [27, 8, 0.6], [36, 22, 1.8], [45, 10, 0.3], [54, 26, 1.5],
  [63, 12, 0.9], [72, 30, 0.2], [81, 14, 1.1], [90, 24, 1.7], [12, 38, 0.8], [30, 44, 1.4],
  [50, 38, 0.5], [68, 44, 1.9], [86, 38, 0.7], [22, 18, 1.3], [58, 18, 0.1], [76, 8, 1.6],
  [94, 34, 0.4], [40, 34, 1.0],
];
const FIREFLIES: [number, number, number][] = [
  [15, 62, 0], [32, 70, 1.4], [55, 64, 2.2], [70, 72, 0.8], [85, 60, 1.8], [45, 76, 2.8],
];

function curve(from: number[], to: number[]) {
  const middleX = (from[0] + to[0]) / 2;
  const middleY = (from[1] + to[1]) / 2;
  return `M ${from[0]} ${from[1]} Q ${middleX} ${middleY - 44} ${to[0]} ${to[1]}`;
}

// CSS custom properties (--pa, --drift) drive the petal/confetti animations.
// React.CSSProperties does not declare custom properties, so this helper types
// them explicitly instead of asserting at each style prop.
function cssVars(vars: React.CSSProperties & Record<`--${string}`, string>): React.CSSProperties {
  return vars;
}

function BoardScene({ points, cy, viewBox, id, step, trail, complete, result, resultKey }: {
  points: number[][]; cy: number; viewBox: string; id: string;
  step: number; trail: ExpeditionProgress['trail']; complete: boolean;
  result: 'correct' | 'wrong' | null; resultKey: number;
}) {
  const tilt = `translate(0 ${cy}) scale(1 ${TILT}) translate(0 ${-cy})`;
  const at = Math.min(step, 9);
  const [tx, ty] = points[at];
  const tpy = projectY(ty, cy);
  return <svg className={`expedition-board expedition-board-${id}`} viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <defs>
      <linearGradient id={`expedition-hill-${id}`} x2="0" y2="1"><stop stopColor="#7ab69d" /><stop offset="1" stopColor="#4c947c" /></linearGradient>
      <linearGradient id={`expedition-river-${id}`} x2="1" y2="1"><stop stopColor="#56b8c4" /><stop offset=".5" stopColor="#8de3df" /><stop offset="1" stopColor="#3c9eae" /></linearGradient>
      <linearGradient id={`expedition-ridge-${id}`} x2="0" y2="1"><stop stopColor="#8baab5" /><stop offset="1" stopColor="#456c82" /></linearGradient>
      <linearGradient id={`expedition-nightwash-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1b2a5e" stopOpacity="0" /><stop offset="1" stopColor="#1b2a5e" stopOpacity=".85" /></linearGradient>
    </defs>
    <g transform={tilt}>
      {id === 'wide' ? <>
        <path d="M0 254 Q140 155 300 235 T570 202 T860 168 T1080 200 V510 H0Z" fill="#a5c9b1" />
        <path d="M0 340 Q140 270 285 328 T555 280 T825 262 T1080 250 V510 H0Z" fill={`url(#expedition-hill-${id})`} />
        <path d="M0 470 Q180 380 360 425 T720 375 T1080 365 V510 H0Z" fill="#417c72" />
        <path d="M477 0 Q512 160 466 250 T508 510" stroke={`url(#expedition-river-${id})`} strokeWidth="35" fill="none" opacity=".9" />
        <path d="M478 0 Q511 158 465 250 T508 510" stroke="#d8f4ec" strokeWidth="5" fill="none" opacity=".85" className="expedition-river-flow" />
        <path d="M790 185 L925 20 L1050 186Z" fill={`url(#expedition-ridge-${id})`} /><path d="M857 101 L925 20 L996 103Z" fill="#e9f5e8" />
        <path d="M0 282 Q150 218 298 282 M8 304 Q160 240 305 302 M730 224 Q850 185 1070 248" className="expedition-contour" />
        {[60, 110, 160, 280, 320, 570, 630, 690, 755].map((x, index) => <g key={`tree-${x}`} transform={`translate(${x} ${index % 2 ? 250 : 280})`} className="expedition-scenery-tree"><ellipse cy="16" rx="14" ry="5" fill="#1e554b55" /><path d="M0 5V20" stroke="#725e48" strokeWidth="5" /><path d="M-15 8L0 -23 15 8Z" /><path d="M-12 -3L0 -30 12 -3Z" /></g>)}
        <g transform="translate(310 336)" className="expedition-scenery-house"><path d="M-22 0L0 -20 22 0V22H-22Z" /><path d="M-27 1L0 -26 27 1" /><rect x="-5" y="7" width="10" height="15" /></g>
        <g transform="translate(735 310)" className="expedition-scenery-bridge"><path d="M-37 0 Q0 -22 37 0" /><path d="M-31 0v14 M31 0v14" /></g>
      </> : <>
        <path d="M0 245 Q115 165 210 225 T400 185 V1120 H0Z" fill="#a5c9b1" />
        <path d="M0 500 Q100 420 220 460 T400 415 V1120 H0Z" fill={`url(#expedition-hill-${id})`} />
        <path d="M0 830 Q100 750 230 790 T400 740 V1120 H0Z" fill="#417c72" />
        <path d="M0 640 Q170 615 400 650" stroke={`url(#expedition-river-${id})`} strokeWidth="35" fill="none" opacity=".9" />
        <path d="M0 640 Q170 615 400 650" stroke="#d8f4ec" strokeWidth="5" fill="none" opacity=".85" className="expedition-river-flow" />
        <path d="M180 200 L290 32 L390 200Z" fill={`url(#expedition-ridge-${id})`} /><path d="M242 102 L290 32 L336 102Z" fill="#e9f5e8" />
        {[60, 330, 40, 345, 70, 315, 65, 335].map((x, index) => <g key={`tree-${index}`} transform={`translate(${x} ${310 + index * 91})`} className="expedition-scenery-tree"><ellipse cy="16" rx="14" ry="5" fill="#1e554b55" /><path d="M0 5V20" stroke="#725e48" strokeWidth="5" /><path d="M-15 8L0 -23 15 8Z" /><path d="M-12 -3L0 -30 12 -3Z" /></g>)}
        <g transform="translate(112 808)" className="expedition-scenery-house"><path d="M-22 0L0 -20 22 0V22H-22Z" /><path d="M-27 1L0 -26 27 1" /><rect x="-5" y="7" width="10" height="15" /></g>
      </>}
      {points.slice(0, -1).map((point, index) => <path key={`path-${index}`} d={curve(point, points[index + 1])} className={`expedition-trail-line${index < step ? ' is-travelled' : ''}`} />)}
      {points.map(([x, y]) => <ellipse key={`shadow-${x}-${y}`} cx={x} cy={y + 15} rx="24" ry="7" className="expedition-landmark-shadow" />)}
      <rect x={0} y={id === 'wide' ? 60 : 0} width={id === 'wide' ? 1080 : 400} height={id === 'wide' ? 370 : 1120} fill={`url(#expedition-nightwash-${id})`} className="expedition-night-wash" />
    </g>
    {id === 'wide' ? <g className="expedition-wildlife-sky" aria-hidden="true">
      {[0, 1, 2].map((bird) => <g key={`bird-${bird}`} opacity=".75">
        <animateMotion dur={`${24 + bird * 7}s`} begin={`${-bird * 9}s`} repeatCount="indefinite"
          path={`M -60 ${105 + bird * 18} Q 280 ${72 + bird * 10} 560 ${100 + bird * 14} T 1140 ${88 + bird * 12}`} />
        <path d="M0 0 q7 -7 14 0 q7 -7 14 0" className="expedition-bird" stroke="#3d5a54" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      </g>)}
    </g> : <g className="expedition-wildlife-sky" aria-hidden="true">
      {[0, 1].map((bird) => <g key={`bird-${bird}`} opacity=".75">
        <animateMotion dur={`${20 + bird * 8}s`} begin={`${-bird * 7}s`} repeatCount="indefinite"
          path={`M -40 ${120 + bird * 30} Q 180 ${90 + bird * 12} 440 ${115 + bird * 20}`} />
        <path d="M0 0 q7 -7 14 0 q7 -7 14 0" className="expedition-bird" stroke="#3d5a54" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      </g>)}
    </g>}
    <g transform={tilt} aria-hidden="true">
      {id === 'wide' ? <>
        <g transform="translate(310 336)"><rect x="9" y="-34" width="7" height="16" className="expedition-chimney" />
          {[0, 1, 2].map((puff) => <circle key={puff} cx="12" cy="-38" r="5" className="expedition-smoke" style={cssVars({ '--smoke-delay': `${puff * 1.4}s` })} />)}
        </g>
        <g transform="translate(185 395)"><g className="expedition-fox">
          <animateMotion dur="22s" repeatCount="indefinite" path="M 0 0 q 34 -14 68 0 t 68 0 t -68 0 t -68 0" />
          <ellipse cx="0" cy="0" rx="13" ry="7" className="expedition-fox-body" />
          <circle cx="11" cy="-5" r="6" className="expedition-fox-body" />
          <path d="M7 -9 L9 -15 L12 -10 Z M12 -10 L15 -15 L16 -9 Z" className="expedition-fox-ear" />
          <path d="M-12 -1 q -10 2 -14 8 q 8 1 14 -4" className="expedition-fox-tail" />
        </g></g>
        {[0, 1].map((npc) => <g key={`npc-${npc}`} transform={`translate(${npc ? 790 : 520} ${npc ? 330 : 360})`} opacity=".9">
          <g className="expedition-npc">
            <animateMotion dur={`${16 + npc * 5}s`} begin={`${-npc * 6}s`} repeatCount="indefinite"
              path={npc ? 'M 0 0 q 26 -10 52 0 t 52 0 t -52 0 t -52 0' : 'M 0 0 q -24 -8 -48 0 t -48 0 t 48 0 t 48 0'} />
            <g transform="scale(.62)">
              <rect x="-11" y="-36" width="22" height="28" rx="10" className="expedition-traveler-body" />
              <circle cx="0" cy="-42" r="10" className="expedition-traveler-head" />
              <path d="M-11 -45 L11 -45 L6 -57 L-6 -57 Z" className="expedition-traveler-hat" />
            </g>
          </g>
        </g>)}
        {[0, 1].map((fly) => <g key={`butterfly-${fly}`} transform={`translate(${fly ? 660 : 250} ${fly ? 285 : 305})`}>
          <g className="expedition-butterfly">
            <animateMotion dur={`${9 + fly * 3}s`} repeatCount="indefinite"
              path={fly ? 'M 0 0 q 18 -22 36 0 t 36 0 t -36 0 t -36 0' : 'M 0 0 q -16 -20 -32 0 t -32 0 t 32 0 t 32 0'} />
            <g className="expedition-butterfly-wings">
              <ellipse cx="-4" cy="0" rx="5" ry="7" className="expedition-butterfly-wing" />
              <ellipse cx="4" cy="0" rx="5" ry="7" className="expedition-butterfly-wing" />
              <rect x="-1" y="-6" width="2" height="12" rx="1" fill="#4a3728" />
            </g>
          </g>
        </g>)}
      </> : <>
        <g transform="translate(112 808)"><rect x="9" y="-34" width="7" height="16" className="expedition-chimney" />
          {[0, 1, 2].map((puff) => <circle key={puff} cx="12" cy="-38" r="5" className="expedition-smoke" style={cssVars({ '--smoke-delay': `${puff * 1.4}s` })} />)}
        </g>
        <g transform="translate(210 560)"><g className="expedition-fox">
          <animateMotion dur="20s" repeatCount="indefinite" path="M 0 0 q 26 -12 52 0 t 52 0 t -52 0 t -52 0" />
          <ellipse cx="0" cy="0" rx="13" ry="7" className="expedition-fox-body" />
          <circle cx="11" cy="-5" r="6" className="expedition-fox-body" />
          <path d="M7 -9 L9 -15 L12 -10 Z M12 -10 L15 -15 L16 -9 Z" className="expedition-fox-ear" />
          <path d="M-12 -1 q -10 2 -14 8 q 8 1 14 -4" className="expedition-fox-tail" />
        </g></g>
        <g transform="translate(300 700)"><g className="expedition-butterfly">
          <animateMotion dur="10s" repeatCount="indefinite" path="M 0 0 q 18 -22 36 0 t 36 0 t -36 0 t -36 0" />
          <g className="expedition-butterfly-wings">
            <ellipse cx="-4" cy="0" rx="5" ry="7" className="expedition-butterfly-wing" />
            <ellipse cx="4" cy="0" rx="5" ry="7" className="expedition-butterfly-wing" />
            <rect x="-1" y="-6" width="2" height="12" rx="1" fill="#4a3728" />
          </g>
        </g></g>
      </>}
    </g>
    {points.map(([x, y], index) => {
      const py = projectY(y, cy);
      const mark = trail.find((item) => item.step === index + 1 && ['easy', 'hard', 'camp'].includes(item.kind));
      const current = index === at && !complete;
      return <g key={places[index]} transform={`translate(${x} ${py})`}>
        <g transform={`scale(1 ${UNTILT})`} className={`expedition-marker${current ? ' is-current' : ''}${index < step || complete && index === 9 ? ' is-visited' : ''}`}>
          {current && <circle r="32" className="expedition-current-halo" />}
          <circle r="23" className="expedition-landmark-disc" />
          {index === 9 ? <Flag x={-12} y={-12} width={24} height={24} /> : mark?.kind === 'camp' ? <Tent x={-11} y={-11} width={22} height={22} /> : index < step ? <Footprints x={-11} y={-11} width={22} height={22} /> : index === 5 ? <Trees x={-11} y={-11} width={22} height={22} /> : <text y="6" textAnchor="middle" className="expedition-landmark-number">{index + 1}</text>}
          <text y={index % 2 ? -35 : 46} textAnchor="middle" className="expedition-landmark-label">{places[index]}</text>
        </g>
      </g>;
    })}
    {!complete && <g transform={`translate(${tx + 34} ${tpy + 8})`}>
      <ellipse cx="0" cy="12" rx="15" ry="5" className="expedition-traveler-shadow" />
      <g transform={`scale(1 ${UNTILT})`}>
        <g key={`traveler-${step}`} className="expedition-traveler">
          <rect x="-11" y="-36" width="22" height="28" rx="10" className="expedition-traveler-body" />
          <circle cx="0" cy="-42" r="10" className="expedition-traveler-head" />
          <path d="M-11 -45 L11 -45 L6 -57 L-6 -57 Z" className="expedition-traveler-hat" />
          <rect x="8" y="-32" width="9" height="18" rx="4.5" className="expedition-traveler-pack" />
          <circle cx="-4" cy="-42" r="1.6" className="expedition-traveler-eye" />
          <circle cx="4" cy="-42" r="1.6" className="expedition-traveler-eye" />
        </g>
        <g key={`puff-${step}`} className="expedition-dust">
          <circle cx="-14" cy="8" r="5" className="expedition-puff" />
          <circle cx="14" cy="9" r="4" className="expedition-puff expedition-puff-late" />
        </g>
      </g>
    </g>}
    {result === 'correct' && <g key={`petals-${resultKey}`} transform={`translate(${tx} ${tpy})`}>
      <g transform={`scale(1 ${UNTILT})`}>
        {Array.from({ length: 10 }).map((_, petal) => <circle key={petal} r="4.5" className="expedition-petal" style={cssVars({ '--pa': `${petal * 36}deg` })} />)}
      </g>
    </g>}
  </svg>;
}

export function ExpeditionMap({ step, trail, complete, place, score, livesLeft, livesTotal, combo, timeOfDay, result, resultKey, summit, children, sheet }: Props) {
  const [expanded, setExpanded] = React.useState(false);
  const mobileFocus = projectY(mobile[Math.min(step, 9)][1], 560) / 1120 * 100;
  return <div className={`expedition-map is-${timeOfDay}${step >= 5 ? ' is-late' : ''}${expanded ? ' is-expanded' : ''}${summit ? ' is-summit' : ''}`}
    role="region" aria-label={`Expedition map: ${step} of 10 encounters completed. ${complete ? 'Journey complete.' : `Current location: ${place}.`}`}>
    <div className="expedition-map-top"><span>YOUR JOURNEY</span><span>{step} / 10 ENCOUNTERS</span><button type="button" className="expedition-map-expand" onClick={() => setExpanded(!expanded)}>{expanded ? 'Focus on me' : 'View full trail'}</button></div>
    <div className={`expedition-map-stage${result === 'wrong' ? ' is-shaken' : ''}`} key={`stage-${resultKey}`}>
      <div className="expedition-map-landscape-frame">
        <div className="expedition-sky" aria-hidden="true">
          <div className="expedition-sun" />
          <div className="expedition-moon" />
          {STARS.map(([x, y, delay], index) => <span key={index} className="expedition-star" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}s` }} />)}
          <div className="expedition-cloud expedition-cloud-1" />
          <div className="expedition-cloud expedition-cloud-2" />
          <div className="expedition-cloud expedition-cloud-3" />
        </div>
        <BoardScene points={desktop} cy={255} viewBox="0 60 1080 370" id="wide" step={step} trail={trail} complete={complete} result={result} resultKey={resultKey} />
        <div className="expedition-board-mobile-wrap" style={expanded ? undefined : { transform: `translateY(-${mobileFocus}%)` }}>
          <BoardScene points={mobile} cy={560} viewBox="0 0 400 1120" id="mobile" step={step} trail={trail} complete={complete} result={result} resultKey={resultKey} />
        </div>
        {timeOfDay !== 'day' && <div className="expedition-fireflies" aria-hidden="true">
          {FIREFLIES.map(([x, y, delay], index) => <span key={index} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}s` }} />)}
        </div>}
        <div className="expedition-foreground" aria-hidden="true">
          {[4, 11, 19, 33, 47, 58, 71, 83, 92].map((x, index) => <i key={`g${index}`} className="fg-grass"
            style={cssVars({ left: `${x}%`, height: `${26 + (index * 13) % 30}px`, animationDelay: `${(index % 5) * .5}s` })} />)}
          {[16, 64, 88].map((x, index) => <i key={`r${index}`} className="fg-rock"
            style={{ left: `${x}%`, width: `${34 + index * 12}px`, height: `${20 + index * 7}px` }} />)}
        </div>
        <div className="expedition-hud">
          <div className="expedition-hud-chip" key={`score-${score}`}><Trophy size={15} /><strong>{score}</strong><span>PTS</span></div>
          {combo >= 2 && <div className="expedition-hud-chip is-combo"><Flame size={15} /><strong>×{combo >= 5 ? 3 : 2}</strong><span>COMBO {combo}</span></div>}
          <div className="expedition-hud-chip" role="img" aria-label={`${livesLeft} of ${livesTotal} lives left`}>
            {Array.from({ length: livesTotal }).map((_, index) => <Heart key={index} size={16} fill="currentColor" className={index >= livesLeft ? 'is-lost' : ''} />)}
          </div>
        </div>
        {summit && <div className="expedition-confetti" aria-hidden="true">
          {Array.from({ length: 26 }).map((_, index) => <i key={index} style={cssVars({ left: `${(index * 37) % 100}%`, animationDelay: `${(index % 9) * 0.18}s`, '--drift': `${((index * 53) % 60) - 30}px` })} />)}
        </div>}
      </div>
      {children && <div className="expedition-map-encounter">{children}</div>}
      {sheet && <div className="expedition-map-sheet">{sheet}</div>}
    </div>
    <div className="expedition-map-caption"><span><Footprints size={17} /> You are at <strong>{complete ? 'Journey’s end' : place}</strong></span><span><Flag size={17} /> Summit ahead</span></div>
  </div>;
}
