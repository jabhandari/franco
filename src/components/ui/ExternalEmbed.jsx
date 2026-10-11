import React from 'react';
import { ExternalLink, MonitorPlay } from 'lucide-react';
import { Box } from './Box.jsx';
import { Text } from './Text.jsx';
import { Badge } from './Badge.jsx';
import { TV5MONDE_EMBED_ALLOWED, isAllowedExternalUrl } from '../../presenters/tv5monde.presenter.js';

// FRA-55: external content embed with removal fallback.
//
// Renders an <iframe> ONLY when embedding is expressly permitted
// (embedAllowed) and an embedUrl on an allowlisted host is provided. In every
// other case -- and whenever a permitted frame errors or is removed later --
// it degrades to a placeholder card with an outbound link. Never a broken
// frame, never copied third-party content.
export function ExternalEmbed({
  title,
  description,
  url,
  embedUrl,
  embedAllowed = TV5MONDE_EMBED_ALLOWED,
  level,
  icon: Icon = MonitorPlay,
}) {
  const [failed, setFailed] = React.useState(false);
  const canEmbed =
    embedAllowed && !failed && typeof embedUrl === 'string' && isAllowedExternalUrl(embedUrl);

  if (canEmbed) {
    return (
      <Box className="external-embed">
        <iframe
          src={embedUrl}
          title={title}
          loading="lazy"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin"
          onError={() => setFailed(true)}
        />
        <Text as="small" variant="muted">
          Embedded from an external provider.{' '}
          <Box as="a" href={url} target="_blank" rel="noreferrer">
            Open directly
          </Box>
        </Text>
      </Box>
    );
  }

  return (
    <Box className="external-embed">
      <Box className="external-embed-media" aria-hidden="true">
        <Icon size={32} />
      </Box>
      <Box className="external-embed-body">
        <Text as="strong">{title}</Text>
        {description ? (
          <Text variant="muted" size="sm">
            {description}
          </Text>
        ) : null}
        <Box as="a" className="external-embed-link" href={url} target="_blank" rel="noreferrer">
          Open on TV5Monde <ExternalLink size={14} aria-hidden="true" />
        </Box>
      </Box>
      {level ? <Badge variant="roadmap">{level}</Badge> : null}
    </Box>
  );
}
