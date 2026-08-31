# StoryMagic Model Router — Configuration & Use Guide

This guide explains how to configure API keys, choose which AI provider
serves each feature, add a new provider, and understand how generation
blocks/errors are handled in the new StoryMagic model router.

> **Audience:** end users and operators. You do not need to read the
> source to configure keys or switch providers — everything below is
> driven by environment variables or a single JSON config file.

---

## Current status (read this first)

The router is being rolled out in layers. As of this writing:

- **Implemented:**
  - `src/router/config.ts` — key loading, provider config, per-task
    fallback chains, and the env → file → default precedence
    (`loadConfig()`).
  - `src/router/types.ts` — the provider/config/error type contracts
    (`ProviderAdapter`, `RoutePolicy`, `RouterError`, `TaskName`, …).
  - `src/router/classifier.ts` — turns every provider error into a
    typed `RouterError` (this is what makes blocks visible instead of
    silently swallowed).
  - `src/router/sanitizer.ts` — shared prompt sanitizer.
  - `src/router/breaker.ts` — per-provider `CircuitBreaker` that skips
    a provider after repeated failures and probes it again after cooldown.
  - `src/router/adapters/{gemini,openai,anthropic,local}.ts` — the four
    `ProviderAdapter` implementations for each task's modality.
- **Wired and live:** the **orchestrator/registry** (`src/router/index.ts`
  `buildRouter()` + `ModelRouter.generate()`) constructs the adapters from
  config and executes each task's fallback chain, and `server.ts` now calls
  the router instead of `@google/genai` directly. All four endpoints
  (`/api/generate-page`, `/api/define-word`, `/api/translate-text`,
  `/api/generate-image`) route through the provider-agnostic router.

**What this means for you:** the configuration system described below is
live. Set up your keys and your `storymagic.config.json` and they take
effect immediately on the next server start — no further code changes
needed. Where a step is config-only vs. requires a code change, it is
called out.

---

## 1. Where to place API keys

There are two places, and they stack. The router reads them at startup
via `loadConfig()` (`src/router/config.ts`).

### Option A — `.env` (recommended for local dev)

`server.ts` already does `import 'dotenv/config'`, so any variable in
the project-root `.env` is picked up. Add the relevant
`SM_PROVIDER_*` lines (see per-provider table in §4). Example:

```dotenv
# .env  (project root)
SM_PROVIDER_GEMINI_API_KEY=AIzaSyD-xxxxxxxxxxxxxxxxxxxx
SM_PROVIDER_OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
SM_PROVIDER_ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx
# Local Ollama needs no key, only a base URL (defaults to localhost:11434)
```

The old `GEMINI_API_KEY` is the legacy single-provider variable and is
**not** read by the router. Use the `SM_PROVIDER_*` form instead.

### Option B — `storymagic.config.json` (recommended for deployment / multiple providers)

Create a file (default name `storymagic.config.json` in the project
root, or point `SM_CONFIG_PATH` at any path) with your keys and model
choices. See §5 for a full example.

```json
{
  "providers": {
    "gemini": { "apiKey": "AIzaSyD-xxxxxxxxxxxxxxxxxxxx" },
    "openai": { "apiKey": "sk-xxxxxxxxxxxxxxxxxxxx" }
  }
}
```

> **Precedence (highest wins):** runtime environment variable →
> `storymagic.config.json` → built-in default. So an env var always
> overrides the same key in the JSON file, which overrides the default.

---

## 2. How to select the active provider

Each StoryMagic feature ("task") has a **fallback chain** — an ordered
list of providers. The router tries them in order; the first one that
returns a usable result wins. To make a provider the *default* for a
feature, put it **first** in that task's chain.

The four tasks and their built-in default chains are:

| Task (`task` key) | Default chain (first tried first)        |
|-------------------|------------------------------------------|
| `page`            | gemini → openai → local                  |
| `define-word`     | gemini → openai                          |
| `translate`       | gemini → openai → anthropic              |
| `image`           | openai → gemini                          |

### Change the active provider (config-only, takes effect on next start)

Reorder the chain in `storymagic.config.json`. Example — make OpenAI the
primary page/translate provider and drop Gemini:

```json
{
  "providers": {
    "openai":  { "apiKey": "sk-xxxxxxxxxxxxxxxxxxxx" },
    "gemini":  { "apiKey": "AIzaSyD-xxxxxxxxxxxxxxxxxxxx" }
  },
  "policies": {
    "page":     { "task": "page",     "chain": [ { "provider": "openai" }, { "provider": "gemini" } ] },
    "translate":{ "task": "translate","chain": [ { "provider": "openai" }, { "provider": "anthropic" } ] }
  }
}
```

To **force a single provider** and disable fallback, list only that one
step in the chain.

To **disable a provider**, either remove it from the chain or omit its
key — a provider with no key (for the keyed vendors) is skipped.

