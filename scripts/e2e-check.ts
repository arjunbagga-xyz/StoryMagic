// Live end-to-end check for the StoryMagic model router.
//
// Boots the REAL Express server (server.ts handlers + ModelRouter) and drives it with
// scriptable fake adapters to PROVE the acceptance criteria without spending any API money:
//   1. BLOCK OVERCOMING   — primary provider is unreachable (retryable block), fallback succeeds,
//                           the request still returns a 200 with the legacy JSON shape.
//   2. GRACEFUL IMAGE FAIL — image generation failure returns { imageUrl:'', unavailable:true,
//                           errorType } and NEVER a fake paid-key SVG.
//   3. NO-KEY DEGRADATION — with zero providers registered, the server boots and a request
//                           returns a typed NO_PROVIDER_AVAILABLE instead of crashing.
//
// Run with:  npx tsx scripts/e2e-check.ts
// Exit code 0 = all checks passed, 1 = at least one failed.

import { setTestRouter, createStoryMagicApp } from '../server';
import { ModelRouter } from '../src/router/index';
import { loadConfig } from '../src/router/config';
import {
  ProviderAdapter,
  type ProviderCapabilities,
  type RouterError,
  type TextRequest,
  type TextResult,
  type ImageRequest,
  type ImageResult,
} from '../src/router/types';
import request from 'supertest';

// We never start Vite in this check.
process.env.SM_NO_VITE = 'true';

// ---- Scriptable fake adapter (mirrors the router test seam) ----
class FakeAdapter extends ProviderAdapter {
  name: string;
  behavioral: 'ok' | 'blocked' | 'network' | 'auth' = 'ok';
  calls = 0;

  constructor(name: string) {
    super();
    this.name = name;
  }

  capabilities: ProviderCapabilities = {
    text: true,
    image: true,
    structuredOutput: true,
    maxOutputTokens: 4096,
    modelFor: () => 'fake-model',
  };

  private fail(): RouterError {
    switch (this.behavioral) {
      case 'blocked':
        return { ok: false, errorType: 'CONTENT_BLOCKED', message: 'blocked by provider', provider: this.name, retryable: false };
      case 'network':
        return { ok: false, errorType: 'PROVIDER_UNREACHABLE', message: 'network down', provider: this.name, retryable: true };
      case 'auth':
        return { ok: false, errorType: 'AUTH_INVALID', message: 'bad key', provider: this.name, retryable: false };
      default:
        return { ok: false, errorType: 'BAD_RESPONSE', message: 'boom', provider: this.name, retryable: false };
    }
  }

  async generateText(req: TextRequest): Promise<TextResult | RouterError> {
    this.calls++;
    if (this.behavioral !== 'ok') return this.fail();
    const text =
      req.task === 'define-word'
        ? '{"definition":"A brave person.","synonyms":["courageous","bold"],"translation":"valiente"}'
        : '{"storyText":"Once upon a time, a small star learned to shine.","imagePrompt":"A glowing star in a night sky.","isEnd":false,"lessonsCovered":[]}';
    return { ok: true, text, provider: this.name, model: 'fake-model' };
  }

  async generateImage(req: ImageRequest): Promise<ImageResult | RouterError> {
    this.calls++;
    if (this.behavioral !== 'ok') return this.fail();
    return { ok: true, imageUrl: 'data:image/png;base64,AAAA', provider: this.name, model: 'fake-model' };
  }
}

// Build a ModelRouter whose per-task chains are the supplied fake adapters, preserving the real
// default policies (sanitize flags, etc.).
function routerWithFakes(fakes: Record<string, FakeAdapter>): ModelRouter {
  const cfg = loadConfig();
  const chain = Object.keys(fakes).map((n) => ({ provider: n }));
  const policies = {
    page: { task: 'page' as const, chain, sanitize: true },
    'define-word': { task: 'define-word' as const, chain, sanitize: true },
    translate: { task: 'translate' as const, chain },
    image: { task: 'image' as const, chain },
  };
  const adapters = new Map<string, ProviderAdapter>();
  for (const [k, v] of Object.entries(fakes)) adapters.set(k, v);
  return new ModelRouter(adapters, policies as any);
}

