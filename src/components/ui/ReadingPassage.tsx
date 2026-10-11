import React from 'react';

export type ReadingPassageProps = {
  title?: string;
  text?: string;
  children?: React.ReactNode;
  key?: React.Key;
};

// Reading passage block: div.reading-passage with a kicker + paragraph.
export function ReadingPassage({ title = 'Read the passage', text, children }: ReadingPassageProps) {
  return (
    <div className="reading-passage">
      <strong>{title}</strong>
      {children || <p>{text}</p>}
    </div>
  );
}
