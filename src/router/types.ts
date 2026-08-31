// Core types for the provider-agnostic model router.
// The router never throws for a provider failure; it returns a typed RouterError
// so handlers can map it to the frontend contract (fixes BLOCK D from the audit).

export type Modality = 'text' | 'image';

export type RouterErrorType =
  | 'AUTH_INVALID'        // 401/403 from provider — bad/empty key
  | 'QUOTA_EXCEEDED'      // 429 with quota/limit reason
  | 'RATE_LIMITED'        // 429 throttled, retryable
  | 'CONTENT_BLOCKED'     // provider safety filter rejected prompt
  | 'SCHEMA_UNSUPPORTED'  // this provider can't do structured output for the task
  | 'PROVIDER_UNREACHABLE'// network/DNS/timeout
  | 'MODEL_NOT_FOUND'     // model id unresolved (e.g. AI-Studio alias off-host)
  | 'BAD_RESPONSE'        // response didn't match schema / parse failed
  | 'NO_PROVIDER_AVAILABLE'; // every link in the chain failed

export interface RouterError {
  ok: false;
  errorType: RouterErrorType;
  message: string;
  provider?: string;
  model?: string;
  retryable: boolean;
  raw?: unknown;
}

export interface JsonField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  items?: 'string' | 'number' | 'boolean'; // for array
  description?: string;
}

export interface JsonSchema {
  fields: JsonField[];
  required: string[];
  rootIsArray?: false;
}

// ---- Text requests / results ----
export type TaskName = 'page' | 'define-word' | 'translate' | 'image';

export interface TextRequest {
  task: 'page' | 'define-word' | 'translate';
  prompt: string;             // already sanitized by router
  schema?: JsonSchema;        // if set, response MUST be valid JSON matching it
  params?: Record<string, unknown>; // pass-through (age, langs, etc.) for logging/metrics
  opts?: { maxTokens?: number; temperature?: number; seed?: number };
  modelOverride?: string;     // set by the router from a policy step's `model`
}

export interface TextResult {
  ok: true;
  text: string;               // raw model text (the handler parses JSON if schema set)
  provider: string;
  model: string;
  usage?: { promptTokens?: number; completionTokens?: number };
}

// ---- Image requests / results ----
export interface ImageRequest {
  task: 'image';
  prompt: string;             // sanitized
  opts?: { count?: number; mimeType?: 'image/jpeg' | 'image/png'; aspectRatio?: '4:3' | '1:1' | '16:9' };
}

export interface ImageResult {
  ok: true;
  imageUrl: string;           // base64 data URL (matches server.ts history)
  provider: string;
  model: string;
}

export type RouterResult = TextResult | ImageResult | RouterError;

// Type guards for safe narrowing of RouterResult.
export function isOk(r: RouterResult): r is TextResult | ImageResult {
  return r.ok === true;
}
export function isErr(r: RouterResult): r is RouterError {
  return r.ok === false;
}

// ---- Routing policy (per-task fallback chain — fixes BLOCK B) ----
export interface ProviderStep {
  provider: string;          // adapter registry key
  model?: string;            // override capabilities.modelFor
  retries?: number;          // per-step retry tuning
  backoffMs?: number;
}

export interface RoutePolicy {
  task: TaskName;
  chain: ProviderStep[];     // ordered; first ok wins
  sanitize?: boolean;        // default true
  schema?: JsonSchema;       // attached to every text step
}

export interface ProviderCapabilities {
  text: boolean;
  image: boolean;
  structuredOutput: boolean;
  maxOutputTokens: number;
  modelFor: (task: string) => string;
}

export abstract class ProviderAdapter {
  abstract readonly name: string;
  abstract capabilities: ProviderCapabilities;

  /** Text generation. Must return RouterError, never throw. */
  abstract generateText(req: TextRequest): Promise<TextResult | RouterError>;

  /** Image generation. Default returns SCHEMA_UNSUPPORTED-style error if not image-capable. */
  generateImage?(req: ImageRequest): Promise<ImageResult | RouterError>;

  /** Lightweight liveness check for circuit-breaker half-open probes. */
  healthCheck?(): Promise<boolean>;
}

// Helper to build a typed error uniformly.
export function err(
  errorType: RouterErrorType,
  message: string,
  opts: { provider?: string; model?: string; retryable?: boolean; raw?: unknown } = {},
): RouterError {
  return {
    ok: false,
    errorType,
    message,
    retryable: opts.retryable ?? false,
    provider: opts.provider,
    model: opts.model,
    raw: opts.raw,
  };
}
