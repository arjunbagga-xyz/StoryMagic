import fs from 'fs';
import path from 'path';
import type { RoutePolicy, TaskName } from './types';

// Configuration for the model router.
// Precedence (highest wins): runtime env var -> storymagic.config.json file -> built-in default.

export interface ProviderConfig {
  apiKey?: string;
  models?: Record<string, string>;   // task -> provider-native model id
  baseUrl?: string;                  // for OpenAI-compatible / local endpoints
}

export interface RouterConfig {
  providers: {
    gemini?: ProviderConfig;
    openai?: ProviderConfig;
    anthropic?: ProviderConfig;
    local?: Omit<ProviderConfig, 'apiKey'>; // no key
    // OpenAI-compatible endpoints (Nous inference API, OpenRouter, etc.) reuse the OpenAI adapter.
    nous?: ProviderConfig;
    openrouter?: ProviderConfig;
  };
  policies: Record<TaskName, RoutePolicy>;
  sanitize?: boolean;
}

const DEFAULT_MODELS: Record<string, string> = {
  page: 'gemini-2.0-flash',
  'define-word': 'gemini-2.0-flash',
  translate: 'gemini-2.0-flash',
  image: 'imagen-3.0-generate-002',
};

function defaultConfig(): RouterConfig {
  return {
    providers: {
      // Gemini defaults use real GA model ids (not AI-Studio-only aliases like gemini-3.5-flash).
      gemini: {
        models: { ...DEFAULT_MODELS },
      },
      openai: {
        models: {
          page: 'gpt-4o-mini',
          'define-word': 'gpt-4o-mini',
          translate: 'gpt-4o-mini',
          image: 'gpt-image-1',
        },
      },
      anthropic: {
        models: {
          page: 'claude-3-5-haiku-latest',
          'define-word': 'claude-3-5-haiku-latest',
          translate: 'claude-3-5-haiku-latest',
        },
      },
      local: {
        // No baseUrl by default: the local/Ollama adapter only registers when the user sets
        // SM_PROVIDER_LOCAL_BASE_URL (or a config file entry). This keeps "boot with zero keys"
        // truly zero-provider unless Ollama is explicitly wired up.
        models: {
          page: 'llama3.1:8b',
          'define-word': 'llama3.1:8b',
          translate: 'llama3.1:8b',
        },
      },
      // OpenAI-compatible proxies. Both ride the OpenAIAdapter with a custom baseUrl.
      // Nous (Nous Research inference API) and OpenRouter share the OpenAI chat+images shape.
      nous: {
        // Default model mirrors the Hermes instance's active model; override per-task via
        // SM_PROVIDER_NOUS_MODELS_PAGE etc. if your Nous account exposes a different slug.
        models: {
          page: 'tencent/hy3:free',
          'define-word': 'tencent/hy3:free',
          translate: 'tencent/hy3:free',
          image: 'tencent/hy3:free', // Nous is text-only; router skips it for image chains
        },
      },
      openrouter: {
        models: {
          page: 'openai/gpt-4o-mini',
          'define-word': 'openai/gpt-4o-mini',
          translate: 'openai/gpt-4o-mini',
          image: 'openai/dall-e-3',
        },
      },
    },
    // Default chains: lead with Nous (OpenAI-compatible, keyed from the Hermes instance),
    // fall back across vendors, end on local Ollama. Gemini is demoted to last-resort only
    // because StoryMagic is no longer Gemini-locked.
    policies: {
      page: {
        task: 'page',
        chain: [
          { provider: 'nous', retries: 2, backoffMs: 600 },
          { provider: 'openrouter', retries: 2, backoffMs: 600 },
          { provider: 'openai', retries: 2, backoffMs: 600 },
          { provider: 'local', retries: 1 },
        ],
        sanitize: true,
      },
      'define-word': {
        task: 'define-word',
        chain: [
          { provider: 'nous', retries: 2, backoffMs: 600 },
          { provider: 'openrouter', retries: 2, backoffMs: 600 },
          { provider: 'openai', retries: 2, backoffMs: 600 },
        ],
        sanitize: true,
      },
      translate: {
        task: 'translate',
        chain: [
          { provider: 'nous', retries: 2, backoffMs: 600 },
          { provider: 'openrouter', retries: 2, backoffMs: 600 },
          { provider: 'anthropic', retries: 2, backoffMs: 600 },
        ],
      },
      image: {
        task: 'image',
        chain: [
          { provider: 'openrouter', retries: 2, backoffMs: 600 },
          { provider: 'openai', retries: 2, backoffMs: 600 },
          { provider: 'gemini', retries: 2, backoffMs: 600 },
        ],
      },
    },
  };
}

