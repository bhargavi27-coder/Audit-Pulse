import { useState, useCallback } from 'react';

/**
 * Generic async operation hook with loading/error state
 */
export function useAsync(asyncFn, immediate = false) {
  const [state, setState] = useState({
    data: null,
    loading: immediate,
    error: null,
  });

  const execute = useCallback(async (...args) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const result = await asyncFn(...args);
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (err) {
      const errorMsg = err.userMessage || err.message || 'An error occurred';
      setState((s) => ({ ...s, loading: false, error: errorMsg }));
      throw err;
    }
  }, [asyncFn]);

  return { ...state, execute };
}

/**
 * Toast notification hook
 * Returns showToast(message, type) and removeToast(id)
 * Compatible API: { toasts, showToast, removeToast }
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id));
    }, duration);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
  }, []);

  // Convenience aliases
  const success = useCallback((msg) => showToast(msg, 'success'), [showToast]);
  const error = useCallback((msg) => showToast(msg, 'error', 6000), [showToast]);
  const warning = useCallback((msg) => showToast(msg, 'warning', 5000), [showToast]);
  const info = useCallback((msg) => showToast(msg, 'info'), [showToast]);

  return { toasts, showToast, removeToast, success, error, warning, info };
}