// ---- Tiny assertion harness ----
const failures: string[] = [];
function check(cond: boolean, label: string) {
  if (cond) {
    console.log(`  PASS  ${label}`);
  } else {
    console.log(`  FAIL  ${label}`);
    failures.push(label);
  }
}

async function main() {
  console.log('\n=== StoryMagic Model Router — live e2e check ===\n');

  // --- Scenario 1: BLOCK OVERCOMING (primary unreachable, fallback succeeds) ---
  // A transient/retryable provider failure (provider down, rate-limited, network error) is exactly
  // what the cross-vendor fallback chain is for: the router transparently succeeds via the next
  // provider. (Hard, non-retryable blocks like CONTENT_BLOCKED intentionally short-circuit the
  // chain by design — see design §7 — so the "overcome" demo uses a retryable block.)
  console.log('[1] Block overcoming: primary PROVIDER_UNREACHABLE -> fallback returns real content');
  const primary = new FakeAdapter('primary');
  primary.behavioral = 'network';
  const fallback = new FakeAdapter('fallback');
  setTestRouter(routerWithFakes({ primary, fallback }));
  const app1 = await createStoryMagicApp();

  const pageRes = await request(app1)
    .post('/api/generate-page')
    .send({ genre: 'Space Adventure', currentPage: 0, maxPages: 3, age: 7, primaryLang: 'English', supportLang: '' });
  check(pageRes.status === 200, 'generate-page returned HTTP 200 despite primary block');
  check(typeof pageRes.body.storyText === 'string' && pageRes.body.storyText.length > 0, 'generate-page returned legacy storyText field');
  check(typeof pageRes.body.imagePrompt === 'string', 'generate-page returned legacy imagePrompt field');
  check(primary.calls >= 1, 'primary provider was actually attempted (and blocked)');
  check(fallback.calls >= 1, 'fallback provider was invoked once primary was blocked');
  check(pageRes.body.storyText.includes('small star'), 'response content came from the fallback provider');

  // --- Scenario 2: GRACEFUL IMAGE FAILURE ---
  console.log('\n[2] Image failure degrades gracefully (no fake paid-key SVG)');
  const failing = new FakeAdapter('failing');
  failing.behavioral = 'blocked';
  setTestRouter(routerWithFakes({ failing }));
  const app2 = await createStoryMagicApp();

  const imgRes = await request(app2).post('/api/generate-image').send({ prompt: 'a dragon' });
  check(imgRes.status === 200, 'generate-image returned HTTP 200 (not a 500 crash)');
  check(imgRes.body.imageUrl === '', 'generate-image returned empty imageUrl on failure');
  check(imgRes.body.unavailable === true, 'generate-image reported unavailable:true');
  check(imgRes.body.errorType === 'CONTENT_BLOCKED', 'generate-image surfaced typed errorType=CONTENT_BLOCKED');
  check(
    typeof imgRes.body.imageUrl === 'string' && !String(imgRes.body.imageUrl).includes('Set AI Studio Paid Key'),
    'generate-image did NOT emit a paid-key gate SVG',
  );

  // --- Scenario 3: NO-PROVIDER BOOT ---
  console.log('\n[3] Zero-key boot degrades with typed error (server does not crash)');
  const empty = new ModelRouter(new Map(), loadConfig().policies as any);
  setTestRouter(empty);
  const app3 = await createStoryMagicApp();

  const npRes = await request(app3)
    .post('/api/generate-page')
    .send({ genre: 'Space', currentPage: 0, maxPages: 3, age: 7 });
  check(npRes.status === 502, 'generate-page returned 502 with no providers configured');
  check(npRes.body.errorType === 'NO_PROVIDER_AVAILABLE', 'generate-page surfaced typed errorType=NO_PROVIDER_AVAILABLE');
  check(typeof npRes.body.error === 'string', 'generate-page returned a human-readable error message');

  // --- Verdict ---
  console.log('\n=== Result ===');
  if (failures.length === 0) {
    console.log('ALL CHECKS PASSED — router block-overcoming, graceful image failure, and no-key degradation verified against the live server.\n');
    process.exit(0);
  } else {
    console.log(`${failures.length} CHECK(S) FAILED:\n - ${failures.join('\n - ')}\n`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('e2e-check crashed:', e);
  process.exit(1);
});
