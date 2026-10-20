import React from 'react';

// Decorative cover art for a story card / reader header. The image is keyed
// deterministically to the story id (`public/stories/<id>.webp`); when the
// file is missing the image removes itself and the caller's icon/gradient
// fallback underneath shows through unchanged. The `is-loaded` class is set
// on successful load so the caller's `:has()` rules only swap the fallback
// for the image once it has actually arrived (never a blank cover).
export type StoryCoverImageProps = {
  storyId: string;
};

export function StoryCoverImage({storyId}: StoryCoverImageProps) {
  const [missing, setMissing] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  if (missing) return null;
  return (
    <img
      className={loaded ? 'story-cover-img is-loaded' : 'story-cover-img'}
      src={`${import.meta.env.BASE_URL}stories/${storyId}.webp`}
      alt=""
      aria-hidden="true"
      loading="lazy"
      onLoad={() => setLoaded(true)}
      onError={() => setMissing(true)}
    />
  );
}
