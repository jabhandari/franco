import React from 'react';

// Bare input with no wrapper class. The app's forms usually wrap inputs in
// Field (label + icon), but a few places (auth screen, vocabulary search)
// render the input directly — this is that bare input. className is allowed
// so it can carry an existing styles.css hook like any other primitive.
export interface TextInputProps {
  type?: string;
  name?: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  key?: React.Key;
  // Only aria-* attributes pass through from any extra props.
  [ariaProp: `aria-${string}`]: unknown;
}

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
  className,
  ...rest
}: TextInputProps) {
  // Explicit allowlist: only aria-* passes through from the rest props.
  const ariaProps: Record<string, unknown> = {};
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
      className={className}
      {...ariaProps}
    />
  );
}
