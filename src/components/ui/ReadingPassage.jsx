import React from 'react';

// Reading passage block: div.reading-passage with a kicker + paragraph.
export function ReadingPassage({ title = 'Read the passage', text, children }) {
  return (
    <div className="reading-passage">
      <strong>{title}</strong>
      {children || <p>{text}</p>}
    </div>
  );
}
