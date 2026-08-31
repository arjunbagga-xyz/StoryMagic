import { err, type RouterError, type RouterErrorType } from './types';

// Normalizes vendor SDK errors -> RouterErrorType. This is the single place that turns
// "Gemini said 429 quota" into QUOTA_EXCEEDED so handlers/UI can react instead of burying it.
export class ErrorClassifier {
  breakerOpen(provider: string): RouterError {
    return err('PROVIDER_UNREACHABLE', `Circuit breaker open for provider "${provider}"`, {
      provider,
      retryable: false,
    });
  }

  noProvider(task: string): RouterError {
    return err('NO_PROVIDER_AVAILABLE', `No provider in the chain could serve task "${task}"`, {
      retryable: false,
    });
  }

  noKey(provider: string): RouterError {
    return err('AUTH_INVALID', `Provider "${provider}" has no API key configured`, {
      provider,
      retryable: false,
    });
  }

  classifyGeminiError(e: unknown, provider: string, model: string): RouterError {
    return this.classify(e, provider, model);
  }

  /** Vendor-neutral classifier used by all adapters. */
  classify(e: unknown, provider: string, model: string): RouterError {
    return mapProviderError(e, provider, model, {
      modelNotFoundErrorSubstrings: ['not found', 'models/', 'does not exist', '404'],
      noKeySubstrings: ['api key', 'apikey', 'permission', 'unauthenticated', '401', '403', 'incorrect api key', 'invalid api key'],
    });
  }
}

interface ClassifyHints {
  modelNotFoundErrorSubstrings: string[];
  noKeySubstrings: string[];
}

function mapProviderError(e: unknown, provider: string, model: string, hints: ClassifyHints): RouterError {
  const ee = e as any;
  const status = ee?.status ?? ee?.statusCode ?? ee?.error?.status;
  const code = ee?.error?.code ?? ee?.code;
  const msg: string =
    ee?.message ||
    ee?.error?.message ||
    (typeof ee === 'string' ? ee : '') ||
    'Unknown provider error';
  const detail = `${msg}`.toLowerCase();

  // Network / timeout → unreachable, retryable
  if (
    ee?.name === 'FetchError' ||
    ee?.code === 'ECONNRESET' ||
    ee?.code === 'ETIMEDOUT' ||
    ee?.code === 'ENOTFOUND' ||
    detail.includes('fetch failed') ||
    detail.includes('network') ||
    detail.includes('timeout') ||
    detail.includes('timed out') ||
    detail.includes('econnreset')
  ) {
    return err('PROVIDER_UNREACHABLE', msg, { provider, model, retryable: true, raw: e });
  }

  // Status codes
  if (status === 401 || status === 403 || code === 401 || code === 403 || hasAny(detail, hints.noKeySubstrings)) {
    return err('AUTH_INVALID', msg, { provider, model, retryable: false, raw: e });
  }
  if (status === 429 || code === 429) {
    if (detail.includes('quota') || detail.includes('limit') || detail.includes('exceeded') || detail.includes('billing')) {
      return err('QUOTA_EXCEEDED', msg, { provider, model, retryable: false, raw: e });
    }
    return err('RATE_LIMITED', msg, { provider, model, retryable: true, raw: e });
  }
  if (status === 404 || hasAny(detail, hints.modelNotFoundErrorSubstrings)) {
    return err('MODEL_NOT_FOUND', msg, { provider, model, retryable: false, raw: e });
  }

  // Content / safety filtering
  if (
    detail.includes('content') && (detail.includes('block') || detail.includes('filter') || detail.includes('safety')) ||
    detail.includes('prompt was blocked') ||
    detail.includes('response blocked')
  ) {
    return err('CONTENT_BLOCKED', msg, { provider, model, retryable: false, raw: e });
  }

  // Generic — treat as non-retryable provider error
  return err('BAD_RESPONSE', msg, { provider, model, retryable: false, raw: e });
}

function hasAny(s: string, subs: string[]): boolean {
  return subs.some((sub) => s.includes(sub.toLowerCase()));
}

// Type-only re-export so adapters can import the union without a circular import issue.
export type { RouterErrorType };
