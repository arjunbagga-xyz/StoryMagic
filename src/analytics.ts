// src/analytics.ts
/**
 * Privacy-safe, opt-in KPI instrumentation for StoryMagic.
 *
 * IMPORTANT: zero data leaves the user's machine unless an operator explicitly
 * configures ONE of the backends below (via Vite env vars). The default is a
 * silent no-op — the correct privacy-first posture for a kids' app, and required
 * so we can honestly claim "no tracking" in the README/privacy note.
 *
 * Supported backends (all optional, mutually exclusive is fine):
 *   1. Plausible  — VITE_PLAUSIBLE_DOMAIN (+ optional VITE_PLAUSIBLE_HOST)
 *   2. PostHog    — VITE_POSTHOG_KEY  (official snippet loaded lazily from CDN)
 *   3. Custom     — VITE_ANALYTICS_ENDPOINT  (any URL accepting a JSON POST)
 *
 * The canonical "read" metric is the `story_page_render` event, fired by
 * KidMode whenever a story page is displayed. See KPI_TRACKING.md.
 */

export type KpiEvent =
  | 'app_open'
  | 'story_start'
  | 'story_page_render' // the "read" event — fires when a story page is shown
  | 'story_completed'
  | 'newsletter_cta_view';

const PLAUSIBLE_HOST =
  (import.meta.env.VITE_PLAUSIBLE_HOST as string | undefined) || 'https://plausible.io';
const PLAUSIBLE_DOMAIN = (import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined) || '';
const POSTHOG_KEY = (import.meta.env.VITE_POSTHOG_KEY as string | undefined) || '';
const CUSTOM_ENDPOINT = (import.meta.env.VITE_ANALYTICS_ENDPOINT as string | undefined) || '';

const ENABLED = Boolean(PLAUSIBLE_DOMAIN || POSTHOG_KEY || CUSTOM_ENDPOINT);

let posthogLoading = false;

function loadPosthog(): void {
  if (posthogLoading || (window as any).posthog || !POSTHOG_KEY) return;
  posthogLoading = true;
  const script = document.createElement('script');
  script.async = true;
  // EU host by default (GDPR-friendlier). If you are on PostHog US, change both URLs to
  // https://us.i.posthog.com and https://app.posthog.com respectively.
  script.src = 'https://eu.i.posthog.com/static/array.js';
  script.onload = () => {
    (window as any).posthog?.init(POSTHOG_KEY, {
      api_host: 'https://eu.i.posthog.com',
      capture_pageview: false,
      autocapture: false,
    });
  };
  document.head.appendChild(script);
}

function sendPlausible(event: KpiEvent, props: Record<string, unknown>): void {
  try {
    fetch(`${PLAUSIBLE_HOST}/api/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        name: event,
        domain: PLAUSIBLE_DOMAIN,
        url: window.location.href,
        props,
      }),
    }).catch(() => {
      /* swallow: analytics must never break the app */
    });
  } catch {
    /* noop */
  }
}

function sendCustom(event: KpiEvent, props: Record<string, unknown>): void {
  try {
    fetch(CUSTOM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ event, props, ts: Date.now(), url: window.location.href }),
    }).catch(() => {
      /* noop */
    });
  } catch {
    /* noop */
  }
}

/** Fire a KPI event. Silent no-op when no backend is configured. */
export function track(event: KpiEvent, props: Record<string, string | number> = {}): void {
  if (!ENABLED) return;
  if (import.meta.env.DEV) console.debug('[kpi]', event, props);
  if (PLAUSIBLE_DOMAIN) sendPlausible(event, props);
  if (POSTHOG_KEY) {
    loadPosthog();
    (window as any).posthog?.capture(event, props);
  }
  if (CUSTOM_ENDPOINT) sendCustom(event, props);
}

export const analyticsEnabled = ENABLED;
