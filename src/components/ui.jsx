import React from 'react';
import { Database } from 'lucide-react';

export function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="empty-state">
      <Icon size={24} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

export function PanelHeading({ title }) {
  return (
    <div className="panel-title">
      <div>
        <p className="eyebrow">Your learning</p>
        <h2>{title}</h2>
      </div>
      <Database size={20} aria-hidden="true" />
    </div>
  );
}

export function NavButton({ icon: Icon, active, onClick, children }) {
  return (
    <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}>
      <Icon size={18} aria-hidden="true" />
      <span>{children}</span>
    </button>
  );
}

export function RecordCount({ count, label }) {
  return (
    <div className="record-count">
      <strong>{count}</strong>
      <span>{label}</span>
    </div>
  );
}

export function ProfileRows({ profile }) {
  const rows = [
    ['Placement', profile?.placement_status || 'not_started'],
    ['Current level', profile?.current_level || 'not set'],
    ['Learning goal', profile?.learning_goal || 'not set'],
  ];

  return (
    <div className="record-list">
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

export function SkeletonBar({ label }) {
  return (
    <div className="skill-row skeleton-row">
      <span>{label}</span>
      <div className="bar skeleton-bar" />
      <strong>--</strong>
    </div>
  );
}

export function ProgressRecords({ progress }) {
  return (
    <div className="progress-grid">
      {progress.map((row) => (
        <section className="panel compact" key={`${row.cefr_level}-${row.skill}`}>
          <h2>{row.cefr_level}</h2>
          <p className="muted">{row.skill}</p>
          <SkeletonBar label={row.skill} />
        </section>
      ))}
    </div>
  );
}

export function LoadingScreen() {
  return (
    <main className="auth-shell single">
      <section className="auth-card">
        <p className="eyebrow">Franco</p>
        <h1>Loading your account</h1>
        <p className="lede">Preparing your learning space.</p>
      </section>
    </main>
  );
}

export function DataContract({ title, items }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <ul className="clean-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function QueueKindLabel({ kind }) {
  const labels = {
    review: 'Due review',
    new: 'New',
    weak: 'Weak point',
    exam: 'Exam practice',
    drill: 'Drill',
  };
  return <span className={`queue-kind queue-kind-${kind}`}>{labels[kind] || kind}</span>;
}
