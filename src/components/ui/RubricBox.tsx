import React from 'react';

export type RubricBoxProps = {
  title?: React.ReactNode;
  items?: React.ReactNode[];
  key?: React.Key;
};

// Grading rubric / info box: div.rubric-box with a title and a list.
// items are caller-rendered <li> nodes (e.g. <li><strong>label</strong>: text</li>).
export function RubricBox({ title, items = [] }: RubricBoxProps) {
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
