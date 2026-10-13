import React from 'react';

// Aria attribute values are caller-provided primitives by definition.
type AriaValue = string | number | boolean | undefined;

// Bare input with no wrapper class. The app's forms usually wrap inputs in
// Field (label + icon), but a few places (auth screen, vocabulary search)
// render the input directly — this is that bare input. className is allowed
// so it can carry an existing styles.css hook like any other primitive.
export type TextInputProps = {
  type?: string;
  name?: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  required?: boolean;
  minLength?: number;
  disabled?: boolean;
  className?: string;
  key?: React.Key;
  // Only aria-* attributes pass through from any extra props.
  [ariaProp: `aria-${string}`]: AriaValue;
};

export function TextInput({
  type = 'text',
  name,
  value,
  onChange,
  onKeyDown,
  placeholder,
  autoComplete,
  autoFocus,
  required = false,
  minLength,
  className,
  ...rest
}: TextInputProps) {
  // Explicit allowlist: only aria-* passes through from the rest props.
  const ariaProps: Record<string, AriaValue> = {};
  for (const key of Object.keys(rest)) {
    if (key.startsWith('aria-')) ariaProps[key] = rest[key];
  }

  return (
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      autoComplete={autoComplete}
      autoFocus={autoFocus}
      required={required}
      minLength={minLength}
      className={className}
      {...ariaProps}
    />
  );
}
