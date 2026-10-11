import React from 'react';
import { apiGet } from '../api/client.js';
import { getErrorMessage } from '../presenters/format.presenter.js';

/** Return shape of {@link useApiResource}. */
export type ApiResourceState<T> = {
  data: T | null;
  loading: boolean;
  error: string;
};

export function useApiResource<T = unknown>(path: string, token?: string | null): ApiResourceState<T> {
  const [state, setState] = React.useState<ApiResourceState<T>>({ data: null, loading: true, error: '' });

  React.useEffect(() => {
    if (!token && path.startsWith('/api/me')) {
      setState({ data: null, loading: false, error: '' });
      return;
    }
    let cancelled = false;
    setState({ data: null, loading: true, error: '' });

    apiGet(path, token)
      .then((data: T) => {
        if (!cancelled) setState({ data, loading: false, error: '' });
      })
      .catch((error) => {
        if (!cancelled) setState({ data: null, loading: false, error: getErrorMessage(error) });
      });

    return () => {
      cancelled = true;
    };
  }, [path, token]);

  return state;
}
