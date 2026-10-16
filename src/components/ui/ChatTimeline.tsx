import React, { useLayoutEffect, useRef } from "react";
type ChatTimelineProps = {
  children?: React.ReactNode;
  key?: string;
  latestId?: string;
  onReadLatest: () => void;
};
// Only mark the latest message read when the reader reaches the bottom. New
// messages follow the scroll when already there; loading older pages preserves
// the current viewport instead of pulling the reader back down.
export function ChatTimeline({
  children,
  latestId,
  onReadLatest,
}: ChatTimelineProps) {
  const element = useRef<HTMLDivElement | null>(null);
  const follow = useRef(true);
  const height = useRef(0);
  const previousLatest = useRef<string | undefined>(undefined);
  const mark = () => {
    const node = element.current;
    if (
      node &&
      node.getBoundingClientRect().bottom <= window.innerHeight &&
      node.getBoundingClientRect().bottom > 0 &&
      node.scrollHeight - node.scrollTop - node.clientHeight < 48 &&
      document.visibilityState === "visible" &&
      document.hasFocus()
    )
      onReadLatest();
  };
  useLayoutEffect(() => {
    const node = element.current;
    if (!node) return;
    if (follow.current) node.scrollTop = node.scrollHeight;
    else if (previousLatest.current === latestId && height.current)
      node.scrollTop += node.scrollHeight - height.current;
    height.current = node.scrollHeight;
    previousLatest.current = latestId;
    mark();
    window.addEventListener("scroll", mark, { passive: true });
    window.addEventListener("focus", mark);
    document.addEventListener("visibilitychange", mark);
    return () => {
      window.removeEventListener("scroll", mark);
      window.removeEventListener("focus", mark);
      document.removeEventListener("visibilitychange", mark);
    };
  }, [children, latestId, onReadLatest]);
  return (
    <div
      ref={element}
      className="chat-messages"
      aria-label="Messages"
      onScroll={() => {
        const node = element.current;
        if (node)
          follow.current =
            node.scrollHeight - node.scrollTop - node.clientHeight < 48;
        mark();
      }}
    >
      {children}
    </div>
  );
}
