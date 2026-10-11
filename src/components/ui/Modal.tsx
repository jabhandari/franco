import React from 'react';

export interface ModalProps {
  onClose: () => void;
  closeLabel?: string;
  children?: React.ReactNode;
  key?: React.Key;
}

// App modal: fixed drawer with a close button and scrollable body.
// forwardRef: callers get the dialog's DOM node, so outside-click handling
// can ask the node itself (ref.contains) instead of matching CSS classes.
// The dialog also owns Escape-to-close: the key listener exists only while
// the modal is mounted, i.e. while it is open.
export const Modal = React.forwardRef<HTMLDivElement, ModalProps>(function Modal(
  { onClose, closeLabel = 'Close', children },
  ref,
) {
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="concept-modal" role="dialog" aria-modal="true" aria-label={closeLabel} ref={ref}>
      <button type="button" className="concept-modal-close" onClick={onClose} aria-label={closeLabel}>
        ×
      </button>
      <div className="concept-modal-scroll">{children}</div>
    </div>
  );
});
