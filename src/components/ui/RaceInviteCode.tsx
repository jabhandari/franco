import React from 'react';

type Props = { image: string | null; url: string };

/** The QR image is generated locally in the browser; the invitation URL never leaves the device. */
export function RaceInviteCode({ image, url }: Props) {
  return <div className="race-invite-code">
    {image ? <img src={image} alt={`QR code for ${url}`} width="220" height="220" /> : <span aria-live="polite">Preparing QR code…</span>}
  </div>;
}
