import React from 'react';
import type { LucideIcon } from 'lucide-react';

export type TabsVariant = 'section' | 'library' | 'roadmap';

export interface TabOption {
  id: string;
  label: React.ReactNode;
  icon?: LucideIcon | null;
}

export interface TabsProps {
  variant?: TabsVariant;
  options?: TabOption[];
  value?: string;
  onChange: (id: string) => void;
  compact?: boolean;
  strongLabels?: boolean;
  ariaLabel?: string;
  key?: React.Key;
}

// Unified tab rows. variant picks the existing CSS pattern:
//   section -> .section-tabs (+ .compact), active class 'selected', <strong> labels
//   library -> .tab-row > button.section-tab, active class 'active', optional icons
//   roadmap -> .roadmap-levels, active class 'selected', plain labels
export function Tabs({
  variant = 'section',
  options = [],
  value,
  onChange,
  compact = false,
  strongLabels = true,
  ariaLabel,
}: TabsProps) {
  if (variant === 'library') {
    return (
      <div className="tab-row" role="group" aria-label={ariaLabel}>
        {options.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`section-tab${value === id ? ' active' : ''}`}
            onClick={() => onChange(id)}
          >
            {Icon ? <Icon size={14} aria-hidden="true" /> : null} {label}
          </button>
        ))}
      </div>
    );
  }
  if (variant === 'roadmap') {
    return (
      <div className="roadmap-levels" role="group" aria-label={ariaLabel}>
        {options.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={value === id ? 'selected' : ''}
            onClick={() => onChange(id)}
          >
            {label}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div
      className={`section-tabs${compact ? ' compact' : ''}`}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className={value === id ? 'selected' : ''}
          onClick={() => onChange(id)}
        >
          {strongLabels ? <strong>{label}</strong> : label}
        </button>
      ))}
    </div>
  );
}
