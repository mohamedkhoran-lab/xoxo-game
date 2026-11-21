"use client";

import { useCallback, useSyncExternalStore } from "react";

// localStorage-backed JSON value, SSR/static-export safe and without setState-in-effect.

const EVENT = "xoxo-storage";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

export function useStored<T>(key: string, fallback: T): [T, (v: T) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null
  );

  let value = fallback;
  if (raw !== null) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = fallback;
    }
  }

  const set = useCallback(
    (v: T) => {
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch {}
      window.dispatchEvent(new Event(EVENT));
    },
    [key]
  );

  return [value, set];
}

const noopSubscribe = () => () => {};

/** false during server render / hydration, true in the browser afterwards. */
export function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
