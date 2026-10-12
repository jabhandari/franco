import React from 'react';
import type { LessonSection } from '../../types';

export type ModalProps = {
  onClose: () => void;
  closeLabel?: string;
  children?: React.ReactNode;
  key?: React.Key;
  resumeSection?: LessonSection;
  onReadingSectionChange?: (section: LessonSection) => void;
};

// App modal: fixed drawer with a close button and scrollable body.
// forwardRef: callers get the dialog's DOM node, so outside-click handling
// can ask the node itself (ref.contains) instead of matching CSS classes.
// The dialog also owns Escape-to-close: the key listener exists only while
// the modal is mounted, i.e. while it is open.
export const Modal = React.forwardRef<HTMLDivElement, ModalProps>(function Modal(
  { onClose, closeLabel = 'Close', children, resumeSection, onReadingSectionChange },
  ref,
) {
  const scrollRef=React.useRef<HTMLDivElement>(null);
  const callback=React.useRef(onReadingSectionChange);
  callback.current=onReadingSectionChange;
  const lastSection=React.useRef<LessonSection>(resumeSection || 'overview');
  const timer=React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumed=React.useRef(false);
  React.useEffect(() => {
    if (!resumeSection || resumed.current) return;
    resumed.current=true;
    const frame=requestAnimationFrame(() => {
      const scroll=scrollRef.current;
      const target=scroll?.querySelector<HTMLElement>(`#lesson-${resumeSection}`);
      if (scroll && target) scroll.scrollTop += target.getBoundingClientRect().top-scroll.getBoundingClientRect().top;
      const section=target ? resumeSection : 'overview';
      lastSection.current=section;
      callback.current?.(section);
    });
    return () => cancelAnimationFrame(frame);
  }, [resumeSection]);
  React.useEffect(() => () => {
    if (timer.current) { clearTimeout(timer.current); callback.current?.(lastSection.current); }
  }, []);
  function trackSection() {
    const scroll=scrollRef.current;
    if (!scroll || !callback.current) return;
    const sections: LessonSection[]=['overview','theory','vocabulary','examples'];
    let selected: LessonSection='overview';
    for (const section of sections) {
      const target=scroll.querySelector<HTMLElement>(`#lesson-${section}`);
      if (target && target.getBoundingClientRect().top<=scroll.getBoundingClientRect().top+100) selected=section;
    }
    if (selected===lastSection.current) return;
    lastSection.current=selected;
    if (timer.current) clearTimeout(timer.current);
    timer.current=setTimeout(() => { timer.current=null; callback.current?.(lastSection.current); },350);
  }
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
      <div className="concept-modal-scroll" ref={scrollRef} onScroll={trackSection}>{children}</div>
    </div>
  );
});
