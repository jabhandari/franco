import React from 'react';
import { ArrowRight, BookOpen, Check, Flame, Headphones, Heart, Mic, Pencil, Sparkles } from 'lucide-react';

export function WelcomeHighlights() {
  return <section className="welcome-highlights" id="discover" aria-labelledby="welcome-highlights-title">
    <div className="welcome-highlights-heading">
      <span className="welcome-section-kicker">A LITTLE OF EVERYTHING</span>
      <h2 id="welcome-highlights-title">Find your way into French.</h2>
      <p>Choose a lesson, practice a skill, or play a quick round. There is always a good place to start.</p>
    </div>
    <div className="welcome-highlights-grid">
      <article className="welcome-highlight welcome-highlight-learn">
        <span className="welcome-highlight-icon"><BookOpen size={23} aria-hidden="true" /></span>
        <span className="welcome-highlight-label">01 / LEARN</span>
        <h3>One small lesson leads to the next.</h3>
        <div className="welcome-mini-roadmap" aria-hidden="true"><span className="complete"><Check size={15}/></span><i/><span className="current"><Sparkles size={18}/></span><i/><span><ArrowRight size={16}/></span></div>
        <p>Follow a clear path from where you are today.</p>
      </article>
      <article className="welcome-highlight welcome-highlight-practice">
        <span className="welcome-highlight-icon"><Headphones size={23} aria-hidden="true" /></span>
        <span className="welcome-highlight-label">02 / PRACTICE</span>
        <h3>Bring every part of French to life.</h3>
        <div className="welcome-mini-skills" aria-hidden="true"><span><Headphones size={15}/> Listen</span><span><Mic size={15}/> Speak</span><span><BookOpen size={15}/> Read</span><span><Pencil size={15}/> Write</span></div>
        <p>Switch between listening, speaking, reading and writing.</p>
      </article>
      <article className="welcome-highlight welcome-highlight-play">
        <span className="welcome-highlight-icon"><Flame size={23} aria-hidden="true" /></span>
        <span className="welcome-highlight-label">03 / PLAY</span>
        <h3>Make the next answer an adventure.</h3>
        <div className="welcome-mini-game" aria-hidden="true"><span>FRENCH RUSH</span><span className="welcome-mini-hearts"><Heart size={15} fill="currentColor"/><Heart size={15} fill="currentColor"/><Heart size={15} fill="currentColor"/></span><strong>How far can you go?</strong><div><i/></div></div>
        <p>Turn a few spare minutes into a satisfying run.</p>
      </article>
    </div>
  </section>;
}
