import React from 'react';
import { safeText, formatEnum } from '../../presenters/format.presenter.js';
import { Panel } from './Panel';
import { ProgressBar } from './ProgressBar';

// Minimal local view of the learner profile row these rows render.
// (Full learner/profile types belong to the API-client ticket — FRA-61.)
export interface LearnerProfile {
  placement_status?: string | null;
  current_level?: string | null;
  learning_goal?: string | null;
}

export interface RecordCountProps {
  count?: React.ReactNode;
  label?: React.ReactNode;
  key?: React.Key;
}

// Big-number stat tile.
export function RecordCount({ count, label }: RecordCountProps) {
  return (
    <div className="record-count">
      <strong>{safeText(count, '–')}</strong>
      <span>{safeText(label)}</span>
    </div>
  );
}

export interface StatGroupProps {
  children?: React.ReactNode;
  key?: React.Key;
}

// Grid wrapper for RecordCount tiles.
export function StatGroup({ children }: StatGroupProps) {
  return <div className="session-stats">{children}</div>;
}

export interface ProfileRowsProps {
  profile?: LearnerProfile | null;
  key?: React.Key;
}

// Label/value rows for a learner profile.
export function ProfileRows({ profile }: ProfileRowsProps) {
  const rows: Array<[string, string]> = [
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

export interface DataContractProps {
  title?: React.ReactNode;
  items?: React.ReactNode[];
  key?: React.Key;
}

// Titled panel with a plain bullet list.
export function DataContract({ title, items }: DataContractProps) {
  return (
    <Panel>
      <h2>{title}</h2>
      <ul className="clean-list">
        {(items ?? []).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Panel>
  );
}

// Minimal local view of one CEFR x skill progress row.
// (Canonical content-progress types belong to the API-client ticket — FRA-61.)
export interface ProgressRow {
  cefr_level?: string | null;
  skill?: string | null;
}

export interface ProgressRecordsProps {
  progress?: ProgressRow[];
  key?: React.Key;
}

// CEFR x skill progress grid of compact panels.
export function ProgressRecords({ progress }: ProgressRecordsProps) {
  return (
    <div className="progress-grid">
      {(progress ?? []).map((row) => (
        <Panel compact key={`${safeText(row.cefr_level)}-${safeText(row.skill)}`}>
          <h2>{safeText(row.cefr_level)}</h2>
          <p className="muted">{safeText(row.skill)}</p>
          <ProgressBar label={safeText(row.skill)} skeleton />
        </Panel>
      ))}
    </div>
  );
}
