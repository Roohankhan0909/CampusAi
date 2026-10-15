"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Scopes stored data to the logged-in user so accounts sharing a browser don't mix data.
export const StorageScope = createContext("anon");

export function useScopedKey(key: string) {
  return `${key}.${useContext(StorageScope)}`;
}

// Client-only: components using this must not be server-rendered.
export function useLocalStorage<T>(baseKey: string, initial: T | (() => T)) {
  const key = useScopedKey(baseKey);
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch {}
    return typeof initial === "function" ? (initial as () => T)() : initial;
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
