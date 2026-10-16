"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

// Scopes stored data to the logged-in user so accounts sharing a browser don't mix data.
export const StorageScope = createContext("anon");

export function useScopedKey(key: string) {
  return `${key}.${useContext(StorageScope)}`;
}

// localStorage is a fast local cache; the server (/api/user-data) is the source of truth so data follows the user across devices.
const loads = new Map<string, Promise<Record<string, unknown> | null>>();
const settled = new Set<string>();
const timers = new Map<string, number>();

function loadServerData(scope: string): Promise<Record<string, unknown> | null> {
  if (scope === "anon") return Promise.resolve(null);
  let p = loads.get(scope);
  if (!p) {
    p = fetch("/api/user-data", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Record<string, unknown>>) : null))
      .then((data) => {
        if (data) for (const [k, v] of Object.entries(data)) window.localStorage.setItem(`${k}.${scope}`, JSON.stringify(v));
        return data;
      })
      .catch(() => null)
      .finally(() => settled.add(scope));
    loads.set(scope, p);
  }
  return p;
}

function pushToServer(baseKey: string, json: string) {
  window.clearTimeout(timers.get(baseKey));
  timers.set(
    baseKey,
    window.setTimeout(() => {
      fetch("/api/user-data", { method: "PUT", headers: { "Content-Type": "application/json" }, body: `{"key":${JSON.stringify(baseKey)},"value":${json}}` }).catch(() => {});
    }, 600),
  );
}

// Client-only: components using this must not be server-rendered.
export function useLocalStorage<T>(baseKey: string, initial: T | (() => T)) {
  const scope = useContext(StorageScope);
  const key = `${baseKey}.${scope}`;
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch {}
    return typeof initial === "function" ? (initial as () => T)() : initial;
  });
  // JSON last known to be on the server; null until the first server load finishes (or if it failed).
  const synced = useRef<string | null>(null);

  useEffect(() => {
    if (settled.has(scope)) {
      if (loads.has(scope)) synced.current = window.localStorage.getItem(key) ?? "";
      return;
    }
    let live = true;
    loadServerData(scope).then((data) => {
      if (!live || !data) return;
      if (baseKey in data) {
        synced.current = JSON.stringify(data[baseKey]);
        setValue(data[baseKey] as T);
      } else {
        const local = window.localStorage.getItem(key);
        synced.current = local ?? "";
        if (local) pushToServer(baseKey, local);
      }
    });
    return () => {
      live = false;
    };
  }, [scope, key, baseKey]);

  useEffect(() => {
    const json = JSON.stringify(value);
    window.localStorage.setItem(key, json);
    if (synced.current !== null && synced.current !== json) {
      synced.current = json;
      pushToServer(baseKey, json);
    }
  }, [key, baseKey, value]);

  return [value, setValue] as const;
}
