# StoryMagic — Multi-Provider Model Router

StoryMagic now routes all AI generation through a **provider-agnostic model router**
(`src/router/`) instead of a single hardcoded Gemini client. This makes model access
endpoint-agnostic, keys easy to configure, and lets the app survive a provider block
by falling back across vendors.

## How it works

- `server.ts` builds a `ModelRouter` from `loadConfig()`, then each of the 4 existing
  endpoints (`/api/generate-page`, `/api/define-word`, `/api/translate-text`,
  `/api/generate-image`) calls `router.generate(task)` and maps the normalized result
  back to the exact JSON shape the React frontend already expects — **no frontend
  changes required**.
- The router iterates an ordered **provider chain** per task (e.g. Gemini → OpenAI →
  local Ollama). The first provider that succeeds wins. A *retryable* error (rate
  limit, network) consumes a retry with exponential backoff; a *hard* error
  (bad key, content blocked) short-circuits the chain.
- A per-provider **circuit breaker** opens after 5 consecutive failures so a dead
  provider doesn't stall requests.

## Configuring providers (precedence: env → file → default)

Set keys via environment variables (highest precedence) or `storymagic.config.json`
(file precedence). **No provider is mandatory** — the server boots with zero keys and
fails lazily per request with a typed error.

```
# .env / environment
SM_CONFIG_PATH=./storymagic.config.json
SM_PROVIDER_GEMINI_API_KEY=...          # enables Gemini text + image (Imagen)
SM_PROVIDER_OPENAI_API_KEY=...          # enables OpenAI text + image (gpt-image-1)
SM_PROVIDER_ANTHROPIC_API_KEY=...       # enables Anthropic text
SM_PROVIDER_LOCAL_BASE_URL=http://localhost:11434   # enables local Ollama (no key)

# Optional per-task model overrides
SM_PROVIDER_GEMINI_MODELS_PAGE=gemini-2.0-flash
SM_PROVIDER_OPENAI_MODELS_IMAGE=gpt-image-1
SM_PROVIDER_LOCAL_MODELS_PAGE=llama3.1:8b
```

See `.env.example` and `storymagic.config.json` for the full shape. Model IDs are
remapped off AI-Studio aliases (e.g. `gemini-3.5-flash` → `gemini-2.0-flash`) so the
app runs outside AI Studio.

## Block-overcoming (audit fixes)

| Audit block | Router behavior |
|---|---|
| A — image gated behind a fake "Set Paid Key" SVG | Image is a normal routed task. Failure returns `{ imageUrl: '', unavailable: true, errorType }` — never a paywall SVG. |
| B — only fallback was a 2nd Gemini model | Cross-vendor ordered chain (`page`: Gemini→OpenAI→local, `image`: OpenAI→Gemini). |
| C — required `GEMINI_API_KEY` + `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` host gate | Server boots with no key; `metadata.json` capability renamed to `SERVER_SIDE_MODEL_ROUTER`. |
| D — errors swallowed beyond `e.message` | Every failure is a typed `RouterError` (`errorType` + `detail`) surfaced to the client. |

## Switching providers

Edit `storymagic.config.json` `policies.<task>.chain` to reorder providers, or just
set/unset the relevant `SM_PROVIDER_*_API_KEY`. No code change needed.

## Tests

```
npm run test        # runs router + HTTP-contract + smoke tests (supertest, no network)
npm run test:router # router fallback/error logic + legacy-shape HTTP contract
npm run test:smoke  # zero-provider graceful degradation
```

## Files

- `src/router/types.ts` — core types, `RouterError` taxonomy, result guards
- `src/router/config.ts` — `loadConfig()` with env→file→default precedence
- `src/router/sanitizer.ts`, `classifier.ts`, `breaker.ts` — shared helpers
- `src/router/adapters/{gemini,openai,anthropic,local}.ts` — provider adapters
- `src/router/index.ts` — `ModelRouter` + `buildRouter()`
- `server.ts` — thin Express handlers using the router (exports `createStoryMagicApp()`)
