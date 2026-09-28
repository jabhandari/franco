import React from 'react';
import { safeText, formatEnum } from '../../api/client.js';
import { Panel } from './Panel.jsx';
import { ProgressBar } from './ProgressBar.jsx';

// Big-number stat tile.
export function RecordCount({ count, label }) {
  return (
    <div className="record-count">
      <strong>{safeText(count, '–')}</strong>
      <span>{safeText(label)}</span>
    </div>
  );
}

// Grid wrapper for RecordCount tiles.
export function StatGroup({ children }) {
  return <div className="session-stats">{children}</div>;
}

// Label/value rows for a learner profile.
export function ProfileRows({ profile }) {
  const rows = [
    ['Placement', formatEnum(profile?.placement_status) || 'Not started'],
    ['Current level', formatEnum(profile?.current_level) || 'Not set'],
    ['Learning goal', formatEnum(profile?.learning_goal) || 'Not set'],
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

// Titled panel with a plain bullet list.
export function DataContract({ title, items }) {
  return (
    <Panel>
      <h2>{title}</h2>
      <ul className="clean-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Panel>
  );
}

// CEFR x skill progress grid of compact panels.
export function ProgressRecords({ progress }) {
  return (
    <div className="progress-grid">
      {progress.map((row) => (
        <Panel compact key={`${safeText(row.cefr_level)}-${safeText(row.skill)}`}>
          <h2>{safeText(row.cefr_level)}</h2>
          <p className="muted">{safeText(row.skill)}</p>
          <ProgressBar label={safeText(row.skill)} skeleton />
        </Panel>
      ))}
    </div>
  );
}
