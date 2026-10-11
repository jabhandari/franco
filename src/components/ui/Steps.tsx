import React from 'react';

export type Step = {
  title?: string;
  text?: React.ReactNode;
};

export type StepsProps = {
  steps?: Step[];
  key?: React.Key;
};

// Numbered step cards: div.steps-row > div.step-card × n.
export function Steps({ steps = [] }: StepsProps) {
  return (
    <div className="steps-row">
      {steps.map((step, index) => (
        <div className="step-card" key={step.title || index}>
          <span className="step-number">{index + 1}</span>
          <strong>{step.title}</strong>
          <p>{step.text}</p>
        </div>
      ))}
    </div>
  );
}
