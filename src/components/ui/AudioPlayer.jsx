import React from 'react';

// Audio block: div.audio-player with an <audio> element and an optional
// transcript footnote. Without a src, renders just the fallback paragraph.
export function AudioPlayer({ src, transcript, emptyText }) {
  if (!src) {
    return emptyText ? <p className="muted">{emptyText}</p> : null;
  }
  return (
    <div className="audio-player">
      <audio controls src={src} preload="metadata" />
      {transcript ? <p className="muted">{transcript}</p> : null}
    </div>
  );
}
