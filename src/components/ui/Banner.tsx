import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';

export type BannerProps = {
  icon?: LucideIcon | null;
  iconSize?: number;
  title?: React.ReactNode;
  text?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  key?: React.Key;
};

// Call-to-action banner: icon + title/text + primary action.
export function Banner({ icon: Icon = null, iconSize = 20, title, text, actionLabel, onAction }: BannerProps) {
  return (
    <div className="placement-banner">
      {Icon ? <Icon size={iconSize} aria-hidden="true" /> : null}
      <div>
        <strong>{title}</strong>
        {text ? <p>{text}</p> : null}
      </div>
      {actionLabel ? (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