### Keyed vs. keyless providers

- `gemini`, `openai`, `anthropic` require an `apiKey` to be usable.
- `local` (Ollama) requires **no key** — only a reachable `baseUrl`
  (default `http://localhost:11434`).

---

## 3. Adding a new provider

At the **configuration level** (what an operator does), a provider is
just an entry under `providers` plus a reference in a task chain:

```json
{
  "providers": {
    "openai": { "apiKey": "sk-...", "baseUrl": "https://api.openai.com/v1" }
  },
  "policies": {
    "page": { "task": "page", "chain": [ { "provider": "openai" } ] }
  }
}
```

Each provider block supports:

| Field      | Meaning                                                        |
|------------|----------------------------------------------------------------|
| `apiKey`   | Provider API key (not needed for `local`).                     |
| `baseUrl`  | Override the endpoint — use this for OpenAI-compatible proxies |
|            | or self-hosted gateways (e.g. LiteLLM, Together, Groq).        |
| `models`   | Map of `task → provider-native model id` (see §4).             |

The recognized provider registry keys today are `gemini`, `openai`,
`anthropic`, and `local`. **Adding a brand-new vendor beyond those four
requires an engineering step** — a `ProviderAdapter` subclass plus a
registry entry in `src/router` — which is part of the pending wiring.
Configuration alone cannot invent a new code adapter.

---

## 4. Per-provider reference (env vars & default models)

All env vars follow the shape
`SM_PROVIDER_<PROVIDER>_API_KEY`,
`SM_PROVIDER_<PROVIDER>_BASE_URL`, and per-task model overrides
`SM_PROVIDER_<PROVIDER>_MODELS_<TASK>` where `<TASK>` is
`PAGE`, `DEFINE_WORD`, `TRANSLATE`, or `IMAGE`.

### gemini
- Env: `SM_PROVIDER_GEMINI_API_KEY`, optional `SM_PROVIDER_GEMINI_BASE_URL`
- Default models: `page`/`define-word`/`translate` = `gemini-2.0-flash`,
  `image` = `imagen-3.0-generate-002`

### openai
- Env: `SM_PROVIDER_OPENAI_API_KEY`, optional `SM_PROVIDER_OPENAI_BASE_URL`
  (set this to any OpenAI-compatible endpoint)
- Default models: `page`/`define-word`/`translate` = `gpt-4o-mini`,
  `image` = `gpt-image-1`

### anthropic
- Env: `SM_PROVIDER_ANTHROPIC_API_KEY`, optional `SM_PROVIDER_ANTHROPIC_BASE_URL`
- Default models: `page`/`define-word`/`translate` = `claude-3-5-haiku-latest`
  (Anthropic has no image task in the default chain)

### local (Ollama)
- Env: `SM_PROVIDER_LOCAL_BASE_URL` (default `http://localhost:11434`),
  optional `SM_PROVIDER_LOCAL_MODELS_PAGE` etc.
- Default models: `page`/`define-word`/`translate` = `llama3.1:8b`
- No API key required.

### Example: override a single model via env
```dotenv
SM_PROVIDER_OPENAI_MODELS_PAGE=gpt-4o          # use gpt-4o for page gen
SM_PROVIDER_LOCAL_BASE_URL=http://192.168.1.50:11434
```

---

## 5. Full `storymagic.config.json` example

```json
{
  "providers": {
    "gemini":   { "apiKey": "AIzaSyD-xxxx" },
    "openai":   { "apiKey": "sk-xxxx", "baseUrl": "https://api.openai.com/v1" },
    "anthropic":{ "apiKey": "sk-ant-xxxx" },
    "local":    { "baseUrl": "http://localhost:11434",
                  "models": { "page": "llama3.1:8b", "define-word": "llama3.1:8b", "translate": "llama3.1:8b" } }
  },
  "policies": {
    "page":       { "task": "page",       "chain": [ { "provider": "gemini", "retries": 2, "backoffMs": 600 },
                                                      { "provider": "openai",  "retries": 2, "backoffMs": 600 },
                                                      { "provider": "local",   "retries": 1 } ] },
    "define-word": { "task": "define-word","chain": [ { "provider": "gemini" }, { "provider": "openai" } ] },
    "translate":   { "task": "translate",  "chain": [ { "provider": "gemini" }, { "provider": "openai" }, { "provider": "anthropic" } ] },
    "image":       { "task": "image",      "chain": [ { "provider": "openai" }, { "provider": "gemini" } ] }
  },
  "sanitize": true
}
```

Point at a non-default path with `SM_CONFIG_PATH=/abs/path/to/config.json`.

---

## 6. How blocks and errors are handled

This is the router's core fix for "silent failures": **no provider error
is swallowed.** Every failed attempt becomes a typed `RouterError`
(`src/router/types.ts` + `src/router/classifier.ts`), and the chain
either retries the next provider or reports a clear reason to the UI.

