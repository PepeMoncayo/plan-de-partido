import { useCallback, useState } from 'react';

export function useAI(fn) {
  const [state, setState] = useState({ loading: false, error: null, result: null });
  const run = useCallback(
    async (input) => {
      setState({ loading: true, error: null, result: null });
      try {
        const result = await fn(input);
        setState({ loading: false, error: null, result });
        return result;
      } catch (e) {
        setState({ loading: false, error: e.message, result: null });
        return null;
      }
    },
    [fn]
  );
  const reset = useCallback(() => setState({ loading: false, error: null, result: null }), []);
  return { ...state, run, reset };
}
