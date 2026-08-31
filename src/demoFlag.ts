// Demo Mode flag.
// - `?demo` in the URL turns it on for local dev / preview.
// - The production demo build sets it via Vite's `define` (see vite.config.ts)
//   using the STORYMAGIC_DEMO environment variable, so the public demo site is
//   always in demo mode without any URL tweak.
declare const __DEMO_MODE__: boolean;

export const DEMO_MODE: boolean =
  (typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('demo')) ||
  typeof __DEMO_MODE__ !== 'undefined' && __DEMO_MODE__;
