import React from 'react';
import { Check, Circle } from 'lucide-react';

type CheckRowProps = { label: string; checked: boolean; onChange: () => void };

export function CheckRow({ label, checked, onChange }: CheckRowProps) {
  return <button type="button" role="checkbox" aria-checked={checked} className={`check-row${checked ? ' checked' : ''}`} onClick={onChange}>
    <span>{label}</span>
    {checked ? <span className="check-row-mark"><Check size={13} aria-hidden="true" /></span> : <Circle size={20} aria-hidden="true" />}
  </button>;
}
