import React from 'react';

// Labeled input with an icon: label > span.input-wrap > icon + input.
export function Field({ label, icon: Icon = null, iconSize = 18, children, ...inputProps }) {
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

// Free-text answer box: textarea.free-text-input.
export function Textarea({ rows = 3, ...rest }) {
  return <textarea className="free-text-input" rows={rows} {...rest} />;
}
