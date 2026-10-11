import React from 'react';
import type { LucideIcon } from 'lucide-react';

// Aria attribute values are caller-provided primitives by definition.
type AriaValue = string | number | boolean | undefined;

export type FieldProps = {
  label?: React.ReactNode;
  icon?: LucideIcon | null;
  iconSize?: number;
  children?: React.ReactNode;
  // Remaining props land on the inner <input> (or are overridden by
  // an explicit children input).
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  maxLength?: number;
  minLength?: number;
  readOnly?: boolean;
  pattern?: string;
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'search' | 'email' | 'url';
  key?: React.Key;
  [ariaProp: `aria-${string}`]: AriaValue;
};

// Labeled input with an icon: label > span.input-wrap > icon + input.
export function Field({ label, icon: Icon = null, iconSize = 18, children, ...inputProps }: FieldProps) {
  return (
    <label>
      {label}
      <span className="input-wrap">
        {Icon ? <Icon size={iconSize} aria-hidden="true" /> : null}
        {children || <input {...inputProps} />}
      </span>
    </label>
  );
}

export type TextareaProps = {
  rows?: number;
  value?: string;
  defaultValue?: string;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  maxLength?: number;
  minLength?: number;
  readOnly?: boolean;
  autoFocus?: boolean;
  required?: boolean;
  key?: React.Key;
  [ariaProp: `aria-${string}`]: AriaValue;
};

// Free-text answer box: textarea.free-text-input.
export function Textarea({ rows = 3, ...rest }: TextareaProps) {
  return <textarea className="free-text-input" rows={rows} {...rest} />;
}
