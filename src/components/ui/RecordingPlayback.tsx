import React from 'react';
import { Pause, Play, Volume2 } from 'lucide-react';

export type RecordingPlaybackProps = { src: string };

function clock(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.floor(seconds) : 0;
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

export function RecordingPlayback({ src }: RecordingPlaybackProps) {
  const audio = React.useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [position, setPosition] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [error, setError] = React.useState(false);

  async function toggle() {
    if (!audio.current) return;
    if (playing) { audio.current.pause(); return; }
    try { await audio.current.play(); setError(false); }
    catch { setPlaying(false); setError(true); }
  }

  return <div className="recording-playback">
    <audio ref={audio} src={src} preload="metadata"
      onLoadedMetadata={event => setDuration(event.currentTarget.duration)}
      onDurationChange={event => setDuration(event.currentTarget.duration)}
      onTimeUpdate={event => setPosition(event.currentTarget.currentTime)}
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
      onEnded={() => { setPlaying(false); setPosition(0); }} onError={() => setError(true)} />
    <button type="button" className="recording-playback-toggle" onClick={toggle} aria-label={playing ? 'Pause your recording' : 'Play your recording'}>
      {playing ? <Pause size={20} fill="currentColor" aria-hidden="true" /> : <Play size={20} fill="currentColor" aria-hidden="true" />}
    </button>
    <Volume2 size={18} className="recording-playback-volume" aria-hidden="true" />
    <input type="range" aria-label="Recording position" min="0" max={duration || 1} step="0.1" value={Math.min(position, duration || 1)}
      disabled={!duration} onChange={event => { if (audio.current) audio.current.currentTime = Number(event.target.value); setPosition(Number(event.target.value)); }} />
    <time>{clock(position)} / {clock(duration)}</time>
    {error && <span role="alert" className="recording-playback-error">Playback unavailable</span>}
  </div>;
}
