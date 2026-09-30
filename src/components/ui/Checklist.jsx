import React from 'react';

// Toggle checklist: ul.checklist of buttons with checkbox squares.
// items: [{ id, title, sub? }]; checked: { [id]: boolean }.
export function Checklist({ items = [], checked = {}, onToggle }) {
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
