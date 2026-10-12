import React from 'react';
import type { LucideIcon } from 'lucide-react';

export type TabsVariant = 'section' | 'library' | 'roadmap' | 'learnSkill';

export type TabOption = {
  id: string;
  label: React.ReactNode;
  icon?: LucideIcon | null;
};

export type TabsProps = {
  variant?: TabsVariant;
  options?: TabOption[];
  value?: string;
  onChange: (id: string) => void;
  compact?: boolean;
  strongLabels?: boolean;
  ariaLabel?: string;
  key?: React.Key;
};

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
  if (variant === 'learnSkill') {
    // Group-of-buttons semantics (not the ARIA tab pattern): the options below
    // filter the skill list and there is no associated tabpanel, so declaring
    // tablist/tab roles would promise keyboard and panel behavior this control
    // does not implement. aria-pressed carries the selected state instead.
    return (
      <div className="learn-skill-tabs" role="group" aria-label={ariaLabel}>
        {options.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" aria-pressed={value === id} className={value === id ? 'selected' : ''} onClick={() => onChange(id)}>
            {Icon ? <Icon size={22} strokeWidth={1.8} aria-hidden="true" /> : null}
            <span>{label}</span>
          </button>
        ))}
      </div>
    );
  }
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
