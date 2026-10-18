import React from 'react';

export type QuestionSourceImageProps = { src: string; key?: React.Key };

export function QuestionSourceImage({ src }: QuestionSourceImageProps) {
  return <img className="question-source-image" src={src} alt="Illustration or document for this question" loading="lazy" />;
}
