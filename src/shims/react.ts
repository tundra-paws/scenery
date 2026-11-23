// src/shims/react.ts
// Stand-in for `react`, aliased in vite.config.ts. The frame-loop package the
// scene library depends on imports three hooks at module scope and this project
// never calls any of them, so the names exist and nothing else does.

export const useCallback = unused

export const useEffect = unused

export const useSyncExternalStore = unused

function unused (): never {
  throw new Error('react is not part of this build: see src/shims/react.ts')
}
