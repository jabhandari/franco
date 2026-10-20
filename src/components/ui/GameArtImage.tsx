import React from 'react';

// Decorative emblem for a puzzle game card's art tile. The image is keyed
// deterministically to the game (`public/games/<game>.webp`) and fills the
// glass tile; when the file is missing the image removes itself and the
// lucide icon underneath shows through unchanged, so the hazed panel design
// is never broken.
export type GameArtKind = 'rush' | 'sprint' | 'race';

export type GameArtImageProps = {
  game: GameArtKind;
};

const GAME_ART_FILES: Record<GameArtKind, string> = {
  rush: 'rush.webp',
  sprint: 'sprint.webp',
  race: 'race.webp',
};

export function GameArtImage({game}: GameArtImageProps) {
  const [missing, setMissing] = React.useState(false);
  if (missing) return null;
  return (
    <img
      className="puzzles-art-img"
      src={`${import.meta.env.BASE_URL}games/${GAME_ART_FILES[game]}`}
      alt=""
      aria-hidden="true"
      loading="lazy"
      onError={() => setMissing(true)}
    />
  );
}
