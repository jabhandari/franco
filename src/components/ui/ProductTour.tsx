import React from 'react';
import { ArrowRight, BookOpen, Flame, Gamepad2, Headphones, Map, Mic, Sparkles } from 'lucide-react';

const slides = [
  { id: 'today', tab: 'Your day', eyebrow: '01 / YOUR SPACE', title: 'A little French, every day.', description: 'Pick up a lesson, keep your streak alive, and see what is next.' },
  { id: 'learn', tab: 'Lessons', eyebrow: '02 / FOLLOW YOUR PATH', title: 'Make progress you can see.', description: 'Short lessons and practice across all four skills.' },
  { id: 'play', tab: 'Play', eyebrow: '03 / PLAY TO LEARN', title: 'Your next great run starts here.', description: 'Give French Rush a go and beat your best score.' },
];

export function ProductTour() {
  const [active, setActive] = React.useState(0);
  const slide = slides[active];
  return <div className="product-tour">
    <div className="product-tour-stage" aria-label={`${slide.tab} preview`}>
      {slide.id === 'today' && <div className="tour-screen tour-today">
        <div className="tour-screen-top"><span className="tour-brand">fr</span><span>FRANCO / TODAY PREVIEW</span><span className="tour-avatar">S</span></div>
        <div className="tour-screen-title">Bonjour, learner <span>✳</span></div>
        <div className="tour-today-grid"><div className="tour-feature-card"><span className="tour-icon"><BookOpen size={18}/></span><small>YOUR NEXT STEP</small><strong>One more lesson?</strong><span className="tour-mini-cta">Let's learn <ArrowRight size={13}/></span></div><div className="tour-streak-card"><Flame size={22}/><strong>3</strong><span>day streak</span></div></div>
        <div className="tour-mini-cards"><span><Headphones size={16}/> Listen</span><span><Mic size={16}/> Speak</span><span><Sparkles size={16}/> Practice</span></div>
      </div>}
      {slide.id === 'learn' && <div className="tour-screen tour-learn">
        <div className="tour-screen-top"><span className="tour-brand">fr</span><span>FRANCO / LEARN PREVIEW</span><span className="tour-avatar">S</span></div>
        <div className="tour-screen-title">Your French path <span>✳</span></div>
        <div className="tour-path"><span className="tour-path-node done"><BookOpen size={19}/></span><span className="tour-path-line"/><span className="tour-path-node current"><Sparkles size={20}/></span><span className="tour-path-line"/><span className="tour-path-node"><Map size={19}/></span></div>
        <div className="tour-lesson-card"><small>UP NEXT · A1</small><strong>Everyday conversations</strong><span>Little steps add up.</span></div>
      </div>}
      {slide.id === 'play' && <div className="tour-screen tour-play">
        <div className="tour-screen-top"><span className="tour-brand">fr</span><span>FRANCO / PUZZLES PREVIEW</span><span className="tour-avatar">S</span></div>
        <div className="tour-screen-title">Play your way forward <span>✳</span></div>
        <div className="tour-game-card"><span className="tour-game-icon"><Gamepad2 size={28}/></span><small>QUICK THINKING, BIG STREAKS</small><strong>French Rush</strong><span>How far can you go?</span><span className="tour-mini-cta">Play a round <ArrowRight size={13}/></span></div>
      </div>}
    </div>
    <div className="product-tour-copy" aria-live="polite">
      <span className="product-tour-eyebrow">{slide.eyebrow}</span>
      <h2>{slide.title}</h2>
      <p>{slide.description}</p>
    </div>
    <div className="product-tour-tabs" role="group" aria-label="Preview Franco">
      {slides.map((item, index) => <button key={item.id} type="button" aria-pressed={active === index} onClick={() => setActive(index)}><span>0{index + 1}</span>{item.tab}</button>)}
    </div>
  </div>;
}