### Error taxonomy (`RouterErrorType`)

| Error type            | Meaning                                            | Retryable? | Chain behavior                         |
|-----------------------|----------------------------------------------------|------------|----------------------------------------|
| `AUTH_INVALID`        | 401/403 or missing key                             | No         | Move to next provider in chain         |
| `QUOTA_EXCEEDED`      | 429 with quota/limit/billing reason                | No         | Move to next provider                  |
| `RATE_LIMITED`        | 429 throttle                                       | Yes        | Retry per-step (`retries`/`backoffMs`) |
| `CONTENT_BLOCKED`     | Provider safety filter rejected the prompt         | No         | Move to next provider                  |
| `SCHEMA_UNSUPPORTED`  | Provider can't do structured output for the task   | No         | Move to next provider                  |
| `PROVIDER_UNREACHABLE`| Network/DNS/timeout                                | Yes        | Retry, then move to next provider      |
| `MODEL_NOT_FOUND`     | Model id unresolved (e.g. AI-Studio alias off-host) | No         | Move to next provider                  |
| `BAD_RESPONSE`       | Response didn't match the expected schema          | No         | Move to next provider                  |
| `NO_PROVIDER_AVAILABLE`| Every link in the chain failed                    | No         | Final error returned to the UI         |

### Practical implications
- **Quota / "set a paid key" blocks:** instead of the old SVG fallback
  prompting for a paid key, the router marks `QUOTA_EXCEEDED` and falls
  through to the next provider in the chain (e.g. OpenAI). If all fail,
  the UI gets `NO_PROVIDER_AVAILABLE` with a clear `errorType`.
- **Rate limits:** `RATE_LIMITED` is retried within the step using that
  step's `retries`/`backoffMs` before falling through.
- **Content blocks:** a safety rejection on one provider automatically
  tries the next provider rather than killing the request.
- **Unreachable / timeout:** retried, then falls through — so a dead
  Ollama instance won't hang the app.

Each `RouterError` carries `errorType`, `message`, `provider`, `model`,
and `retryable`, so the frontend can show a precise, actionable message
instead of a generic failure.

---

## 7. Prompt sanitization

By default every prompt is run through `PromptSanitizer`
(`src/router/sanitizer.ts`), which strips instruction-injection patterns
(e.g. "ignore the instructions / override the rules / blacklist") and
angle/single/double quotes before being sent to any provider. This is
enabled unless you set `SM_SANITIZE=false` (or `"sanitize": false` in the
config file). Per-task `sanitize` can also be set inside a policy's
`chain` step.

---

## 8. Quick reference — all env vars

```dotenv
# --- provider keys ---
SM_PROVIDER_GEMINI_API_KEY=...
SM_PROVIDER_OPENAI_API_KEY=...
SM_PROVIDER_ANTHROPIC_API_KEY=...

# --- custom/base URLs (OpenAI-compatible proxies, self-hosted, etc.) ---
SM_PROVIDER_OPENAI_BASE_URL=https://api.openai.com/v1
SM_PROVIDER_ANTHROPIC_BASE_URL=https://api.anthropic.com
SM_PROVIDER_LOCAL_BASE_URL=http://localhost:11434

# --- per-task model overrides (TASK = PAGE | DEFINE_WORD | TRANSLATE | IMAGE) ---
SM_PROVIDER_GEMINI_MODELS_PAGE=gemini-2.0-flash
SM_PROVIDER_OPENAI_MODELS_IMAGE=gpt-image-1
SM_PROVIDER_LOCAL_MODELS_TRANSLATE=llama3.1:8b

# --- global ---
SM_CONFIG_PATH=./storymagic.config.json   # default if omitted
SM_SANITIZE=false                          # disable prompt sanitizer
```

---

## 9. Troubleshooting

- **Nothing happens / still hits Gemini directly:** confirm the provider
  you intend to use has a valid key set (env `SM_PROVIDER_<NAME>_API_KEY`
  or in `storymagic.config.json`) and is present in the task's `chain`.
  The server boots with zero providers registered and degrades gracefully
  (typed `NO_PROVIDER_AVAILABLE`), so a missing key looks like a no-op.
  Verify
  your keys are read by checking the startup logs for router config
  loading.
- **`AUTH_INVALID` on a provider:** the key for that provider is empty or
  wrong — set `SM_PROVIDER_<NAME>_API_KEY` or the JSON `apiKey`.
- **`MODEL_NOT_FOUND`:** the model id isn't valid on that provider's
  account/region — override it with `SM_PROVIDER_<NAME>_MODELS_<TASK>`.
- **`NO_PROVIDER_AVAILABLE`:** every provider in the chain failed — check
  keys, base URLs, and that at least one provider is present in the
  chain for the task.
