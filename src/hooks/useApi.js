import React from 'react';
import { apiGet } from '../api/client.js';

export function useApiResource(path, token) {
  const [state, setState] = React.useState({ data: null, loading: true, error: '' });

  React.useEffect(() => {
    if (!token && path.startsWith('/api/me')) {
      setState({ data: null, loading: false, error: '' });
      return;
    }
    let cancelled = false;
    setState({ data: null, loading: true, error: '' });

    apiGet(path, token)
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: '' });
      })
      .catch((error) => {
        if (!cancelled) setState({ data: null, loading: false, error: error.message });
      });

    return () => {
      cancelled = true;
    };
  }, [path, token]);

  return state;
}
