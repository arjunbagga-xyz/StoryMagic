# Privacy & Data Flow

_Last updated: 2026-08-31. This document states exactly what StoryMagic does with data, so you
can evaluate the "privacy-first for kids" claim honestly before trusting it with a child._

## TL;DR

- **By default, StoryMagic sends NO analytics anywhere.** The only instrumentation in the
  code is opt-in and is a silent no-op unless an operator explicitly configures a backend.
- **Story text goes ONLY to the AI provider you configure.** If you wire up local Ollama and
  no cloud key, nothing leaves your machine. If you configure a cloud provider, that provider
  receives the story content and its own terms govern it.
- **Stories you create are stored in your own browser** (IndexedDB) by default — they are
  never uploaded to us or anyone else unless you stand up your own backend.
- There are **no ad SDKs, no third-party trackers, and no cookie banners required** in the
  default build.

## 1. What the app is

StoryMagic is a **frontend (React) + a local proxy (Express)** that you run yourself
(`npm run dev` or your own host). The proxy (`server.ts`) routes story generation to a
**provider-agnostic AI router** (`src/router/`). You choose which providers are enabled via
environment variables / `storymagic.config.json`. **No provider is mandatory** — the server
boots with zero keys.

## 2. Where story content goes (the important part)

When a story page is generated, the prompt (which includes the child's chosen genre, themes,
age, language, and the running story text so far) is sent from the browser to your local
proxy, and the proxy forwards it to the **first available provider in the configured chain**.

| Mode | What happens to the story text | Egress |
| --- | --- | --- |
| **Local Ollama** (you set `SM_PROVIDER_LOCAL_BASE_URL`, e.g. `http://localhost:11434`) | Sent to the Ollama instance you run on your own machine. | **None off-device.** No API key, fully offline. |
| **Cloud provider** (Gemini / OpenAI / Anthropic / Nous / OpenRouter) | Sent to that provider's API. | **Yes** — governed by that provider's Terms of Service & Privacy Policy. |
| **Demo Mode** (`?demo` or the `STORYMAGIC_DEMO` build) | Nothing is generated; a bundled sample story is shown. Illustrations are inline SVG. | **None.** Zero network calls for story content or images. |

> **Important nuance (read this before claiming "100% offline"):** the router's *default*
> chain is **cloud-first** (`nous → openrouter → openai → local` for text). That means out of
> the box — with a cloud key present — story text WILL leave the machine to a cloud provider.
> Running **100% offline is opt-in**: configure ONLY `SM_PROVIDER_LOCAL_BASE_URL` and no cloud
> keys, and the app will never contact a cloud. This is the mode to recommend for maximum
> privacy, and it is what the privacy claim depends on.

Source of truth: `src/router/config.ts` (default chains), `src/router/index.ts`
(`buildRouter` registers an adapter only when its key / base URL is set), `server.ts`
(handers that call `router.generate`).

## 3. Images

- In **local/Ollama mode**, base Ollama does not return images; the app degrades gracefully
  to a placeholder. (See `src/router/adapters/local.ts`.)
- In a **cloud image mode** (OpenAI / Gemini / OpenRouter), the image *prompt* (a description
  of the page illustration) is sent to that provider; the returned image URL is shown.
- **Fallback note:** if no image provider is reachable, the frontend requests a fixed
  placeholder image from `picsum.photos` (`src/components/KidMode.tsx`). This is a generic
  stock image URL — **it contains no story content** — but it is the one unconditional external
  GET in a misconfigured cloud deploy. In Demo Mode, illustrations are inline SVG, so even this
  request never happens.

## 4. Analytics / telemetry — opt-in, off by default

`src/analytics.ts` is the only instrumentation in the codebase. Its behavior:

- It is **disabled unless you opt in** by setting one of: `VITE_PLAUSIBLE_DOMAIN`,
  `VITE_POSTHOG_KEY`, or `VITE_ANALYTICS_ENDPOINT`. With none of these set, `ENABLED` is
  `false` and every `track()` call is a no-op. **Out of the box, nothing is collected.**
- The events it can send are **aggregate KPI counters only**: `app_open`, `story_start`,
  `story_page_render`, `story_completed`, `newsletter_cta_view`. They carry at most a page
  number, a genre string, and a profile id. **They never include story text, illustrations,
  child names, or any free-text the child enters.**
- PostHog (if enabled) is loaded lazily from its CDN and initialized with `autocapture: false`
  and `capture_pageview: false`, so it does not sweep the DOM.

If you self-host and want zero analytics, simply **do not set those env vars**. Then no data
leaves the browser for measurement of any kind.

## 5. Where your stories are stored

- Created stories are persisted in the browser's **IndexedDB** (`src/indexedDb.ts`) and the
  app state (settings + child profiles, **which include only a name, birthdate, and a 4-digit
  PIN — no photos, no contact info**) in `localStorage`.
- Nothing in this repo uploads those stories anywhere. If you want cross-device sync or a
  shareable link, you would have to build that backend yourself — at which point *you* become
  the data controller and should update this notice accordingly.

## 6. Third-party code

- **AI SDKs** (`@google/genai`, `@anthropic-ai/sdk`, `openai`, `ollama`) are used only to talk
  to the provider you configure. They make network calls solely to that provider.
- **PostHog snippet** is the only third-party script, and only when you enable it (Section 4).
- No advertising, no fingerprinting, no captcha, no social widgets are included.

## 7. Recommendations for maximum privacy

1. Run with **local Ollama only** — set `SM_PROVIDER_LOCAL_BASE_URL=http://localhost:11434`
   and leave all cloud keys blank.
2. **Do not set** `VITE_PLAUSIBLE_DOMAIN` / `VITE_POSTHOG_KEY` / `VITE_ANALYTICS_ENDPOINT`.
3. Deploy the **Demo Mode** build for public visitors who just want to look — it makes zero
   network calls (inline sample story + inline SVG art).
4. If you must use a cloud provider for quality, disclose it to parents and rely on that
   provider's own child-safety / data controls.

## 8. How to verify any of this

- Grep the frontend for network calls: `search for fetch( and XMLHttpRequest in src/`. The only
  external hosts reachable are (a) your configured AI provider and (b) `picsum.photos` as the
  image fallback. There is no analytics endpoint unless you add one.
- Set the app to local-only and watch your network monitor while generating — you will see
  traffic only to `localhost:11434`.
