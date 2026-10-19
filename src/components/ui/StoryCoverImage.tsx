import React from 'react';

// Decorative cover art for a story card / reader header. The image is keyed
// deterministically to the story id (`public/stories/<id>.webp`); when the
// file is missing the image removes itself and the caller's icon/gradient
// fallback underneath shows through unchanged.
export type StoryCoverImageProps = {
  storyId: string;
};

export function StoryCoverImage({storyId}: StoryCoverImageProps) {
  const [missing, setMissing] = React.useState(false);
  if (missing) return null;
  return (
    <img
      className="story-cover-img"
      src={`${import.meta.env.BASE_URL}stories/${storyId}.webp`}
      alt=""
      aria-hidden="true"
      loading="lazy"
      onError={() => setMissing(true)}
    />
  );
}
