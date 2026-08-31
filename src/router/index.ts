import { CircuitBreaker } from './breaker';
import { ErrorClassifier } from './classifier';
import { PromptSanitizer } from './sanitizer';
import { type RouterConfig } from './config';
import {
  type ImageRequest,
  type ProviderAdapter,
  type RouterResult,
  type TaskName,
  type TextRequest,
  type ProviderStep,
  type RoutePolicy,
  isErr,
} from './types';
import { GoogleGenAI } from '@google/genai';
import { GeminiAdapter } from './adapters/gemini';
import { OpenAIAdapter } from './adapters/openai';
import { AnthropicAdapter } from './adapters/anthropic';
import { LocalAdapter } from './adapters/local';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Single stable surface the handlers call. Iterates a per-task provider chain with retry,
// backoff, and circuit breaking. Never throws for provider failures.
export class ModelRouter {
  private sanitizer = new PromptSanitizer();
  private classifier = new ErrorClassifier();
  private breaker = new CircuitBreaker();

  constructor(
    private adapters: Map<string, ProviderAdapter>,
    private policies: Record<TaskName, RoutePolicy>,
  ) {}

  async generate(req: TextRequest | ImageRequest): Promise<RouterResult> {
    const policy = this.policies[req.task];
    if (!policy) {
      return this.classifier.noProvider(req.task);
    }
    const prompt = policy.sanitize !== false ? this.sanitizer.clean(req.prompt) : req.prompt;

    let lastErr: RouterResult | null = null;
    for (const step of policy.chain) {
      const adapter = this.adapters.get(step.provider);
      if (!adapter) {
        console.warn(`[router] unknown provider "${step.provider}" in chain for task ${req.task}`);
        continue;
      }
      if (req.task === 'image' && !adapter.capabilities.image) continue; // skip text-only links
      if (this.breaker.isOpen(step.provider)) {
        lastErr = this.classifier.breakerOpen(step.provider);
        continue;
      }

      // Apply per-step model override on a cloned request.
      const stepReq = step.model ? ({ ...req, modelOverride: step.model } as TextRequest | ImageRequest) : req;
      const stepWork: (a: ProviderAdapter) => Promise<RouterResult> = req.task === 'image'
        ? (a) => Promise.resolve(a.generateImage!(stepReq as ImageRequest))
        : (a) => a.generateText({ ...(stepReq as TextRequest), prompt, schema: policy.schema } as TextRequest);

      const res = await this.tryWithRetry(() => stepWork(adapter), step.retries ?? 1, step.backoffMs ?? 500);
      if (!isErr(res)) {
        this.breaker.recordSuccess(step.provider);
        return res;
      }
      lastErr = res;
      this.breaker.recordFailure(step.provider);
      if (!res.retryable) break; // hard fail (e.g. AUTH_INVALID) -> don't burn the rest of the chain
    }
    return (lastErr as RouterResult) ?? this.classifier.noProvider(req.task);
  }

  private async tryWithRetry(
    fn: () => Promise<RouterResult>,
    n: number,
    backoff: number,
  ): Promise<RouterResult> {
    let r = await fn();
    for (let i = 0; i < n && isErr(r) && r.retryable; i++) {
      await sleep(backoff * Math.pow(2, i)); // exponential backoff
      r = await fn();
    }
    return r;
  }
}

// ---- Build a router from loaded config ----
// NO provider is mandatory. Adapters are only registered when they have a usable key (or are
// the keyless local/Ollama adapter). The server boots without any key and fails lazily per-request.
export function buildRouter(config: RouterConfig): { router: ModelRouter; registered: string[] } {
  const adapters = new Map<string, ProviderAdapter>();
  const registered: string[] = [];

  const g = config.providers.gemini;
  if (g?.apiKey) {
    adapters.set('gemini', new GeminiAdapter(new GoogleGenAI({ apiKey: g.apiKey }), g.models ?? {}));
    registered.push('gemini');
  }

  const o = config.providers.openai;
  if (o?.apiKey) {
    adapters.set('openai', new OpenAIAdapter(o.apiKey, o.models ?? {}, o.baseUrl));
    registered.push('openai');
  }

  // OpenAI-compatible endpoints (Nous inference API, OpenRouter, LiteLLM, etc.) reuse the
  // OpenAIAdapter with a custom baseUrl. A baseUrl is required for these (no default).
  const n = config.providers.nous;
  if (n?.apiKey && n?.baseUrl) {
    adapters.set('nous', new OpenAIAdapter(n.apiKey, n.models ?? {}, n.baseUrl));
    registered.push('nous');
  }
  const or = config.providers.openrouter;
  if (or?.apiKey && or?.baseUrl) {
    adapters.set('openrouter', new OpenAIAdapter(or.apiKey, or.models ?? {}, or.baseUrl));
    registered.push('openrouter');
  }

  const a = config.providers.anthropic;
  if (a?.apiKey) {
    adapters.set('anthropic', new AnthropicAdapter(a.apiKey, a.models ?? {}, a.baseUrl));
    registered.push('anthropic');
  }

  const l = config.providers.local;
  if (l?.baseUrl) {
    // Local Ollama always available if a base URL is set (no key required).
    adapters.set('local', new LocalAdapter(l.baseUrl, l.models ?? {}));
    registered.push('local');
  }

  const router = new ModelRouter(adapters, config.policies);
  return { router, registered };
}
