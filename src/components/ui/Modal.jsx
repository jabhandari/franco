import React from 'react';

// App modal: fixed drawer with a close button and scrollable body.
export function Modal({ onClose, closeLabel = 'Close', children }) {
  return (
    <div className="concept-modal" role="dialog" aria-modal="true" aria-label={closeLabel}>
      <button type="button" className="concept-modal-close" onClick={onClose} aria-label={closeLabel}>
        ×
      </button>
      <div className="concept-modal-scroll">{children}</div>
    </div>
  );
}
