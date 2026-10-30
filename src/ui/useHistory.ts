import { useCallback, useRef, useState } from 'react';

/** Historial de deshacer y rehacer para un documento inmutable. */
export function useHistory<T>(initial: T, onCommit: (v: T) => void) {
  const [state, setState] = useState(initial);
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const [, force] = useState(0);
  const commit = useCallback(
    (next: T, prev?: T) => {
      past.current.push(prev ?? state);
      if (past.current.length > 120) past.current.shift();
      future.current = [];
      setState(next);
      onCommit(next);
      force((x) => x + 1);
    },
    [state, onCommit]
  );
  /** Cambio en vivo (arrastre) sin registrar en el historial. */
  const preview = useCallback((next: T) => setState(next), []);
  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (prev === undefined) return;
    future.current.push(state);
    setState(prev);
    onCommit(prev);
    force((x) => x + 1);
  }, [state, onCommit]);
  const redo = useCallback(() => {
    const next = future.current.pop();
    if (next === undefined) return;
    past.current.push(state);
    setState(next);
    onCommit(next);
    force((x) => x + 1);
  }, [state, onCommit]);
  const reset = useCallback((v: T) => {
    past.current = [];
    future.current = [];
    setState(v);
  }, []);
  return { state, commit, preview, undo, redo, reset, canUndo: past.current.length > 0, canRedo: future.current.length > 0 };
}
