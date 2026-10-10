import React from 'react';

// Bare input with no wrapper class. The app's forms usually wrap inputs in
// Field (label + icon), but a few places (auth screen, vocabulary search)
// render the input directly — this is that bare input. className is allowed
// so it can carry an existing styles.css hook like any other primitive.
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
}) {
  // Explicit allowlist: only aria-* passes through from the rest props.
  const ariaProps = {};
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