// ---- Env overrides (highest precedence) ----
// SM_CONFIG_PATH=./storymagic.config.json
// SM_PROVIDER_GEMINI_API_KEY=...
// SM_PROVIDER_GEMINI_MODELS_PAGE=gemini-2.0-flash
// SM_PROVIDER_OPENAI_API_KEY=...  (and SM_PROVIDER_OPENAI_BASE_URL for compatible endpoints)
// SM_PROVIDER_ANTHROPIC_API_KEY=...
// SM_PROVIDER_LOCAL_BASE_URL=http://localhost:11434
// SM_PROVIDER_LOCAL_MODELS_PAGE=llama3.1:8b
const PROVIDER_KEYS: Array<keyof RouterConfig['providers']> = ['gemini', 'openai', 'anthropic', 'local', 'nous', 'openrouter'];
const TASKS: TaskName[] = ['page', 'define-word', 'translate', 'image'];

function readEnvOverrides(): Partial<RouterConfig> {
  const providers: RouterConfig['providers'] = {};
  for (const prov of PROVIDER_KEYS) {
    const cfg: Record<string, any> = {};
    const apiKey = process.env[`SM_PROVIDER_${prov.toUpperCase()}_API_KEY`];
    if (apiKey) cfg.apiKey = apiKey;
    const baseUrl = process.env[`SM_PROVIDER_${prov.toUpperCase()}_BASE_URL`];
    if (baseUrl) cfg.baseUrl = baseUrl;
    const models: Record<string, string> = {};
    let hasModels = false;
    for (const task of TASKS) {
      const m = process.env[`SM_PROVIDER_${prov.toUpperCase()}_MODELS_${task.replace(/-/g, '_').toUpperCase()}`];
      if (m) { models[task] = m; hasModels = true; }
    }
    if (hasModels) cfg.models = models;
    if (Object.keys(cfg).length > 0) (providers as any)[prov] = cfg;
  }
  return Object.keys(providers).length ? { providers } : {};
}

// ---- File override (middle precedence) ----
function readConfigFile(explicitPath?: string): Partial<RouterConfig> {
  const candidates = [
    explicitPath,
    process.env.SM_CONFIG_PATH,
    'storymagic.config.json',
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    try {
      const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
      if (fs.existsSync(abs)) {
        const raw = fs.readFileSync(abs, 'utf8');
        return JSON.parse(raw) as Partial<RouterConfig>;
      }
    } catch (e) {
      console.warn(`[router] failed to read config file ${p}:`, (e as Error).message);
    }
  }
  return {};
}

function deepMerge<T>(base: T, ...overrides: Array<Partial<T> | undefined>): T {
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
  for (const ov of overrides) {
    if (!ov) continue;
    for (const k of Object.keys(ov) as Array<keyof T>) {
      const v = (ov as any)[k];
      if (v === undefined) continue;
      if (v && typeof v === 'object' && !Array.isArray(v) && typeof out[k] === 'object' && !Array.isArray(out[k])) {
        out[k] = deepMerge(out[k], v);
      } else {
        out[k] = v;
      }
    }
  }
  return out as T;
}

export function loadConfig(): RouterConfig {
  const file = readConfigFile(process.env.SM_CONFIG_PATH);
  const env = readEnvOverrides();
  // env wins over file wins over defaults
  const merged = deepMerge(defaultConfig(), file, env);
  if (process.env.SM_SANITIZE === 'false') merged.sanitize = false;
  return merged;
}
