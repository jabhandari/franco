import React from 'react';

export type ChecklistItem = {
  id: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
};

export type ChecklistProps = {
  items?: ChecklistItem[];
  checked?: Record<string, boolean>;
  onToggle: (id: string) => void;
  key?: React.Key;
};

// Toggle checklist: ul.checklist of buttons with checkbox squares.
export function Checklist({ items = [], checked = {}, onToggle }: ChecklistProps) {
  return (
    <ul className="checklist">
      {items.map((item) => {
        const isChecked = Boolean(checked[item.id]);
        return (
          <li key={item.id}>
            <button
              type="button"
              className={isChecked ? 'checked' : ''}
              aria-pressed={isChecked}
              onClick={() => onToggle(item.id)}
            >
              <span className="checkbox" aria-hidden="true" />
              <span>
                <strong>{item.title}</strong>
                {item.sub ? <small>{item.sub}</small> : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
