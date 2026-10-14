import React from 'react';
import { Volume2 } from 'lucide-react';

export type AudioPlayerProps = {
  src?: string;
  transcript?: string;
  emptyText?: string;
  key?: React.Key;
};

// Audio block: div.audio-player with an <audio> element and an optional
// transcript footnote. Without a src, renders just the fallback paragraph.
export function AudioPlayer({ src, transcript, emptyText }: AudioPlayerProps) {
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

// A one-tap replay control for short clips. The native player remains for
// longer recordings; a one-second word does not need a timeline.
export function ClipPlayer({ src, onPlay }: { src?: string; onPlay?: () => void }) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [played, setPlayed] = React.useState(false);
  const [playing, setPlaying] = React.useState(false);
  const [error, setError] = React.useState(false);

  async function replay() {
    const audio = audioRef.current;
    if (!audio) return;
    onPlay?.();
    audio.currentTime = 0;
    try {
      await audio.play();
      setPlayed(true);
      setError(false);
    } catch {
      setPlaying(false);
      setError(true);
    }
  }

  if (!src) return <p className="clip-error">Audio is unavailable for this activity.</p>;

  return (
    <div className="clip-player">
      <audio ref={audioRef} src={src} preload="none" onPlay={() => setPlaying(true)} onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} onError={() => setError(true)} />
      <button type="button" className={`clip-play-button${playing ? ' is-playing' : ''}`} onClick={replay} aria-label={played ? 'Replay pronunciation' : 'Play pronunciation'}>
        <span className="clip-play-icon"><Volume2 size={20} aria-hidden="true" /></span>
        <span>{played ? 'Replay sound' : 'Play sound'}</span>
        <span className="clip-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>
      </button>
      {error && <p className="clip-error">Audio could not play. Try again.</p>}
    </div>
  );
}
