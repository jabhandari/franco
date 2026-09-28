import React from 'react';

// Grading rubric / info box: div.rubric-box with a title and a list.
// items are caller-rendered <li> nodes (e.g. <li><strong>label</strong>: text</li>).
export function RubricBox({ title, items = [] }) {
  return (
    <div className="rubric-box">
      <strong>{title}</strong>
      <ul>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
